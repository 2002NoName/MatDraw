import { wsUrl } from '../config';
import { parseCandidate, summarizeStats, type CandidateInfo, type StatsSummary } from './diagnostics';

/** Testy łączności uruchamiane z panelu developera (/dev). */

export interface WsTestResult {
  ok: boolean;
  connectMs: number | null;
  rttMs: number[];
  error?: string;
}

/** Łączy się z serwerem sygnalizacyjnym i mierzy czas zestawienia oraz RTT ping/pong (bez dołączania do tablicy). */
export function testWebSocket(pings = 5, timeoutMs = 8000): Promise<WsTestResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const res: WsTestResult = { ok: false, connectMs: null, rttMs: [] };
    let sentAt = 0;
    let ws: WebSocket;
    const finish = (error?: string) => {
      clearTimeout(timer);
      if (error) res.error = error;
      res.ok = !error && res.rttMs.length > 0;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(res);
    };
    const timer = setTimeout(() => finish('przekroczono czas oczekiwania'), timeoutMs);
    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      finish((e as Error).message);
      return;
    }
    const ping = () => {
      sentAt = performance.now();
      ws.send(JSON.stringify({ type: 'ping' }));
    };
    ws.onopen = () => {
      res.connectMs = Math.round(performance.now() - started);
      ping();
    };
    ws.onmessage = (e) => {
      try {
        if ((JSON.parse(e.data as string) as { type: string }).type !== 'pong') return;
      } catch {
        return;
      }
      res.rttMs.push(Math.round(performance.now() - sentAt));
      if (res.rttMs.length >= pings) finish();
      else setTimeout(ping, 100);
    };
    ws.onerror = () => finish('błąd połączenia WebSocket');
    ws.onclose = (e) => {
      if (res.rttMs.length < pings) finish(`połączenie zamknięte (kod ${e.code})`);
    };
  });
}

export interface GatheredCandidate extends CandidateInfo {
  url?: string;
  ms: number;
}

export interface GatherResult {
  candidates: GatheredCandidate[];
  errors: string[];
  durationMs: number;
  complete: boolean;
}

/**
 * Zbiera kandydatów ICE dla podanej konfiguracji: host = sieć lokalna, srflx = STUN działa,
 * relay = TURN działa (poświadczenia poprawne, serwer osiągalny).
 */
export async function gatherCandidates(iceServers: RTCIceServer[], timeoutMs = 12_000): Promise<GatherResult> {
  const pc = new RTCPeerConnection({ iceServers });
  const started = performance.now();
  const out: GatherResult = { candidates: [], errors: [], durationMs: 0, complete: false };
  try {
    pc.createDataChannel('probe');
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          out.complete = true;
          clearTimeout(timer);
          resolve();
          return;
        }
        const info = parseCandidate(e.candidate.candidate);
        if (info) {
          const url = (e.candidate as RTCIceCandidate & { url?: string }).url;
          out.candidates.push({ ...info, url: url ?? undefined, ms: Math.round(performance.now() - started) });
        }
      };
      pc.onicecandidateerror = (e) => {
        const err = e as RTCPeerConnectionIceErrorEvent;
        out.errors.push(`${err.url ?? '?'}: ${err.errorCode} ${err.errorText}`);
      };
      void pc.createOffer().then((o) => pc.setLocalDescription(o));
    });
  } finally {
    out.durationMs = Math.round(performance.now() - started);
    pc.close();
  }
  return out;
}

export interface LoopbackResult {
  ok: boolean;
  openMs: number | null;
  rttMs: number | null;
  stats: StatsSummary | null;
  error?: string;
}

/**
 * Pełny test przekaźnika: dwa połączenia RTCPeerConnection w tej samej karcie. Strona A jest
 * wymuszona na `iceTransportPolicy: 'relay'` – dane muszą przejść przez serwer TURN.
 * `peerPolicy: 'all'` – druga strona łączy się zwykłym adresem (relay → klient, typowy przypadek),
 * `peerPolicy: 'relay'` – obie strony przez TURN (relay ↔ relay, wymaga poprawnej sieci coturn).
 */
export async function turnLoopback(
  iceServers: RTCIceServer[],
  timeoutMs = 15_000,
  peerPolicy: RTCIceTransportPolicy = 'relay',
): Promise<LoopbackResult> {
  const a = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
  const b = new RTCPeerConnection({ iceServers, iceTransportPolicy: peerPolicy });
  const started = performance.now();
  const res: LoopbackResult = { ok: false, openMs: null, rttMs: null, stats: null };
  a.onicecandidate = (e) => e.candidate && void b.addIceCandidate(e.candidate).catch(() => {});
  b.onicecandidate = (e) => e.candidate && void a.addIceCandidate(e.candidate).catch(() => {});
  b.ondatachannel = (e) => {
    e.channel.onmessage = (m) => e.channel.send(m.data as string);
  };
  try {
    const dc = a.createDataChannel('loopback');
    const opened = new Promise<void>((resolve, reject) => {
      dc.onopen = () => resolve();
      a.onconnectionstatechange = () => {
        if (a.connectionState === 'failed') reject(new Error('połączenie przez TURN nie powiodło się'));
      };
    });
    const offer = await a.createOffer();
    await a.setLocalDescription(offer);
    await b.setRemoteDescription(offer);
    const answer = await b.createAnswer();
    await b.setLocalDescription(answer);
    await a.setRemoteDescription(answer);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`brak połączenia przez TURN po ${timeoutMs / 1000} s`)), timeoutMs);
    });
    try {
      await Promise.race([opened, timeout]);
      res.openMs = Math.round(performance.now() - started);
      const t0 = performance.now();
      await Promise.race([
        new Promise<void>((resolve) => {
          dc.onmessage = () => resolve();
          dc.send('ping');
        }),
        timeout,
      ]);
      res.rttMs = Math.round(performance.now() - t0);
    } finally {
      clearTimeout(timer);
    }
    const report = await a.getStats();
    res.stats = summarizeStats(report.values() as Iterable<Record<string, unknown> & { id: string; type: string }>);
    res.ok = true;
  } catch (e) {
    res.error = (e as Error).message;
  } finally {
    a.close();
    b.close();
  }
  return res;
}

export async function timeHealth(samples = 3): Promise<{ ok: boolean; ms: number[]; error?: string }> {
  const ms: number[] = [];
  try {
    for (let i = 0; i < samples; i++) {
      const t = performance.now();
      const r = await fetch('/api/health', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      ms.push(Math.round(performance.now() - t));
    }
    return { ok: true, ms };
  } catch (e) {
    return { ok: false, ms, error: (e as Error).message };
  }
}
