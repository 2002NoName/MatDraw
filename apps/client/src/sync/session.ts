import * as Y from 'yjs';
import type { PeerEphemeral, PeerInfo, ServerToClient, ClientToServer, IceConfigResponse } from '@matdraw/shared';
import { wsUrl } from '../config';
import { PeerLink, type LinkState, type PeerLinkDiagnostics } from './peerLink';
import { EventLog, maskIceServers, type LogEntry, type MaskedIceServer } from './diagnostics';
import { MsgType, Reassembler, frame, fromBase64, toBase64 } from './framing';

export const SERVER_ORIGIN = Symbol('server');
export const RELAY_ORIGIN = Symbol('relay');

export type SessionStatus = 'connecting' | 'online' | 'reconnecting' | 'kicked' | 'deleted' | 'denied';

export interface PeerView extends PeerInfo {
  /** Stan połączenia: bezpośrednie P2P, przez TURN, w trakcie zestawiania lub awaryjnie przez serwer. */
  link: LinkState;
}

export interface SessionEvents {
  status?(status: SessionStatus, message?: string): void;
  peers?(peers: PeerView[]): void;
  self?(self: PeerInfo): void;
  ephemeral?(from: PeerInfo, msg: PeerEphemeral): void;
  synced?(): void;
  notice?(message: string): void;
}

/** Migawka stanu sesji dla panelu diagnostyki na tablicy. */
export interface SessionDiagnostics {
  at: number;
  boardId: string;
  status: SessionStatus;
  self: PeerInfo | null;
  ws: {
    url: string;
    state: 'connecting' | 'open' | 'closing' | 'closed';
    connectedAt: number | null;
    reconnects: number;
    rttMs: number | null;
    msgsIn: number;
    msgsOut: number;
    bytesIn: number;
    bytesOut: number;
  };
  /** Ruch zmian dokumentu i danych efemerycznych: P2P vs przez serwer. */
  traffic: {
    docUpdatesToServer: number;
    docUpdatesRelayRequested: number;
    docUpdatesFromServerRelay: number;
    docUpdatesP2PIn: number;
    docUpdatesP2POut: number;
    ephemeralP2POut: number;
    ephemeralServerOut: number;
    ephemeralServerIn: number;
    ephemeralP2PIn: number;
  };
  doc: { bytes: number; pendingUpdates: number };
  iceServers: MaskedIceServer[];
  peers: Array<PeerInfo & { link: PeerLinkDiagnostics | null }>;
  log: LogEntry[];
}

/**
 * Sesja współpracy na tablicy:
 *  - WebSocket do serwera: uwierzytelnienie, sygnalizacja WebRTC, trwały zapis zmian,
 *  - siatka połączeń WebRTC (P2P / TURN) do pozostałych uczestników: zmiany dokumentu Yjs
 *    na żywo oraz dane efemeryczne (kursory, rysowana właśnie kreska),
 *  - awaryjnie (brak P2P) serwer przekazuje zmiany dokumentu uczestnikom bez połączenia.
 */
export class BoardSession {
  readonly doc = new Y.Doc();
  self: PeerInfo | null = null;
  private peers = new Map<string, PeerInfo>();
  private links = new Map<string, PeerLink>();
  private reassemblers = new Map<string, Reassembler>();
  private ws: WebSocket | null = null;
  private pending: Uint8Array[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private stopped = false;
  private iceServers: RTCIceServer[] = [];
  private everSynced = false;
  status: SessionStatus = 'connecting';
  /** Dziennik zdarzeń połączenia (WebSocket, WebRTC, ICE) – ostatnie 200 wpisów. */
  readonly log = new EventLog(200);
  private wsStats = { connectedAt: null as number | null, reconnects: 0, rttMs: null as number | null, pingSentAt: 0, msgsIn: 0, msgsOut: 0, bytesIn: 0, bytesOut: 0 };
  private traffic: SessionDiagnostics['traffic'] = {
    docUpdatesToServer: 0,
    docUpdatesRelayRequested: 0,
    docUpdatesFromServerRelay: 0,
    docUpdatesP2PIn: 0,
    docUpdatesP2POut: 0,
    ephemeralP2POut: 0,
    ephemeralServerOut: 0,
    ephemeralServerIn: 0,
    ephemeralP2PIn: 0,
  };

  constructor(
    readonly boardId: string,
    private getToken: () => string | null,
    private fetchIce: () => Promise<IceConfigResponse>,
    private ev: SessionEvents = {},
  ) {
    this.doc.on('update', this.onDocUpdate);
  }

  async start() {
    await this.refreshIce();
    this.connect();
  }

  private async refreshIce() {
    try {
      this.iceServers = (await this.fetchIce()).iceServers;
      const urls = this.iceServers.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]));
      this.log.push(urls.some((u) => /^turns?:/i.test(u)) ? 'info' : 'warn', 'ice', `konfiguracja ICE: ${urls.join(', ') || 'brak'}${urls.some((u) => /^turns?:/i.test(u)) ? '' : ' (brak TURN!)'}`);
    } catch {
      this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      this.log.push('error', 'ice', 'nie udało się pobrać konfiguracji ICE – tylko publiczny STUN');
    }
  }

  private setStatus(s: SessionStatus, message?: string) {
    this.status = s;
    this.ev.status?.(s, message);
  }

  private connect() {
    if (this.stopped) return;
    const ws = new WebSocket(wsUrl());
    this.ws = ws;
    this.log.push('info', 'ws', `łączenie z ${wsUrl()}`);
    ws.onopen = () => {
      this.wsStats.connectedAt = Date.now();
      this.log.push('info', 'ws', 'połączono');
      const token = this.getToken();
      if (!token) return ws.close();
      this.send({ type: 'join', boardId: this.boardId, token });
      this.pingTimer = setInterval(() => this.send({ type: 'ping' }), 25_000);
    };
    ws.onmessage = (e) => {
      this.wsStats.msgsIn++;
      this.wsStats.bytesIn += (e.data as string).length;
      try {
        this.onServerMessage(JSON.parse(e.data as string) as ServerToClient);
      } catch (err) {
        console.warn('[ws] błąd wiadomości', err);
      }
    };
    ws.onclose = (e) => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      if (this.ws !== ws) return;
      this.ws = null;
      this.wsStats.connectedAt = null;
      this.log.push(this.stopped ? 'info' : 'warn', 'ws', `rozłączono (kod ${e.code}${e.reason ? `, ${e.reason}` : ''})`);
      this.closeAllLinks();
      if (this.stopped || this.status === 'kicked' || this.status === 'deleted') return;
      if (e.code === 4001 || e.code === 4003) {
        this.setStatus('denied', 'Brak dostępu do tablicy');
        return;
      }
      this.setStatus('reconnecting');
      const delay = Math.min(15_000, 500 * 2 ** this.attempts++);
      this.wsStats.reconnects++;
      this.log.push('warn', 'ws', `ponowne łączenie za ${delay} ms`);
      this.reconnectTimer = setTimeout(() => {
        void this.refreshIce().then(() => this.connect());
      }, delay);
    };
  }

  private send(msg: ClientToServer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const text = JSON.stringify(msg);
      this.ws.send(text);
      this.wsStats.msgsOut++;
      this.wsStats.bytesOut += text.length;
      return true;
    }
    return false;
  }

  private onServerMessage(msg: ServerToClient) {
    switch (msg.type) {
      case 'joined': {
        this.attempts = 0;
        this.self = msg.self;
        this.log.push('info', 'ws', `dołączono do tablicy (${msg.peers.length} innych uczestników, stan ${msg.state.length} B base64)`);
        this.ev.self?.(msg.self);
        const state = fromBase64(msg.state);
        Y.applyUpdate(this.doc, state, SERVER_ORIGIN);
        // Zmiany zrobione offline / przed połączeniem – wyślij brakującą część na serwer.
        if (msg.self.canEdit) {
          const diff = Y.encodeStateAsUpdate(this.doc, Y.encodeStateVectorFromUpdate(state));
          if (diff.length > 2) this.send({ type: 'doc-update', update: toBase64(diff) });
        }
        this.peers.clear();
        for (const p of msg.peers) {
          this.peers.set(p.peerId, p);
          this.createLink(p, true);
        }
        this.setStatus('online');
        this.emitPeers();
        if (!this.everSynced) {
          this.everSynced = true;
          this.ev.synced?.();
        }
        return;
      }
      case 'peer-joined':
        this.peers.set(msg.peer.peerId, msg.peer);
        this.createLink(msg.peer, false);
        this.log.push('info', 'ws', `dołączył(a): ${msg.peer.name}`);
        this.ev.notice?.(`${msg.peer.name} dołączył(a) do tablicy`);
        return this.emitPeers();
      case 'peer-left': {
        const p = this.peers.get(msg.peerId);
        this.peers.delete(msg.peerId);
        this.links.get(msg.peerId)?.close();
        this.links.delete(msg.peerId);
        this.reassemblers.delete(msg.peerId);
        if (p) {
          this.log.push('info', 'ws', `wyszedł/wyszła: ${p.name}`);
          this.ev.notice?.(`${p.name} opuścił(a) tablicę`);
        }
        return this.emitPeers();
      }
      case 'peer-updated':
        if (msg.peer.peerId === this.self?.peerId) {
          this.self = msg.peer;
          this.ev.self?.(msg.peer);
          this.ev.notice?.(msg.peer.canEdit ? 'Możesz teraz edytować tablicę' : 'Tablica jest dla Ciebie tylko do odczytu');
        } else if (this.peers.has(msg.peer.peerId)) {
          this.peers.set(msg.peer.peerId, msg.peer);
        }
        return this.emitPeers();
      case 'signal': {
        let link = this.links.get(msg.from);
        if (!link) {
          const peer = this.peers.get(msg.from);
          if (!peer) return;
          link = this.createLink(peer, false);
        }
        void link.handleSignal(msg.payload);
        return;
      }
      case 'doc-update':
        this.traffic.docUpdatesFromServerRelay++;
        Y.applyUpdate(this.doc, fromBase64(msg.update), RELAY_ORIGIN);
        return;
      case 'ephemeral':
        this.traffic.ephemeralServerIn++;
        this.onEphemeralText(msg.from, msg.data);
        return;
      case 'kicked':
        this.log.push('warn', 'ws', `usunięto z tablicy: ${msg.reason}`);
        this.setStatus('kicked', msg.reason);
        return this.stop();
      case 'board-deleted':
        this.setStatus('deleted', 'Tablica została usunięta');
        return this.stop();
      case 'error':
        this.log.push('error', 'ws', `błąd serwera: ${msg.message}`);
        this.ev.notice?.(msg.message);
        return;
      case 'pong':
        if (this.wsStats.pingSentAt) {
          this.wsStats.rttMs = Math.round(performance.now() - this.wsStats.pingSentAt);
          this.wsStats.pingSentAt = 0;
        }
        return;
    }
  }

  private createLink(peer: PeerInfo, initiator: boolean): PeerLink {
    this.links.get(peer.peerId)?.close();
    const polite = (this.self?.peerId ?? '') > peer.peerId;
    const reassembler = new Reassembler();
    this.reassemblers.set(peer.peerId, reassembler);
    const link: PeerLink = new PeerLink(peer, this.iceServers, polite, initiator, {
      onSignal: (payload) => this.send({ type: 'signal', to: peer.peerId, payload }),
      onOpen: () => {
        link.sendBinary(frame(MsgType.SyncStep1, Y.encodeStateVector(this.doc)));
        this.emitPeers();
      },
      onClose: () => this.emitPeers(),
      onState: () => this.emitPeers(),
      onBinary: (data) => {
        const full = reassembler.push(data);
        if (full) this.onPeerBinary(link, full);
      },
      onText: (text) => {
        this.traffic.ephemeralP2PIn++;
        this.onEphemeralText(peer.peerId, text);
      },
      onLog: (level, message) => this.log.push(level, `p2p:${peer.name}`, message),
    });
    this.links.set(peer.peerId, link);
    return link;
  }

  private onPeerBinary(link: PeerLink, msg: Uint8Array) {
    const type = msg[0];
    const payload = msg.subarray(1);
    const sender = this.peers.get(link.peer.peerId);
    if (type === MsgType.SyncStep1) {
      link.sendBinary(frame(MsgType.SyncStep2, Y.encodeStateAsUpdate(this.doc, payload)));
    } else if (type === MsgType.SyncStep2) {
      Y.applyUpdate(this.doc, payload, link);
    } else if (type === MsgType.Update) {
      this.traffic.docUpdatesP2PIn++;
      if (sender?.canEdit) Y.applyUpdate(this.doc, payload, link);
    }
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === SERVER_ORIGIN || origin === RELAY_ORIGIN || origin instanceof PeerLink) return;
    if (!this.self?.canEdit) return;
    const parts = frame(MsgType.Update, update);
    for (const link of this.links.values()) if (link.sendBinary(parts)) this.traffic.docUpdatesP2POut++;
    this.pending.push(update);
    if (!this.flushTimer) this.flushTimer = setTimeout(this.flush, 120);
  };

  private flush = () => {
    this.flushTimer = null;
    if (!this.pending.length) return;
    const merged = Y.mergeUpdates(this.pending);
    this.pending = [];
    const relayTo = [...this.peers.keys()].filter((id) => !this.links.get(id)?.isOpen);
    // Gdy WebSocket jest rozłączony, zmiany zostaną dosłane jako różnica stanu po ponownym dołączeniu.
    if (this.send({ type: 'doc-update', update: toBase64(merged), relayTo: relayTo.length ? relayTo : undefined })) {
      this.traffic.docUpdatesToServer++;
      if (relayTo.length) this.traffic.docUpdatesRelayRequested++;
    }
  };

  sendEphemeral(msg: PeerEphemeral) {
    const text = JSON.stringify(msg);
    const viaServer: string[] = [];
    for (const id of this.peers.keys()) {
      const link = this.links.get(id);
      if (link?.isOpen && link.sendText(text)) this.traffic.ephemeralP2POut++;
      else viaServer.push(id);
    }
    if (viaServer.length && this.send({ type: 'ephemeral', to: viaServer, data: text })) this.traffic.ephemeralServerOut++;
  }

  /** Wysyła ping do serwera; czas odpowiedzi (pong) trafia do diagnostyki jako RTT WebSocket. */
  measurePing() {
    if (this.wsStats.pingSentAt && performance.now() - this.wsStats.pingSentAt < 10_000) return;
    this.wsStats.pingSentAt = performance.now();
    if (!this.send({ type: 'ping' })) this.wsStats.pingSentAt = 0;
  }

  async diagnostics(): Promise<SessionDiagnostics> {
    const states = ['connecting', 'open', 'closing', 'closed'] as const;
    const peers = await Promise.all(
      [...this.peers.values()].map(async (p) => ({ ...p, link: (await this.links.get(p.peerId)?.diagnostics()) ?? null })),
    );
    return {
      at: Date.now(),
      boardId: this.boardId,
      status: this.status,
      self: this.self,
      ws: {
        url: wsUrl(),
        state: this.ws ? states[this.ws.readyState]! : 'closed',
        connectedAt: this.wsStats.connectedAt,
        reconnects: this.wsStats.reconnects,
        rttMs: this.wsStats.rttMs,
        msgsIn: this.wsStats.msgsIn,
        msgsOut: this.wsStats.msgsOut,
        bytesIn: this.wsStats.bytesIn,
        bytesOut: this.wsStats.bytesOut,
      },
      traffic: { ...this.traffic },
      doc: { bytes: Y.encodeStateAsUpdate(this.doc).length, pendingUpdates: this.pending.length },
      iceServers: maskIceServers(this.iceServers),
      peers,
      log: this.log.entries(),
    };
  }

  private onEphemeralText(fromPeerId: string, text: string) {
    const sender = this.peers.get(fromPeerId);
    if (!sender) return;
    try {
      this.ev.ephemeral?.(sender, JSON.parse(text) as PeerEphemeral);
    } catch {
      /* ignoruj uszkodzone wiadomości */
    }
  }

  private emitPeers() {
    const list: PeerView[] = [...this.peers.values()].map((p) => ({ ...p, link: this.links.get(p.peerId)?.state ?? 'connecting' }));
    this.ev.peers?.(list);
  }

  private closeAllLinks() {
    for (const l of this.links.values()) l.close();
    this.links.clear();
    this.reassemblers.clear();
    this.peers.clear();
    this.emitPeers();
  }

  stop() {
    if (this.stopped) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flush();
    }
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.closeAllLinks();
  }

  destroy() {
    this.stop();
    this.doc.off('update', this.onDocUpdate);
    this.doc.destroy();
  }
}
