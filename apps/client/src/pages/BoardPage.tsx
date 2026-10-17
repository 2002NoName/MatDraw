import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { BoardDetails, PeerEphemeral, PeerInfo } from '@matdraw/shared';
import { api, tokenStore } from '../api/client';
import { useAuth } from '../api/auth';
import { BoardModel } from '../board/model';
import { Whiteboard, type EphemeralChannel } from '../board/Whiteboard';
import { BoardSession, type PeerView, type SessionStatus } from '../sync/session';
import { BoardManagePanel } from '../components/BoardManagePanel';
import { ConnectionDebugPanel } from '../components/ConnectionDebugPanel';
import { Icon } from '../components/icons';

const LINK_LABEL: Record<PeerView['link'], string> = {
  connecting: 'łączenie…',
  direct: 'połączenie bezpośrednie (P2P)',
  turn: 'połączenie przez serwer TURN',
  failed: 'brak P2P – synchronizacja przez serwer',
  closed: 'rozłączony',
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  connecting: 'Łączenie z serwerem…',
  online: 'Połączono',
  reconnecting: 'Utracono połączenie – ponawianie…',
  kicked: 'Zostałeś(-aś) usunięty(-a) z tablicy',
  deleted: 'Tablica została usunięta',
  denied: 'Brak dostępu do tablicy',
};

export function BoardPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ s: BoardSession; model: BoardModel } | null>(null);
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [statusMsg, setStatusMsg] = useState<string | undefined>();
  const [peers, setPeers] = useState<PeerView[]>([]);
  const [self, setSelf] = useState<PeerInfo | null>(null);
  const [synced, setSynced] = useState(false);
  const [notices, setNotices] = useState<{ id: number; text: string }[]>([]);
  const [manage, setManage] = useState(false);
  const [diag, setDiag] = useState(() => sessionStorage.getItem('matdraw.diag') === '1');

  useEffect(() => {
    sessionStorage.setItem('matdraw.diag', diag ? '1' : '0');
  }, [diag]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setDiag((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const listeners = useMemo(() => new Set<(from: PeerInfo, msg: PeerEphemeral) => void>(), []);

  useEffect(() => {
    let cancelled = false;
    api.getBoard(id).then(
      (b) => !cancelled && setBoard(b),
      (e: Error) => !cancelled && setError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const notice = (text: string) => {
      const nid = Date.now() + Math.random();
      setNotices((n) => [...n.slice(-3), { id: nid, text }]);
      setTimeout(() => setNotices((n) => n.filter((x) => x.id !== nid)), 4000);
    };
    const s = new BoardSession(id, tokenStore.get, api.ice, {
      status: (st, msg) => {
        setStatus(st);
        setStatusMsg(msg);
      },
      peers: setPeers,
      self: setSelf,
      ephemeral: (from, msg) => listeners.forEach((fn) => fn(from, msg)),
      synced: () => setSynced(true),
      notice,
    });
    const model = new BoardModel(s.doc);
    setSession({ s, model });
    void s.start();
    return () => {
      model.destroy();
      s.destroy();
      setSession(null);
      setSynced(false);
    };
  }, [id, listeners]);

  const channel = useMemo<EphemeralChannel | null>(
    () =>
      session && {
        send: (msg) => session.s.sendEphemeral(msg),
        subscribe: (fn) => {
          listeners.add(fn);
          return () => listeners.delete(fn);
        },
      },
    [session, listeners],
  );

  const readOnly = self ? !self.canEdit : board ? !board.canEdit : true;
  const isTutor = user?.role === 'TUTOR';
  const fatal = status === 'kicked' || status === 'deleted' || status === 'denied';

  if (error) {
    return (
      <div className="center-screen">
        <div className="card stack">
          <div className="error">{error}</div>
          <Link to="/">Wróć do listy tablic</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      <header className="topbar board-topbar">
        <button className="icon-button" onClick={() => navigate('/')} aria-label="Wróć do listy tablic" title="Wróć do listy tablic">
          <Icon name="back" />
        </button>
        <strong className="board-title">{board?.title ?? 'Tablica'}</strong>
        <span className={`status-dot status-${status}`} title={STATUS_LABEL[status]} />
        <div className="spacer" />
        <div className="peers" aria-label="Uczestnicy online">
          {self && (
            <span className="peer-chip" style={{ borderColor: self.color }} title="Ty">
              <span className="avatar" style={{ background: self.color }}>
                {self.name.slice(0, 1).toUpperCase()}
              </span>
              Ty
            </span>
          )}
          {peers.map((p) => (
            <span key={p.peerId} className={`peer-chip link-${p.link}`} style={{ borderColor: p.color }} title={`${p.name} – ${LINK_LABEL[p.link]}${p.canEdit ? '' : ' (tylko podgląd)'}`}>
              <span className="avatar" style={{ background: p.color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="peer-name">{p.name}</span>
              <span className="link-icon">{p.link === 'direct' ? '⇄' : p.link === 'turn' ? '⇢' : p.link === 'connecting' ? '…' : '☁'}</span>
            </span>
          ))}
        </div>
        <button
          className={`icon-button${diag ? ' active' : ''}`}
          onClick={() => setDiag((v) => !v)}
          aria-label="Diagnostyka połączeń"
          aria-pressed={diag}
          title="Diagnostyka połączeń (Ctrl+Shift+D)"
        >
          <Icon name="activity" size={20} />
        </button>
        {isTutor && (
          <button onClick={() => setManage(true)}>
            <Icon name="users" size={18} /> Zaproś / uczestnicy
          </button>
        )}
      </header>

      {status === 'reconnecting' && <div className="banner warn">{STATUS_LABEL.reconnecting} Zmiany są zachowywane lokalnie i zostaną wysłane po połączeniu.</div>}

      {session && channel && user && synced ? (
        <Whiteboard model={session.model} userId={user.id} readOnly={readOnly || fatal} channel={channel} peers={peers} />
      ) : (
        !fatal && <div className="center-screen">Wczytywanie tablicy…</div>
      )}

      {fatal && (
        <div className="modal-backdrop">
          <div className="modal card">
            <h2>{STATUS_LABEL[status]}</h2>
            {statusMsg && statusMsg !== STATUS_LABEL[status] && <p>{statusMsg}</p>}
            <button className="primary" onClick={() => navigate('/')}>
              Wróć do listy tablic
            </button>
          </div>
        </div>
      )}

      <div className="toasts">
        {notices.map((n) => (
          <div key={n.id} className="toast">
            {n.text}
          </div>
        ))}
      </div>

      {diag && session && <ConnectionDebugPanel session={session.s} onClose={() => setDiag(false)} />}

      {manage && <BoardManagePanel boardId={id} onClose={() => setManage(false)} />}
    </div>
  );
}
