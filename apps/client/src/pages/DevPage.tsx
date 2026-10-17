import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { DevStatsResponse, IceConfigResponse } from '@matdraw/shared';
import { api } from '../api/client';
import { useAuth } from '../api/auth';
import { AppFooter } from '../components/AppFooter';
import { describeCandidateType, formatBytes, formatDuration, maskIceServers } from '../sync/diagnostics';
import { gatherCandidates, testWebSocket, timeHealth, turnLoopback, type GatherResult, type LoopbackResult, type WsTestResult } from '../sync/connectivityTests';

type Run<T> = { running: boolean; result: T | null };
const idle = <T,>(): Run<T> => ({ running: false, result: null });

function Row({ k, v, tone }: { k: string; v: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className={`diag-row${tone ? ` ${tone}` : ''}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const hasTurn = (ice: IceConfigResponse | null) => !!ice?.iceServers.some((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => /^turns?:/i.test(u)));

/**
 * Panel developera: środowisko przeglądarki, testy API/WebSocket/STUN/TURN oraz
 * (dla korepetytorki) statystyki serwera sygnalizacyjnego na żywo.
 */
export function DevPage() {
  const { user } = useAuth();
  const isTutor = user?.role === 'TUTOR';
  const [ice, setIce] = useState<IceConfigResponse | null>(null);
  const [iceError, setIceError] = useState<string | null>(null);
  const [health, setHealth] = useState<Run<Awaited<ReturnType<typeof timeHealth>>>>(idle);
  const [ws, setWs] = useState<Run<WsTestResult>>(idle);
  const [gather, setGather] = useState<Run<GatherResult>>(idle);
  const [loop, setLoop] = useState<Run<LoopbackResult>>(idle);
  const [stats, setStats] = useState<DevStatsResponse | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const runHealth = useCallback(async () => {
    setHealth({ running: true, result: null });
    setHealth({ running: false, result: await timeHealth() });
  }, []);
  const runWs = useCallback(async () => {
    setWs({ running: true, result: null });
    setWs({ running: false, result: await testWebSocket() });
  }, []);
  const loadIce = useCallback(async () => {
    try {
      const c = await api.ice();
      setIce(c);
      setIceError(null);
      return c;
    } catch (e) {
      setIceError((e as Error).message);
      return null;
    }
  }, []);
  const runGather = useCallback(async () => {
    setGather({ running: true, result: null });
    const c = ice ?? (await loadIce());
    setGather({ running: false, result: c ? await gatherCandidates(c.iceServers as RTCIceServer[]) : null });
  }, [ice, loadIce]);
  const runLoop = useCallback(async () => {
    setLoop({ running: true, result: null });
    const c = ice ?? (await loadIce());
    setLoop({
      running: false,
      result: c && hasTurn(c) ? await turnLoopback(c.iceServers as RTCIceServer[]) : { ok: false, openMs: null, rttMs: null, stats: null, error: 'brak skonfigurowanego serwera TURN' },
    });
  }, [ice, loadIce]);
  const loadStats = useCallback(async () => {
    try {
      setStats(await api.devStats());
      setStatsError(null);
    } catch (e) {
      setStatsError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void loadIce();
    void runHealth();
    void runWs();
  }, [loadIce, runHealth, runWs]);

  useEffect(() => {
    if (!isTutor) return;
    void loadStats();
    if (!autoRefresh) return;
    const t = setInterval(() => void loadStats(), 3000);
    return () => clearInterval(t);
  }, [isTutor, autoRefresh, loadStats]);

  const runAll = () => {
    void runHealth();
    void runWs();
    void runGather();
    void runLoop();
  };

  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; rtt?: number; downlink?: number; type?: string } }).connection;
  const g = gather.result;
  const types = new Set(g?.candidates.map((c) => c.type));
  const turnProtos = [...new Set(g?.candidates.filter((c) => c.type === 'relay').map((c) => c.protocol))];
  const turnConfigured = hasTurn(ice);

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} /> MatDraw
        </Link>
        <strong>Panel developera</strong>
        <div className="spacer" />
        <Link to="/">← Moje tablice</Link>
      </header>

      <main className="dev-page">
        <p className="muted">
          Diagnostyka połączeń: serwer, WebSocket, STUN, TURN i WebRTC. Podgląd na żywo konkretnej tablicy: przycisk „Diagnostyka połączeń” (ikona pulsu) na
          tablicy lub <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>.
        </p>
        <div className="dev-actions">
          <button className="primary" onClick={runAll}>
            Uruchom wszystkie testy
          </button>
        </div>

        <div className="dev-grid">
          <section className="card">
            <h2>Przeglądarka</h2>
            <Row k="User agent" v={navigator.userAgent} />
            <Row k="WebRTC (RTCPeerConnection)" v={'RTCPeerConnection' in window ? 'tak ✓' : 'NIE'} tone={'RTCPeerConnection' in window ? 'good' : 'bad'} />
            <Row k="Bezpieczny kontekst (HTTPS)" v={window.isSecureContext ? 'tak ✓' : 'nie'} tone={window.isSecureContext ? 'good' : 'warn'} />
            <Row k="Online" v={navigator.onLine ? 'tak' : 'nie'} tone={navigator.onLine ? undefined : 'bad'} />
            <Row k="Sieć (Network Info API)" v={conn ? `${conn.effectiveType ?? '?'}${conn.rtt !== undefined ? ` · rtt ${conn.rtt} ms` : ''}${conn.downlink !== undefined ? ` · ${conn.downlink} Mb/s` : ''}` : 'niedostępne'} />
            <Row k="Pióro / dotyk" v={`maxTouchPoints: ${navigator.maxTouchPoints} · ${matchMedia('(pointer: fine)').matches ? 'wskaźnik precyzyjny' : 'wskaźnik zgrubny'}`} />
          </section>

          <section className="card">
            <h2>Serwer HTTP i WebSocket</h2>
            <Row
              k="API /api/health"
              v={health.running ? 'test…' : health.result ? (health.result.ok ? `OK · ${health.result.ms.join(' / ')} ms` : `błąd: ${health.result.error}`) : '—'}
              tone={health.result ? (health.result.ok ? 'good' : 'bad') : undefined}
            />
            <Row
              k="WebSocket /ws"
              v={ws.running ? 'test…' : ws.result ? (ws.result.ok ? `OK · zestawienie ${ws.result.connectMs} ms` : `błąd: ${ws.result.error}`) : '—'}
              tone={ws.result ? (ws.result.ok ? 'good' : 'bad') : undefined}
            />
            <Row k="RTT ping/pong" v={ws.result?.rttMs.length ? `śr. ${avg(ws.result.rttMs)} ms (${ws.result.rttMs.join(', ')})` : '—'} tone={(avg(ws.result?.rttMs ?? []) ?? 0) > 300 ? 'warn' : undefined} />
            <div className="dev-actions">
              <button onClick={() => void runHealth()} disabled={health.running}>
                Test API
              </button>
              <button onClick={() => void runWs()} disabled={ws.running}>
                Test WebSocket
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Konfiguracja ICE (STUN/TURN)</h2>
            {iceError && <Row k="Błąd" v={iceError} tone="bad" />}
            {ice &&
              maskIceServers(ice.iceServers as RTCIceServer[]).map((s, i) => (
                <Row key={i} k={s.urls.some((u) => /^turns?:/i.test(u)) ? 'TURN' : 'STUN'} v={`${s.urls.join(', ')}${s.username ? ` · user ${s.username}` : ''}${s.hasCredential ? ' · hasło ✓' : ''}`} />
              ))}
            {ice && !turnConfigured && <Row k="Uwaga" v="Brak serwera TURN – połączenia zza restrykcyjnego NAT pójdą awaryjnie przez serwer aplikacji." tone="warn" />}
            {ice && <Row k="Ważność poświadczeń" v={formatDuration(ice.ttl * 1000)} />}
          </section>

          <section className="card">
            <h2>Test zbierania kandydatów ICE</h2>
            <Row k="host (sieć lokalna)" v={g ? (types.has('host') ? 'tak ✓' : 'brak (mDNS/prywatność?)') : '—'} tone={g ? (types.has('host') ? 'good' : 'warn') : undefined} />
            <Row k="srflx – STUN działa" v={g ? (types.has('srflx') ? 'tak ✓' : 'NIE') : '—'} tone={g ? (types.has('srflx') ? 'good' : 'bad') : undefined} />
            <Row
              k="relay – TURN działa"
              v={g ? (types.has('relay') ? `tak ✓ (${turnProtos.join(', ')})` : turnConfigured ? 'NIE – sprawdź TURN_URLS/sekret/porty' : 'brak TURN w konfiguracji') : '—'}
              tone={g ? (types.has('relay') ? 'good' : turnConfigured ? 'bad' : 'warn') : undefined}
            />
            {g && <Row k="Czas" v={`${g.durationMs} ms${g.complete ? '' : ' (przerwano – limit czasu)'}`} />}
            {g?.errors.map((e, i) => <Row key={i} k="Błąd kandydata" v={e} tone="warn" />)}
            {g && g.candidates.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>typ</th>
                    <th>protokół</th>
                    <th>adres</th>
                    <th>ms</th>
                  </tr>
                </thead>
                <tbody>
                  {g.candidates.map((c, i) => (
                    <tr key={i} title={describeCandidateType(c.type)}>
                      <td>{c.type}</td>
                      <td>
                        {c.protocol}
                        {c.tcpType ? ` (${c.tcpType})` : ''}
                      </td>
                      <td className="mono">
                        {c.address}:{c.port}
                      </td>
                      <td>{c.ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="dev-actions">
              <button onClick={() => void runGather()} disabled={gather.running}>
                {gather.running ? 'Zbieranie…' : 'Zbierz kandydatów'}
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Test przekaźnika TURN (pętla zwrotna)</h2>
            <p className="hint">Dwa połączenia WebRTC w tej karcie wymuszone na trasie przez TURN – dowodzi, że przekaźnik przenosi dane.</p>
            {loop.running && <Row k="Stan" v="test…" />}
            {loop.result && (
              <>
                <Row k="Wynik" v={loop.result.ok ? 'OK ✓ – dane przeszły przez TURN' : `błąd: ${loop.result.error}`} tone={loop.result.ok ? 'good' : 'bad'} />
                <Row k="Zestawienie" v={loop.result.openMs !== null ? `${loop.result.openMs} ms` : '—'} />
                <Row k="RTT przez TURN" v={loop.result.rttMs !== null ? `${loop.result.rttMs} ms` : '—'} />
                {loop.result.stats?.local && (
                  <Row k="Przekaźnik" v={`${loop.result.stats.local.address}:${loop.result.stats.local.port ?? ''} · do TURN: ${loop.result.stats.local.relayProtocol ?? loop.result.stats.local.protocol}${loop.result.stats.local.url ? ` · ${loop.result.stats.local.url}` : ''}`} />
                )}
              </>
            )}
            <div className="dev-actions">
              <button onClick={() => void runLoop()} disabled={loop.running}>
                {loop.running ? 'Testowanie…' : 'Testuj TURN'}
              </button>
            </div>
          </section>

          {isTutor && (
            <section className="card">
              <h2>Serwer – na żywo</h2>
              {statsError && <Row k="Błąd" v={statsError} tone="bad" />}
              {stats && (
                <>
                  <Row k="Działa od" v={`${formatDuration(stats.uptimeSec * 1000)} (${new Date(stats.startedAt).toLocaleString('pl-PL')})`} />
                  <Row k="Node / platforma" v={`${stats.node} · ${stats.platform}`} />
                  <Row k="Baza" v={stats.store === 'memory' ? 'pamięć (dane nietrwałe!)' : 'MySQL (Prisma)'} tone={stats.store === 'memory' ? 'warn' : undefined} />
                  <Row k="Pamięć" v={`RSS ${formatBytes(stats.memory.rss)} · heap ${formatBytes(stats.memory.heapUsed)} / ${formatBytes(stats.memory.heapTotal)}`} />
                  <Row k="TURN na serwerze" v={`${stats.ice.turnUrls.join(', ') || 'brak'} · uwierzytelnianie: ${stats.ice.turnAuth}`} tone={stats.ice.turnAuth === 'none' ? 'warn' : undefined} />
                  <Row k="STUN" v={stats.ice.stunUrls.join(', ') || 'brak'} />
                  <Row k="WebSocket otwarte / łącznie" v={`${stats.realtime.connectionsOpen} / ${stats.realtime.connectionsOpened} (dołączeń: ${stats.realtime.joins})`} />
                  <Row k="Wiadomości ↓/↑" v={`${stats.realtime.msgsIn} / ${stats.realtime.msgsOut} · ${formatBytes(stats.realtime.bytesIn)} / ${formatBytes(stats.realtime.bytesOut)}`} />
                  <Row k="Sygnały WebRTC przekazane" v={stats.realtime.signalsRelayed} />
                  <Row k="Zmiany dokumentu (zapis)" v={stats.realtime.docUpdates} />
                  <Row k="Zmiany przekazane (brak P2P)" v={stats.realtime.docUpdatesRelayed} tone={stats.realtime.docUpdatesRelayed > 0 ? 'warn' : undefined} />
                  <Row k="Kursory przez serwer" v={stats.realtime.ephemeralRelayed} tone={stats.realtime.ephemeralRelayed > 0 ? 'warn' : undefined} />
                  <Row k="Dokumenty w pamięci" v={stats.loadedDocs} />
                </>
              )}
              <label className="checkbox">
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> odświeżaj co 3 s
              </label>
            </section>
          )}
        </div>

        {isTutor && stats && (
          <section className="card" style={{ marginTop: 12 }}>
            <h2>Aktywne tablice ({stats.rooms.length})</h2>
            {stats.rooms.length === 0 ? (
              <div className="muted">Nikt nie jest teraz połączony z żadną tablicą.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tablica</th>
                    <th>Uczestnik</th>
                    <th>Rola</th>
                    <th>Połączony</th>
                    <th>Wiad. ↓/↑</th>
                    <th>Dane ↓/↑</th>
                    <th>Przekazane zmiany</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rooms.flatMap((room) =>
                    room.peers.map((p, i) => (
                      <tr key={p.peerId}>
                        <td>{i === 0 ? <Link to={`/board/${room.boardId}`}>{room.title ?? room.boardId}</Link> : ''}</td>
                        <td>
                          <span className="avatar-dot" style={{ background: p.color }} /> {p.name}
                          {p.canEdit ? '' : ' (podgląd)'}
                        </td>
                        <td>{p.role === 'TUTOR' ? 'korepetytorka' : 'uczeń'}</td>
                        <td>{formatDuration(Date.parse(stats.serverTime) - Date.parse(p.connectedAt))}</td>
                        <td>
                          {p.msgsIn} / {p.msgsOut}
                        </td>
                        <td>
                          {formatBytes(p.bytesIn)} / {formatBytes(p.bytesOut)}
                        </td>
                        <td>{p.relayedToPeer}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
