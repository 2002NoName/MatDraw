import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/auth';
import { APP_AUTHORS } from '../components/AppFooter';

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      signIn(await api.login(email, password));
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
        <h1>
          <img src="/icon.svg" alt="" width={36} height={36} /> MatDraw
        </h1>
        <p className="muted">Tablica matematyczna do wspólnej pracy</p>
        <label>
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Hasło
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? 'Logowanie…' : 'Zaloguj się'}
        </button>
        <p>
          Nie masz konta? <Link to="/register">Załóż konto</Link>
        </p>
        <p className="muted small">
          © {APP_AUTHORS}. Aplikacja wyłącznie dla osób upoważnionych przez autorów.
        </p>
      </form>
    </div>
  );
}
