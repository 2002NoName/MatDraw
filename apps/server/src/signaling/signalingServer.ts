import type { IncomingMessage, Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { pickPeerColor, TUTOR_COLORS, type ClientToServer, type DevRealtimeTotals, type DevRoomStats, type PeerInfo, type ServerToClient } from '@matdraw/shared';
import type { AppConfig } from '../config.js';
import type { Store, UserRecord } from '../store/types.js';
import { userFromToken } from '../auth/auth.js';
import { resolveBoardAccess } from '../services/access.js';
import type { BoardStateManager } from '../services/boardState.js';
import type { BoardHub } from '../services/hub.js';

interface Conn {
  ws: WebSocket;
  peerId: string;
  user: UserRecord | null;
  boardId: string | null;
  canEdit: boolean;
  color: string;
  alive: boolean;
  joining: boolean;
  connectedAt: number;
  lastMessageAt: number | null;
  msgsIn: number;
  msgsOut: number;
  bytesIn: number;
  bytesOut: number;
  relayedToPeer: number;
}

const MAX_PAYLOAD = 32 * 1024 * 1024;
const HEARTBEAT_MS = 30_000;

/**
 * Serwer sygnalizacyjny WebRTC + punkt trwałego zapisu dokumentów tablic.
 * Każde połączenie dołącza do dokładnie jednego "pokoju" (tablicy).
 */
export class SignalingServer implements BoardHub {
  private wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  private rooms = new Map<string, Map<string, Conn>>();
  private heartbeat: NodeJS.Timeout | null = null;
  private totals: Omit<DevRealtimeTotals, 'connectionsOpen'> = {
    connectionsOpened: 0,
    joins: 0,
    msgsIn: 0,
    msgsOut: 0,
    bytesIn: 0,
    bytesOut: 0,
    signalsRelayed: 0,
    docUpdates: 0,
    docUpdatesRelayed: 0,
    ephemeralRelayed: 0,
  };

  constructor(
    private store: Store,
    private config: AppConfig,
    private state: BoardStateManager,
  ) {}

  attach(server: Server, path = '/ws') {
    server.on('upgrade', (req: IncomingMessage, socket, head) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname !== path) return;
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws));
    });
    this.heartbeat = setInterval(() => {
      for (const ws of this.wss.clients) {
        const c = (ws as WebSocket & { conn?: Conn }).conn;
        if (c && !c.alive) {
          ws.terminate();
          continue;
        }
        if (c) c.alive = false;
        ws.ping();
      }
    }, HEARTBEAT_MS);
  }

  async close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const ws of this.wss.clients) ws.close(1001, 'Serwer jest zamykany');
    this.wss.close();
    await this.state.flushAll();
  }

  private send(c: Conn, msg: ServerToClient) {
    if (c.ws.readyState !== WebSocket.OPEN) return;
    const text = JSON.stringify(msg);
    c.ws.send(text);
    c.msgsOut++;
    c.bytesOut += text.length;
    this.totals.msgsOut++;
    this.totals.bytesOut += text.length;
  }

  private peerInfo(c: Conn): PeerInfo {
    return { peerId: c.peerId, userId: c.user!.id, name: c.user!.displayName, role: c.user!.role, canEdit: c.canEdit, color: c.color };
  }

  private broadcast(boardId: string, msg: ServerToClient, exceptPeerId?: string) {
    const room = this.rooms.get(boardId);
    if (!room) return;
    for (const c of room.values()) if (c.peerId !== exceptPeerId) this.send(c, msg);
  }

  private onConnection(ws: WebSocket) {
    const conn: Conn = {
      ws,
      peerId: randomUUID(),
      user: null,
      boardId: null,
      canEdit: false,
      color: TUTOR_COLORS[0]!,
      alive: true,
      joining: false,
      connectedAt: Date.now(),
      lastMessageAt: null,
      msgsIn: 0,
      msgsOut: 0,
      bytesIn: 0,
      bytesOut: 0,
      relayedToPeer: 0,
    };
    this.totals.connectionsOpened++;
    (ws as WebSocket & { conn?: Conn }).conn = conn;
    ws.on('pong', () => (conn.alive = true));
    ws.on('message', (data: RawData) => {
      const size = Array.isArray(data) ? data.reduce((n, b) => n + b.length, 0) : (data as Buffer | ArrayBuffer).byteLength;
      conn.msgsIn++;
      conn.bytesIn += size;
      conn.lastMessageAt = Date.now();
      this.totals.msgsIn++;
      this.totals.bytesIn += size;
      let msg: ClientToServer;
      try {
        msg = JSON.parse(data.toString()) as ClientToServer;
      } catch {
        return this.send(conn, { type: 'error', message: 'Nieprawidłowa wiadomość' });
      }
      this.onMessage(conn, msg).catch((err) => {
        console.error('[ws] błąd obsługi wiadomości', err);
        this.send(conn, { type: 'error', message: 'Błąd serwera' });
      });
    });
    ws.on('close', () => void this.leave(conn));
    ws.on('error', () => ws.terminate());
    // Połączenie bez dołączenia do tablicy w ciągu 15 s jest zamykane.
    setTimeout(() => {
      if (!conn.boardId && ws.readyState === WebSocket.OPEN) ws.close(4000, 'Brak dołączenia');
    }, 15_000).unref();
  }

  private async onMessage(conn: Conn, msg: ClientToServer) {
    switch (msg?.type) {
      case 'ping':
        return this.send(conn, { type: 'pong' });
      case 'join':
        return this.join(conn, msg);
      case 'signal': {
        if (!conn.boardId || typeof msg.to !== 'string') return;
        const target = this.rooms.get(conn.boardId)?.get(msg.to);
        if (target) {
          this.totals.signalsRelayed++;
          this.send(target, { type: 'signal', from: conn.peerId, payload: msg.payload });
        }
        return;
      }
      case 'doc-update': {
        if (!conn.boardId || typeof msg.update !== 'string') return;
        if (!conn.canEdit) return this.send(conn, { type: 'error', message: 'Tryb tylko do odczytu' });
        const bytes = new Uint8Array(Buffer.from(msg.update, 'base64'));
        try {
          await this.state.applyUpdate(conn.boardId, bytes);
        } catch {
          return this.send(conn, { type: 'error', message: 'Nieprawidłowa aktualizacja dokumentu' });
        }
        this.totals.docUpdates++;
        if (Array.isArray(msg.relayTo) && msg.relayTo.length) {
          const room = this.rooms.get(conn.boardId);
          for (const id of msg.relayTo) {
            const target = room?.get(id);
            if (target && target !== conn) {
              target.relayedToPeer++;
              this.totals.docUpdatesRelayed++;
              this.send(target, { type: 'doc-update', from: conn.peerId, update: msg.update });
            }
          }
        }
        return;
      }
      case 'ephemeral': {
        if (!conn.boardId || typeof msg.data !== 'string' || msg.data.length > 32_000 || !Array.isArray(msg.to)) return;
        if (!conn.canEdit && msg.data.includes('"live-stroke')) return;
        const room = this.rooms.get(conn.boardId);
        for (const id of msg.to.slice(0, 32)) {
          const target = room?.get(id);
          if (target && target !== conn) {
            this.totals.ephemeralRelayed++;
            this.send(target, { type: 'ephemeral', from: conn.peerId, data: msg.data });
          }
        }
        return;
      }
      default:
        this.send(conn, { type: 'error', message: 'Nieznany typ wiadomości' });
    }
  }

  private async join(conn: Conn, msg: Extract<ClientToServer, { type: 'join' }>) {
    if (conn.boardId || conn.joining) return this.send(conn, { type: 'error', message: 'Już dołączono do tablicy' });
    conn.joining = true;
    const user = typeof msg.token === 'string' ? await userFromToken(msg.token, this.config.jwtSecret, this.store) : null;
    if (!user) {
      this.send(conn, { type: 'error', message: 'Wymagane zalogowanie' });
      return conn.ws.close(4001, 'Unauthorized');
    }
    const access = typeof msg.boardId === 'string' ? await resolveBoardAccess(this.store, user, msg.boardId) : null;
    if (!access?.canView) {
      this.send(conn, { type: 'error', message: 'Brak dostępu do tablicy' });
      return conn.ws.close(4003, 'Forbidden');
    }
    if (conn.ws.readyState !== WebSocket.OPEN) return;

    const boardId = access.board.id;
    let room = this.rooms.get(boardId);
    if (!room) this.rooms.set(boardId, (room = new Map()));
    conn.user = user;
    conn.canEdit = access.canEdit;
    conn.color = pickPeerColor(user.role, [...room.values()].map((c) => c.color));
    this.totals.joins++;
    conn.boardId = boardId;
    const peers = [...room.values()].map((c) => this.peerInfo(c));
    room.set(conn.peerId, conn);

    const state = await this.state.acquire(boardId);
    this.send(conn, {
      type: 'joined',
      selfId: conn.peerId,
      self: this.peerInfo(conn),
      peers,
      state: Buffer.from(state).toString('base64'),
    });
    this.broadcast(boardId, { type: 'peer-joined', peer: this.peerInfo(conn) }, conn.peerId);
  }

  private async leave(conn: Conn) {
    const boardId = conn.boardId;
    if (!boardId) return;
    conn.boardId = null;
    const room = this.rooms.get(boardId);
    if (!room?.delete(conn.peerId)) return;
    if (room.size === 0) this.rooms.delete(boardId);
    this.broadcast(boardId, { type: 'peer-left', peerId: conn.peerId });
    await this.state.release(boardId).catch((err) => console.error('[ws] zapis przy wyjściu nieudany', err));
  }

  // --- BoardHub ---

  realtimeStats() {
    const iso = (t: number | null) => (t === null ? null : new Date(t).toISOString());
    const rooms: Omit<DevRoomStats, 'title'>[] = [...this.rooms.entries()].map(([boardId, room]) => ({
      boardId,
      peers: [...room.values()].map((c) => ({
        ...this.peerInfo(c),
        connectedAt: iso(c.connectedAt)!,
        lastMessageAt: iso(c.lastMessageAt),
        msgsIn: c.msgsIn,
        msgsOut: c.msgsOut,
        bytesIn: c.bytesIn,
        bytesOut: c.bytesOut,
        relayedToPeer: c.relayedToPeer,
      })),
    }));
    return { totals: { ...this.totals, connectionsOpen: this.wss.clients.size }, rooms };
  }

  kickUser(boardId: string, userId: string, reason: string) {
    const room = this.rooms.get(boardId);
    if (!room) return;
    for (const c of [...room.values()]) {
      if (c.user?.id !== userId) continue;
      this.send(c, { type: 'kicked', reason });
      void this.leave(c);
      c.ws.close(4004, 'Kicked');
    }
  }

  boardDeleted(boardId: string) {
    const room = this.rooms.get(boardId);
    if (!room) return;
    for (const c of [...room.values()]) {
      this.send(c, { type: 'board-deleted' });
      c.boardId = null;
      c.ws.close(4005, 'Board deleted');
    }
    this.rooms.delete(boardId);
  }

  memberUpdated(boardId: string, userId: string, canEdit: boolean) {
    const room = this.rooms.get(boardId);
    if (!room) return;
    for (const c of room.values()) {
      if (c.user?.id !== userId) continue;
      c.canEdit = canEdit;
      this.broadcast(boardId, { type: 'peer-updated', peer: this.peerInfo(c) });
    }
  }
}
