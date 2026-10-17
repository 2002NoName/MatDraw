/**
 * Diagnostyka połączeń (panel na tablicy i panel developera): czyste funkcje bez zależności od DOM,
 * dzięki czemu można je testować jednostkowo.
 */

export type CandidateType = 'host' | 'srflx' | 'prflx' | 'relay';

export interface CandidateInfo {
  type: CandidateType | string;
  protocol: string;
  address: string;
  port: number;
  /** Dla kandydatów TCP: active/passive/so. */
  tcpType?: string;
  /** Adres bazowy (raddr) dla srflx/relay. */
  relatedAddress?: string;
}

/** Parsuje linię SDP kandydata ICE, np. "candidate:1 1 udp 2122260223 192.168.1.5 54321 typ host". */
export function parseCandidate(line: string | null | undefined): CandidateInfo | null {
  if (!line) return null;
  const parts = line.replace(/^a=/, '').replace(/^candidate:/, '').trim().split(/\s+/);
  if (parts.length < 8 || parts[6] !== 'typ') return null;
  const info: CandidateInfo = {
    type: parts[7]!,
    protocol: parts[2]!.toLowerCase(),
    address: parts[4]!,
    port: Number(parts[5]),
  };
  for (let i = 8; i + 1 < parts.length; i += 2) {
    if (parts[i] === 'raddr') info.relatedAddress = parts[i + 1];
    if (parts[i] === 'tcptype') info.tcpType = parts[i + 1];
  }
  return info;
}

/** Opis typu kandydata po polsku. */
export function describeCandidateType(type: string | undefined): string {
  switch (type) {
    case 'host':
      return 'host (sieć lokalna)';
    case 'srflx':
      return 'srflx (publiczny adres z STUN)';
    case 'prflx':
      return 'prflx (wykryty w trakcie ICE)';
    case 'relay':
      return 'relay (przekaźnik TURN)';
    default:
      return type ?? '—';
  }
}

export interface CandidateStat {
  type: string;
  protocol: string;
  address: string;
  port: number | null;
  /** Protokół między przeglądarką a serwerem TURN (udp/tcp/tls). */
  relayProtocol?: string;
  /** Adres serwera STUN/TURN, który dał tego kandydata. */
  url?: string;
  networkType?: string;
}

export interface StatsSummary {
  pair: {
    state: string;
    nominated: boolean;
    rttMs: number | null;
    availableOutgoingKbps: number | null;
    bytesSent: number;
    bytesReceived: number;
    requestsSent: number;
    responsesReceived: number;
  } | null;
  local: CandidateStat | null;
  remote: CandidateStat | null;
  /** Liczba kandydatów wg typu (wszystkie zebrane, nie tylko wybrana para). */
  candidates: { local: Record<string, number>; remote: Record<string, number> };
  dataChannel: {
    label: string;
    state: string;
    messagesSent: number;
    messagesReceived: number;
    bytesSent: number;
    bytesReceived: number;
  } | null;
  transport: {
    iceState: string | null;
    dtlsState: string | null;
    dtlsCipher: string | null;
    selectedCandidatePairChanges: number | null;
  } | null;
}

type StatRecord = Record<string, unknown> & { id: string; type: string };

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function candidateStat(r: StatRecord | undefined): CandidateStat | null {
  if (!r) return null;
  return {
    type: str(r.candidateType) ?? '?',
    protocol: str(r.protocol) ?? '?',
    address: str(r.address) || str(r.ip) || '(ukryty – mDNS)',
    port: num(r.port),
    relayProtocol: str(r.relayProtocol) ?? undefined,
    url: str(r.url) ?? undefined,
    networkType: str(r.networkType) ?? undefined,
  };
}

/**
 * Streszcza wynik RTCPeerConnection.getStats(): wybrana para kandydatów (trasa), RTT,
 * przepustowość, liczniki bajtów, kanał danych i stan DTLS.
 */
export function summarizeStats(reports: Iterable<StatRecord>): StatsSummary {
  const all = [...reports];
  const byId = new Map(all.map((r) => [r.id, r]));
  const transport = all.find((r) => r.type === 'transport');
  const pairs = all.filter((r) => r.type === 'candidate-pair');
  const selectedId = str(transport?.selectedCandidatePairId);
  const pair =
    (selectedId ? byId.get(selectedId) : undefined) ??
    pairs.find((p) => p.selected === true) ??
    pairs.find((p) => p.nominated === true && p.state === 'succeeded') ??
    null;

  const count = (type: string) => {
    const out: Record<string, number> = {};
    for (const r of all) {
      if (r.type !== type) continue;
      const t = str(r.candidateType) ?? '?';
      out[t] = (out[t] ?? 0) + 1;
    }
    return out;
  };

  const dc = all.find((r) => r.type === 'data-channel');
  const rtt = num(pair?.currentRoundTripTime);
  const bitrate = num(pair?.availableOutgoingBitrate);
  return {
    pair: pair
      ? {
          state: str(pair.state) ?? '?',
          nominated: pair.nominated === true,
          rttMs: rtt === null ? null : Math.round(rtt * 1000),
          availableOutgoingKbps: bitrate === null ? null : Math.round(bitrate / 1000),
          bytesSent: num(pair.bytesSent) ?? 0,
          bytesReceived: num(pair.bytesReceived) ?? 0,
          requestsSent: num(pair.requestsSent) ?? 0,
          responsesReceived: num(pair.responsesReceived) ?? 0,
        }
      : null,
    local: candidateStat(pair ? byId.get(str(pair.localCandidateId) ?? '') : undefined),
    remote: candidateStat(pair ? byId.get(str(pair.remoteCandidateId) ?? '') : undefined),
    candidates: { local: count('local-candidate'), remote: count('remote-candidate') },
    dataChannel: dc
      ? {
          label: str(dc.label) ?? '',
          state: str(dc.state) ?? '?',
          messagesSent: num(dc.messagesSent) ?? 0,
          messagesReceived: num(dc.messagesReceived) ?? 0,
          bytesSent: num(dc.bytesSent) ?? 0,
          bytesReceived: num(dc.bytesReceived) ?? 0,
        }
      : null,
    transport: transport
      ? {
          iceState: str(transport.iceState),
          dtlsState: str(transport.dtlsState),
          dtlsCipher: str(transport.dtlsCipher),
          selectedCandidatePairChanges: num(transport.selectedCandidatePairChanges),
        }
      : null,
  };
}

/** Konfiguracja ICE do wyświetlenia – bez haseł TURN. */
export interface MaskedIceServer {
  urls: string[];
  username?: string;
  hasCredential: boolean;
}

export function maskIceServers(servers: RTCIceServer[]): MaskedIceServer[] {
  return servers.map((s) => ({
    urls: Array.isArray(s.urls) ? [...s.urls] : [s.urls],
    username: s.username ? (s.username.length > 12 ? `${s.username.slice(0, 12)}…` : s.username) : undefined,
    hasCredential: !!s.credential,
  }));
}

/** Rodzaj serwera ICE na podstawie adresu URL. */
export function iceUrlKind(url: string): 'stun' | 'turn' | 'turns' | 'unknown' {
  const m = /^(stuns?|turns?):/i.exec(url);
  if (!m) return 'unknown';
  const s = m[1]!.toLowerCase();
  return s === 'stuns' ? 'stun' : (s as 'stun' | 'turn' | 'turns');
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  t: number;
  level: LogLevel;
  source: string;
  message: string;
}

/** Bufor cykliczny zdarzeń połączenia (ostatnie N wpisów). */
export class EventLog {
  private items: LogEntry[] = [];
  private seq = 0;

  constructor(private max = 200) {}

  push(level: LogLevel, source: string, message: string, t = Date.now()) {
    this.items.push({ t, level, source, message });
    this.seq++;
    if (this.items.length > this.max) this.items.splice(0, this.items.length - this.max);
  }

  /** Liczba wszystkich dodanych wpisów (także usuniętych z bufora). */
  get total() {
    return this.seq;
  }

  entries(): LogEntry[] {
    return [...this.items];
  }
}

/** Przyrost na sekundę między dwiema próbkami licznika. */
export function ratePerSec(prev: number | undefined, cur: number, dtMs: number): number | null {
  if (prev === undefined || dtMs <= 0 || cur < prev) return null;
  return ((cur - prev) * 1000) / dtMs;
}

export function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
