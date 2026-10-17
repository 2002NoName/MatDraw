import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { UpdateAccountRequest } from '@matdraw/shared';
import { api } from '../api/client';
import { useAuth } from '../api/auth';
import { AppFooter } from '../components/AppFooter';

type Status = { ok?: string; error?: string };

/** Edycja własnego konta – identyczna dla ucznia i korepetytorki. */
export function AccountPage() {
  const { user, signIn } = useAuth();
  const [profile, setProfile] = useState({
    displayName: user?.displayName ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    currentPassword: '',
  });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [profileStatus, setProfileStatus] = useState<Status>({});
  const [pwdStatus, setPwdStatus] = useState<Status>({});
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const emailChanged = profile.email.trim().toLowerCase() !== user.email;

  const save = async (data: UpdateAccountRequest, setStatus: (s: Status) => void, okMsg: string, after?: () => void) => {
    setBusy(true);
    setStatus({});
    try {
      signIn(await api.updateAccount(data));
      setStatus({ ok: okMsg });
      after?.();
    } catch (err) {
      setStatus({ error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    void save(
      {
        displayName: profile.displayName,
        name: profile.name,
        ...(emailChanged ? { email: profile.email, currentPassword: profile.currentPassword } : {}),
      },
      setProfileStatus,
      'Zapisano dane konta.',
      () => setProfile((p) => ({ ...p, currentPassword: '' })),
    );
  };

  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) {
      setPwdStatus({ error: 'Nowe hasła nie są takie same' });
      return;
    }
    void save(
      { newPassword: pwd.newPassword, currentPassword: pwd.currentPassword },
      setPwdStatus,
      'Hasło zostało zmienione.',
      () => setPwd({ currentPassword: '', newPassword: '', confirm: '' }),
    );
  };

  return (
    <div className="page account-page">
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} /> MatDraw
        </Link>
        <div className="spacer" />
        <Link to="/">← Moje tablice</Link>
      </header>

      <main className="account">
        <h1>Moje konto</h1>
        <p className="muted">
          Rodzaj konta: <strong>{user.role === 'TUTOR' ? 'korepetytorka' : 'uczeń'}</strong>
        </p>

        <form className="card account-card" onSubmit={saveProfile}>
          <h2>Dane konta</h2>
          <label>
            Widoczna nazwa
            <input
              required
              maxLength={60}
              autoComplete="nickname"
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            />
            <span className="hint">Pokazywana innym uczestnikom na tablicy (kursor, lista osób).</span>
          </label>
          <label>
            Imię i nazwisko
            <input
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </label>
          <label>
            E-mail (login)
            <input
              type="email"
              required
              autoComplete="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </label>
          {emailChanged && (
            <label>
              Obecne hasło (wymagane do zmiany e-maila)
              <input
                type="password"
                required
                autoComplete="current-password"
                value={profile.currentPassword}
                onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
              />
            </label>
          )}
          {profileStatus.error && <div className="error">{profileStatus.error}</div>}
          {profileStatus.ok && <div className="success">{profileStatus.ok}</div>}
          <button className="primary" disabled={busy}>
            Zapisz dane
          </button>
        </form>

        <form className="card account-card" onSubmit={savePassword}>
          <h2>Zmiana hasła</h2>
          <input type="email" autoComplete="username" value={user.email} readOnly hidden />
          <label>
            Obecne hasło
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pwd.currentPassword}
              onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
            />
          </label>
          <label>
            Nowe hasło (min. 8 znaków)
            <input
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              value={pwd.newPassword}
              onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
            />
          </label>
          <label>
            Powtórz nowe hasło
            <input
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            />
          </label>
          {pwdStatus.error && <div className="error">{pwdStatus.error}</div>}
          {pwdStatus.ok && <div className="success">{pwdStatus.ok}</div>}
          <button className="primary" disabled={busy}>
            Zmień hasło
          </button>
        </form>
      </main>
      <AppFooter />
    </div>
  );
}
