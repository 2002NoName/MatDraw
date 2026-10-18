import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { Role } from '@matdraw/shared';
import { api } from '../api/client';
import { useAuth } from '../api/auth';
import { RoleBadge } from '../components/icons';

export function RegisterPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', displayName: '', email: '', password: '', role: 'STUDENT' as Role, tutorSecret: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      signIn(
        await api.register({
          name: form.name,
          displayName: form.displayName.trim() || undefined,
          email: form.email,
          password: form.password,
          role: form.role,
          tutorSecret: form.role === 'TUTOR' ? form.tutorSecret : undefined,
        }),
      );
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Załóż konto</h1>
        <div className="segmented" role="radiogroup" aria-label="Rodzaj konta">
          <button type="button" className={form.role === 'STUDENT' ? 'active' : ''} onClick={() => set('role', 'STUDENT')}>
            <RoleBadge role="STUDENT" />
          </button>
          <button type="button" className={form.role === 'TUTOR' ? 'active' : ''} onClick={() => set('role', 'TUTOR')}>
            <RoleBadge role="TUTOR" />
          </button>
        </div>
        <label>
          Imię i nazwisko
          <input required minLength={2} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>
          Widoczna nazwa (opcjonalnie)
          <input maxLength={60} autoComplete="nickname" placeholder={form.name || 'np. Kasia'} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
          <span className="hint">Tak zobaczą Cię inni na tablicy. Domyślnie imię i nazwisko.</span>
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="username" required value={form.email} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label>
          Hasło (min. 8 znaków)
          <input type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} />
        </label>
        {form.role === 'TUTOR' && (
          <label>
            Kod rejestracyjny korepetytorki
            <input required value={form.tutorSecret} onChange={(e) => set('tutorSecret', e.target.value)} />
            <span className="hint">Otrzymasz go od administratora serwera.</span>
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? 'Zakładanie…' : 'Załóż konto'}
        </button>
        <p>
          Masz już konto? <Link to="/login">Zaloguj się</Link>
        </p>
      </form>
    </div>
  );
}
