import type { PeerInfo, SignalPayload } from '@matdraw/shared';
import { parseCandidate, summarizeStats, type LogLevel, type StatsSummary } from './diagnostics';

export type LinkState = 'connecting' | 'direct' | 'turn' | 'failed' | 'closed';

const CONNECT_TIMEOUT_MS = 20_000;

export interface PeerLinkEvents {
  onSignal(payload: SignalPayload): void;
  onOpen(): void;
  onClose(): void;
  onBinary(data: Uint8Array): void;
  onText(data: string): void;
  onState(state: LinkState): void;
  /** Zdarzenia diagnostyczne (stany ICE, kandydaci, kanał danych). */
  onLog?(level: LogLevel, message: string): void;
}

/** Migawka stanu połączenia P2P dla paneli diagnostycznych. */
export interface PeerLinkDiagnostics {
  state: LinkState;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
  dataChannel: RTCDataChannelState | 'none';
  initiator: boolean;
  polite: boolean;
  createdAt: number;
  openedAt: number | null;
  iceRestarts: number;
  msgsIn: number;
  msgsOut: number;
  bytesIn: number;
  bytesOut: number;
  /** Typy zebranych lokalnych kandydatów ICE (host/srflx/relay). */
  gathered: Record<string, number>;
  remoteCandidates: number;
  stats: StatsSummary | null;
}

/**
 * Pojedyncze połączenie WebRTC z innym uczestnikiem (kanał danych "matdraw").
 * Implementuje wzorzec "perfect negotiation" – odporny na równoczesne oferty.
 * Inicjatorem jest zawsze uczestnik, który dołączył później.
 */
export class PeerLink {
  readonly pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private makingOffer = false;
  private ignoreOffer = false;
  private closed = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private iceRestarts = 0;
  private connectTimer: ReturnType<typeof setTimeout> | undefined;
  state: LinkState = 'connecting';
  readonly createdAt = Date.now();
  openedAt: number | null = null;
  msgsIn = 0;
  msgsOut = 0;
  bytesIn = 0;
  bytesOut = 0;
  private gathered: Record<string, number> = {};
  private remoteCandidates = 0;

  constructor(
    readonly peer: PeerInfo,
    iceServers: RTCIceServer[],
    private polite: boolean,
    private initiator: boolean,
    private ev: PeerLinkEvents,
  ) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        const info = parseCandidate(candidate.candidate);
        if (info) {
          this.gathered[info.type] = (this.gathered[info.type] ?? 0) + 1;
          this.log('info', `kandydat lokalny ${info.type} ${info.protocol} ${info.address}:${info.port}`);
        }
      }
      this.ev.onSignal({ kind: 'candidate', candidate: candidate ? { ...candidate.toJSON(), candidate: candidate.candidate } : null });
    };
    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        const d = this.pc.localDescription!;
        this.ev.onSignal({ kind: 'description', description: { type: d.type, sdp: d.sdp } });
      } catch (err) {
        console.warn('[p2p] negocjacja nieudana', err);
      } finally {
        this.makingOffer = false;
      }
    };
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      this.log(s === 'failed' ? 'error' : s === 'disconnected' ? 'warn' : 'info', `connectionState → ${s}`);
      if (s === 'connected') void this.detectRoute();
      if (s === 'failed') {
        if (this.iceRestarts++ < 2) {
          this.log('warn', `restart ICE (${this.iceRestarts}/2)`);
          this.pc.restartIce();
        } else this.setState('failed');
      }
    };
    this.pc.oniceconnectionstatechange = () => this.log('info', `iceConnectionState → ${this.pc.iceConnectionState}`);
    this.pc.onicegatheringstatechange = () => {
      const g = this.pc.iceGatheringState;
      const summary = Object.entries(this.gathered).map(([k, v]) => `${k}×${v}`).join(', ') || 'brak';
      this.log(g === 'complete' && !this.gathered.relay && !this.gathered.srflx ? 'warn' : 'info', `iceGatheringState → ${g}${g === 'complete' ? ` (kandydaci: ${summary})` : ''}`);
    };
    this.pc.onicecandidateerror = (e) => {
      const err = e as RTCPeerConnectionIceErrorEvent;
      this.log('warn', `błąd kandydata ICE ${err.url ?? ''} (${err.errorCode}): ${err.errorText}`);
    };
    this.pc.ondatachannel = (e) => this.setupChannel(e.channel);
    if (initiator) this.setupChannel(this.pc.createDataChannel('matdraw', { ordered: true }));
    // Bez połączenia po czasie oczekiwania – pokaż tryb awaryjny (dane i tak idą przez serwer).
    this.connectTimer = setTimeout(() => {
      if (this.state === 'connecting') {
        this.log('error', `brak połączenia P2P po ${CONNECT_TIMEOUT_MS / 1000} s – dane idą przez serwer`);
        this.setState('failed');
      }
    }, CONNECT_TIMEOUT_MS);
    this.log('info', `nowe połączenie (${initiator ? 'inicjator' : 'odbiorca'}, ${iceServers.length} serwer(y) ICE)`);
  }

  private log(level: LogLevel, message: string) {
    this.ev.onLog?.(level, message);
  }

  private setState(s: LinkState) {
    if (this.state === s) return;
    this.state = s;
    this.log(s === 'failed' ? 'error' : 'info', `trasa → ${s}`);
    this.ev.onState(s);
  }

  /** Sprawdza, czy ruch idzie bezpośrednio (host/srflx) czy przez przekaźnik TURN. */
  private async detectRoute() {
    try {
      const stats = await this.pc.getStats();
      let pairId: string | undefined;
      stats.forEach((r) => {
        if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId;
      });
      let local: string | undefined;
      stats.forEach((r) => {
        if (r.type === 'candidate-pair' && (r.id === pairId || (!pairId && r.nominated && r.state === 'succeeded'))) {
          local = r.localCandidateId;
        }
      });
      let viaTurn = false;
      stats.forEach((r) => {
        if (r.id === local && r.candidateType === 'relay') viaTurn = true;
      });
      if (this.dc?.readyState === 'open') this.setState(viaTurn ? 'turn' : 'direct');
    } catch {
      /* statystyki są opcjonalne */
    }
  }

  private setupChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => {
      this.openedAt = Date.now();
      clearTimeout(this.connectTimer);
      this.log('info', `kanał danych otwarty po ${this.openedAt - this.createdAt} ms`);
      this.setState('direct');
      void this.detectRoute();
      this.ev.onOpen();
    };
    dc.onclose = () => {
      this.log(this.closed ? 'info' : 'warn', 'kanał danych zamknięty');
      if (!this.closed) this.setState('failed');
      this.ev.onClose();
    };
    dc.onmessage = (e) => {
      this.msgsIn++;
      if (typeof e.data === 'string') {
        this.bytesIn += e.data.length;
        this.ev.onText(e.data);
      } else {
        this.bytesIn += (e.data as ArrayBuffer).byteLength;
        this.ev.onBinary(new Uint8Array(e.data as ArrayBuffer));
      }
    };
  }

  get isOpen() {
    return this.dc?.readyState === 'open';
  }

  async handleSignal(payload: SignalPayload) {
    try {
      if (payload.kind === 'description') {
        const desc = payload.description as RTCSessionDescriptionInit;
        const collision = desc.type === 'offer' && (this.makingOffer || this.pc.signalingState !== 'stable');
        this.ignoreOffer = !this.polite && collision;
        if (this.ignoreOffer) return;
        await this.pc.setRemoteDescription(desc);
        for (const c of this.pendingCandidates.splice(0)) await this.pc.addIceCandidate(c).catch(() => {});
        if (desc.type === 'offer') {
          await this.pc.setLocalDescription();
          const d = this.pc.localDescription!;
          this.ev.onSignal({ kind: 'description', description: { type: d.type, sdp: d.sdp } });
        }
      } else if (payload.candidate) {
        this.remoteCandidates++;
        if (!this.pc.remoteDescription) this.pendingCandidates.push(payload.candidate);
        else await this.pc.addIceCandidate(payload.candidate).catch((err) => {
          if (!this.ignoreOffer) throw err;
        });
      }
    } catch (err) {
      console.warn('[p2p] błąd sygnalizacji', err);
    }
  }

  sendBinary(parts: Uint8Array[]) {
    if (!this.isOpen) return false;
    try {
      for (const p of parts) {
        this.dc!.send(p as Uint8Array<ArrayBuffer>);
        this.msgsOut++;
        this.bytesOut += p.byteLength;
      }
      return true;
    } catch {
      return false;
    }
  }

  sendText(text: string) {
    if (!this.isOpen) return false;
    try {
      this.dc!.send(text);
      this.msgsOut++;
      this.bytesOut += text.length;
      return true;
    } catch {
      return false;
    }
  }

  /** Pełna diagnostyka: stany, liczniki i streszczenie getStats(). */
  async diagnostics(): Promise<PeerLinkDiagnostics> {
    let stats: StatsSummary | null = null;
    if (!this.closed) {
      try {
        const report = await this.pc.getStats();
        stats = summarizeStats(report.values() as Iterable<Record<string, unknown> & { id: string; type: string }>);
      } catch {
        stats = null;
      }
    }
    return {
      state: this.state,
      connectionState: this.pc.connectionState,
      iceConnectionState: this.pc.iceConnectionState,
      iceGatheringState: this.pc.iceGatheringState,
      signalingState: this.pc.signalingState,
      dataChannel: this.dc?.readyState ?? 'none',
      initiator: this.initiator,
      polite: this.polite,
      createdAt: this.createdAt,
      openedAt: this.openedAt,
      iceRestarts: this.iceRestarts,
      msgsIn: this.msgsIn,
      msgsOut: this.msgsOut,
      bytesIn: this.bytesIn,
      bytesOut: this.bytesOut,
      gathered: { ...this.gathered },
      remoteCandidates: this.remoteCandidates,
      stats,
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.connectTimer);
    this.setState('closed');
    try {
      this.dc?.close();
    } catch {
      /* ignore */
    }
    this.pc.close();
  }
}
