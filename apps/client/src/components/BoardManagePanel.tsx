import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { formatInviteCode, type BoardDetails } from '@matdraw/shared';
import { api } from '../api/client';
import { Modal } from './Modal';
import { useDialogs } from './dialogs';

function inviteStatus(i: NonNullable<BoardDetails['invites']>[number]) {
  if (i.revoked) return 'unieważniony';
  if (i.expiresAt && new Date(i.expiresAt) < new Date()) return 'wygasł';
  if (i.maxUses != null && i.uses >= i.maxUses) return 'wykorzystany';
  return 'aktywny';
}

/** Zarządzanie tablicą (tylko korepetytorka): kody zaproszeń i uczestnicy. */
export function BoardManagePanel({ boardId, onClose }: { boardId: string; onClose(): void }) {
  const dialogs = useDialogs();
  const [board, setBoard] = useState<BoardDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState('24');
  const [maxUses, setMaxUses] = useState('1');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.getBoard(boardId).then(setBoard, (e: Error) => setError(e.message));
  }, [boardId]);
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

  const createInvite = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const inv = await api.createInvite(boardId, {
        label: label.trim() || undefined,
        expiresInHours: hours ? Number(hours) : null,
        maxUses: maxUses ? Number(maxUses) : null,
      });
      setLabel('');
      void copy(inv.code);
    });
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(formatInviteCode(code));
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* schowek niedostępny – kod widoczny na ekranie */
    }
  };

  const addMember = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api.addMember(boardId, email);
      setEmail('');
    });
  };

  return (
    <Modal title={board ? `Uczestnicy i zaproszenia – ${board.title}` : 'Uczestnicy i zaproszenia'} onClose={onClose} wide>
      {error && <div className="error">{error}</div>}
      {!board ? (
        <p>Ładowanie…</p>
      ) : (
        <div className="manage-grid">
          <section>
            <h3>Nowy kod zaproszenia</h3>
            <form className="stack" onSubmit={createInvite}>
              <label>
                Opis (opcjonalnie)
                <input placeholder="np. Ania – klasa 7" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
              </label>
              <div className="row">
                <label>
                  Ważny przez
                  <select value={hours} onChange={(e) => setHours(e.target.value)}>
                    <option value="1">1 godzinę</option>
                    <option value="24">24 godziny</option>
                    <option value="168">7 dni</option>
                    <option value="720">30 dni</option>
                    <option value="">bez limitu</option>
                  </select>
                </label>
                <label>
                  Liczba użyć
                  <select value={maxUses} onChange={(e) => setMaxUses(e.target.value)}>
                    <option value="1">1 osoba</option>
                    <option value="2">2 osoby</option>
                    <option value="5">5 osób</option>
                    <option value="30">30 osób</option>
                    <option value="">bez limitu</option>
                  </select>
                </label>
              </div>
              <button className="primary">Wygeneruj kod</button>
            </form>

            <h3>Kody</h3>
            {board.invites?.length ? (
              <ul className="list">
                {board.invites.map((i) => {
                  const st = inviteStatus(i);
                  return (
                    <li key={i.id} className={st !== 'aktywny' ? 'dim' : ''}>
                      <div>
                        <code className="invite-code">{formatInviteCode(i.code)}</code>
                        <div className="muted small">
                          {i.label ? `${i.label} · ` : ''}
                          {st} · użyto {i.uses}
                          {i.maxUses != null ? `/${i.maxUses}` : ''}
                          {i.expiresAt ? ` · do ${new Date(i.expiresAt).toLocaleString('pl-PL')}` : ''}
                        </div>
                      </div>
                      <div className="actions">
                        {st === 'aktywny' && (
                          <>
                            <button onClick={() => void copy(i.code)}>{copied === i.code ? 'Skopiowano ✓' : 'Kopiuj'}</button>
                            <button className="danger" onClick={() => void run(() => api.revokeInvite(boardId, i.id))}>
                              Unieważnij
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">Brak kodów.</p>
            )}
          </section>

          <section>
            <h3>Uczestnicy</h3>
            {board.members.length ? (
              <ul className="list">
                {board.members.map((m) => (
                  <li key={m.userId}>
                    <div>
                      <strong>{m.displayName || m.name}</strong>
                      <div className="muted small">
                        {m.displayName && m.displayName !== m.name ? `${m.name} · ` : ''}
                        {m.email}
                      </div>
                    </div>
                    <div className="actions">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={m.canEdit}
                          onChange={(e) => void run(() => api.setMemberEdit(boardId, m.userId, e.target.checked))}
                        />
                        edycja
                      </label>
                      <button
                        className="danger"
                        onClick={async () => {
                          const ok = await dialogs.confirm({
                            title: 'Usuń uczestnika',
                            message: (
                              <>
                                Usunąć <strong>{m.name}</strong> z tablicy? Zostanie natychmiast rozłączony(a); powrót będzie wymagał nowego kodu.
                              </>
                            ),
                            confirmLabel: 'Usuń z tablicy',
                            danger: true,
                          });
                          if (ok) void run(() => api.removeMember(boardId, m.userId));
                        }}
                      >
                        Usuń
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nikt jeszcze nie dołączył. Wygeneruj kod i przekaż go uczniowi.</p>
            )}
            <h3>Dodaj ucznia po e-mailu</h3>
            <form className="row" onSubmit={addMember}>
              <input type="email" required placeholder="uczen@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button>Dodaj</button>
            </form>
            <p className="muted small">Uczeń musi mieć już założone konto.</p>
          </section>
        </div>
      )}
    </Modal>
  );
}
