import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { BoardSession, SessionDiagnostics } from '../sync/session';
import type { PeerLinkDiagnostics } from '../sync/peerLink';
import { describeCandidateType, formatBytes, formatDuration, ratePerSec, type CandidateStat } from '../sync/diagnostics';

const ROUTE_LABEL: Record<PeerLinkDiagnostics['state'], string> = {
  connecting: 'zestawianie…',
  direct: 'P2P bezpośrednio',
  turn: 'P2P przez TURN',
  failed: 'brak P2P – przez serwer',
  closed: 'zamknięte',
};

function rate(v: number | null): string {
  return v === null ? '—' : `${formatBytes(v)}/s`;
}

function cand(c: CandidateStat | null) {
  if (!c) return '—';
  const relay = c.relayProtocol ? ` (do TURN: ${c.relayProtocol})` : '';
  return `${describeCandidateType(c.type)} · ${c.protocol} ${c.address}${c.port !== null ? `:${c.port}` : ''}${relay}`;
}

function Row({ k, v, warn }: { k: string; v: ReactNode; warn?: boolean }) {
  return (
    <div className={`diag-row${warn ? ' warn' : ''}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

/**
 * Panel diagnostyki połączeń na tablicy (Ctrl+Shift+D): WebSocket, połączenia WebRTC z każdym
 * uczestnikiem (trasa, kandydaci ICE, RTT, przepustowość), ruch P2P vs serwer i dziennik zdarzeń.
 * Odświeżany co sekundę.
 */
export function ConnectionDebugPanel({ session, onClose }: { session: BoardSession; onClose: () => void }) {
  const [d, setD] = useState<SessionDiagnostics | null>(null);
  const prev = useRef<SessionDiagnostics | null>(null);
  const [rates, setRates] = useState<Record<string, { in: number | null; out: number | null }>>({});
  const [copied, setCopied] = useState(false);
  const [showLog, setShowLog] = useState(true);

  useEffect(() => {
    let alive = true;
    let tick = 0;
    const sample = async () => {
      if (tick++ % 2 === 0) session.measurePing();
      const cur = await session.diagnostics();
      if (!alive) return;
      const p = prev.current;
      const dt = p ? cur.at - p.at : 0;
      const r: typeof rates = {
        ws: { in: ratePerSec(p?.ws.bytesIn, cur.ws.bytesIn, dt), out: ratePerSec(p?.ws.bytesOut, cur.ws.bytesOut, dt) },
      };
      for (const peer of cur.peers) {
        const old = p?.peers.find((x) => x.peerId === peer.peerId)?.link;
        r[peer.peerId] = {
          in: ratePerSec(old?.bytesIn, peer.link?.bytesIn ?? 0, dt),
          out: ratePerSec(old?.bytesOut, peer.link?.bytesOut ?? 0, dt),
        };
      }
      prev.current = cur;
      setRates(r);
      setD(cur);
    };
    void sample();
    const t = setInterval(() => void sample(), 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [session]);

  const copy = async () => {
    if (!d) return;
    const report = { generatedAt: new Date().toISOString(), userAgent: navigator.userAgent, ...d };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* brak uprawnień do schowka */
    }
  };

  const hasTurn = d?.iceServers.some((s) => s.urls.some((u) => /^turns?:/i.test(u)));

  return (
    <aside className="diag-panel" aria-label="Diagnostyka połączeń">
      <header>
        <strong>Diagnostyka połączeń</strong>
        <span className="muted">na żywo · co 1 s</span>
        <div className="spacer" />
        <button className="small" onClick={() => void copy()} title="Kopiuj pełny raport JSON do schowka">
          {copied ? 'Skopiowano ✓' : 'Kopiuj raport JSON'}
        </button>
        <button className="icon-button small" onClick={onClose} aria-label="Zamknij diagnostykę" title="Zamknij (Ctrl+Shift+D)">
          ✕
        </button>
      </header>
      {!d ? (
        <div className="muted">Zbieranie danych…</div>
      ) : (
        <div className="diag-body">
          <section>
            <h4>Serwer (WebSocket)</h4>
            <Row k="Stan" v={`${d.ws.state} · sesja: ${d.status}`} warn={d.ws.state !== 'open'} />
            <Row k="Adres" v={d.ws.url} />
            <Row k="Połączony od" v={d.ws.connectedAt ? formatDuration(d.at - d.ws.connectedAt) : '—'} />
            <Row k="RTT (ping)" v={d.ws.rttMs !== null ? `${d.ws.rttMs} ms` : '—'} warn={(d.ws.rttMs ?? 0) > 300} />
            <Row k="Ponowne łączenia" v={d.ws.reconnects} warn={d.ws.reconnects > 0} />
            <Row k="Wiadomości ↓/↑" v={`${d.ws.msgsIn} / ${d.ws.msgsOut}`} />
            <Row k="Dane ↓/↑" v={`${formatBytes(d.ws.bytesIn)} / ${formatBytes(d.ws.bytesOut)} (${rate(rates.ws?.in ?? null)} / ${rate(rates.ws?.out ?? null)})`} />
            <Row k="Ja" v={d.self ? `${d.self.name} · ${d.self.role === 'TUTOR' ? 'korepetytor' : 'uczeń'} · ${d.self.canEdit ? 'edycja' : 'podgląd'}` : '—'} />
            <Row k="Dokument" v={`${formatBytes(d.doc.bytes)} · oczekujące zmiany: ${d.doc.pendingUpdates}`} />
          </section>

          <section>
            <h4>Uczestnicy – WebRTC ({d.peers.length})</h4>
            {d.peers.length === 0 && <div className="muted">Brak innych osób na tablicy.</div>}
            {d.peers.map((p) => {
              const l = p.link;
              const s = l?.stats;
              const r = rates[p.peerId];
              return (
                <div key={p.peerId} className="diag-peer" style={{ borderColor: p.color }}>
                  <div className="diag-peer-head">
                    <span className="avatar" style={{ background: p.color }}>
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <strong>{p.name}</strong>
                    <span className="muted small">{p.role === 'TUTOR' ? 'korepetytor' : 'uczeń'}</span>
                    {l && <span className={`route-badge route-${l.state}`}>{ROUTE_LABEL[l.state]}</span>}
                  </div>
                  {!l ? (
                    <div className="muted">Brak obiektu połączenia.</div>
                  ) : (
                    <>
                      <Row k="Stany" v={`conn: ${l.connectionState} · ice: ${l.iceConnectionState} · gather: ${l.iceGatheringState} · sig: ${l.signalingState} · kanał: ${l.dataChannel}`} warn={l.connectionState === 'failed' || l.connectionState === 'disconnected'} />
                      <Row k="Zestawienie" v={`${l.openedAt ? `${l.openedAt - l.createdAt} ms` : `trwa ${formatDuration(d.at - l.createdAt)}`} · ${l.initiator ? 'inicjator' : 'odbiorca'} · restarty ICE: ${l.iceRestarts}`} warn={l.iceRestarts > 0} />
                      <Row k="Trasa lokalnie" v={cand(s?.local ?? null)} />
                      <Row k="Trasa zdalnie" v={cand(s?.remote ?? null)} />
                      <Row k="RTT (ICE)" v={s?.pair?.rttMs !== null && s?.pair?.rttMs !== undefined ? `${s.pair.rttMs} ms` : '—'} warn={(s?.pair?.rttMs ?? 0) > 300} />
                      <Row k="Dostępne pasmo ↑" v={s?.pair?.availableOutgoingKbps ? `${s.pair.availableOutgoingKbps} kb/s` : '—'} />
                      <Row k="Kanał danych ↓/↑" v={`${l.msgsIn} / ${l.msgsOut} wiad. · ${formatBytes(l.bytesIn)} / ${formatBytes(l.bytesOut)} (${rate(r?.in ?? null)} / ${rate(r?.out ?? null)})`} />
                      <Row k="Para ICE ↓/↑" v={s?.pair ? `${formatBytes(s.pair.bytesReceived)} / ${formatBytes(s.pair.bytesSent)} · ${s.pair.state}` : '—'} />
                      <Row
                        k="Kandydaci"
                        v={`lokalni: ${Object.entries(l.gathered).map(([k, v]) => `${k}×${v}`).join(', ') || 'brak'} · zdalni: ${l.remoteCandidates}`}
                        warn={l.iceGatheringState === 'complete' && !l.gathered.srflx && !l.gathered.relay}
                      />
                      {s?.transport && <Row k="DTLS" v={`${s.transport.dtlsState ?? '—'}${s.transport.dtlsCipher ? ` · ${s.transport.dtlsCipher}` : ''}`} />}
                    </>
                  )}
                </div>
              );
            })}
          </section>

          <section>
            <h4>Ruch: P2P vs serwer</h4>
            <Row k="Zmiany P2P ↓/↑" v={`${d.traffic.docUpdatesP2PIn} / ${d.traffic.docUpdatesP2POut}`} />
            <Row k="Zmiany na serwer (zapis)" v={d.traffic.docUpdatesToServer} />
            <Row k="…w tym z przekazaniem" v={d.traffic.docUpdatesRelayRequested} warn={d.traffic.docUpdatesRelayRequested > 0} />
            <Row k="Zmiany przekazane przez serwer ↓" v={d.traffic.docUpdatesFromServerRelay} />
            <Row k="Kursory/kreski P2P ↓/↑" v={`${d.traffic.ephemeralP2PIn} / ${d.traffic.ephemeralP2POut}`} />
            <Row k="Kursory/kreski przez serwer ↓/↑" v={`${d.traffic.ephemeralServerIn} / ${d.traffic.ephemeralServerOut}`} warn={d.traffic.ephemeralServerOut > 0} />
          </section>

          <section>
            <h4>Serwery ICE</h4>
            {!hasTurn && <div className="diag-row warn">Brak serwera TURN – za restrykcyjnym NAT dane pójdą przez serwer aplikacji.</div>}
            {d.iceServers.map((s, i) => (
              <Row key={i} k={s.urls.some((u) => /^turns?:/i.test(u)) ? 'TURN' : 'STUN'} v={`${s.urls.join(', ')}${s.username ? ` · user ${s.username}` : ''}${s.hasCredential ? ' · hasło ✓' : ''}`} />
            ))}
          </section>

          <section>
            <h4>
              <button className="link-button" onClick={() => setShowLog((v) => !v)}>
                {showLog ? '▾' : '▸'} Dziennik zdarzeń ({d.log.length})
              </button>
            </h4>
            {showLog && (
              <ol className="diag-log">
                {d.log
                  .slice()
                  .reverse()
                  .map((e, i) => (
                    <li key={`${e.t}-${i}`} className={`lvl-${e.level}`}>
                      <time>{new Date(e.t).toLocaleTimeString('pl-PL')}</time> <b>{e.source}</b> {e.message}
                    </li>
                  ))}
              </ol>
            )}
          </section>
          <div className="muted small-text">
            Pełne testy STUN/TURN i statystyki serwera: <Link to="/dev">Panel developera</Link>
          </div>
        </div>
      )}
    </aside>
  );
}
