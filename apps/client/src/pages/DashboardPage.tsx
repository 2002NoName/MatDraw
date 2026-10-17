import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { BoardSummary } from '@matdraw/shared';
import { api } from '../api/client';
import { useAuth } from '../api/auth';
import { BoardManagePanel } from '../components/BoardManagePanel';
import { AppFooter } from '../components/AppFooter';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isTutor = user?.role === 'TUTOR';
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [filter, setFilter] = useState('');
  const [manage, setManage] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.listBoards().then(setBoards, (e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const b = await api.createBoard(title.trim() || 'Nowa tablica');
      setTitle('');
      navigate(`/board/${b.id}`);
    });
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const b = await api.join(code);
      setCode('');
      navigate(`/board/${b.id}`);
    });
  };

  const visible = (boards ?? []).filter(
    (b) => !filter || b.title.toLowerCase().includes(filter.toLowerCase()) || b.ownerName.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} /> MatDraw
        </div>
        <div className="spacer" />
        <Link to="/wzory">Wzory CKE</Link>
        <Link to="/dev" title="Panel developera – diagnostyka połączeń P2P/WebRTC/TURN">
          Diagnostyka
        </Link>
        <Link to="/konto" title="Moje konto – edycja danych i hasła">
          {user?.displayName || user?.name}
        </Link>
        <span className="muted">{isTutor ? 'korepetytorka' : 'uczeń'}</span>
        <button onClick={signOut}>Wyloguj</button>
      </header>

      <main className="dashboard">
        {error && <div className="error">{error}</div>}
        <div className="dash-actions">
          {isTutor && (
            <form className="card row" onSubmit={create}>
              <input placeholder="Nazwa nowej tablicy" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              <button className="primary">+ Nowa tablica</button>
            </form>
          )}
          <form className="card row" onSubmit={join}>
            <input
              className="code-input"
              placeholder="Kod, np. ABCD-EFGH"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              required
            />
            <button className={isTutor ? '' : 'primary'}>Dołącz kodem</button>
          </form>
        </div>

        <div className="row between">
          <h2>{isTutor ? 'Wszystkie tablice' : 'Moje tablice'}</h2>
          {(boards?.length ?? 0) > 5 && <input placeholder="Szukaj…" value={filter} onChange={(e) => setFilter(e.target.value)} />}
        </div>

        {!boards ? (
          <p>Ładowanie…</p>
        ) : visible.length === 0 ? (
          <p className="muted">
            {isTutor ? 'Brak tablic. Utwórz pierwszą tablicę powyżej.' : 'Nie masz jeszcze tablic. Wpisz kod otrzymany od korepetytorki.'}
          </p>
        ) : (
          <ul className="board-grid">
            {visible.map((b) => (
              <li key={b.id} className="card board-card">
                <Link to={`/board/${b.id}`} className="board-link">
                  <strong>{b.title}</strong>
                  <span className="muted small">
                    {b.ownerName} · {b.memberCount} {b.memberCount === 1 ? 'uczestnik' : 'uczestników'}
                  </span>
                  <span className="muted small">zmieniono {new Date(b.updatedAt).toLocaleString('pl-PL')}</span>
                  {!b.canEdit && <span className="badge">tylko odczyt</span>}
                </Link>
                <div className="actions">
                  {isTutor ? (
                    <>
                      <button onClick={() => setManage(b.id)}>Uczestnicy</button>
                      <button
                        onClick={() => {
                          const t = prompt('Nowa nazwa tablicy', b.title);
                          if (t?.trim()) void run(() => api.renameBoard(b.id, t.trim()));
                        }}
                      >
                        Zmień nazwę
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm(`Usunąć tablicę „${b.title}”? Tej operacji nie można cofnąć.`)) void run(() => api.deleteBoard(b.id));
                        }}
                      >
                        Usuń
                      </button>
                    </>
                  ) : (
                    <button
                      className="danger"
                      onClick={() => {
                        if (confirm(`Opuścić tablicę „${b.title}”? Aby wrócić, potrzebny będzie nowy kod.`)) void run(() => api.leaveBoard(b.id));
                      }}
                    >
                      Opuść
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <AppFooter />
      {manage && (
        <BoardManagePanel
          boardId={manage}
          onClose={() => {
            setManage(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
