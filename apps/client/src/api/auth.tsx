import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, PublicUser } from '@matdraw/shared';
import { api, setUnauthorizedHandler, tokenStore } from './client';

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  signIn(res: AuthResponse): void;
  signOut(): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const signIn = useCallback((res: AuthResponse) => {
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!tokenStore.get()) return;
    api
      .me()
      .then(setUser)
      .catch(() => {
        /* 401 obsłużone przez handler; przy braku sieci zostajemy na ekranie logowania */
      })
      .finally(() => setLoading(false));
  }, [signOut]);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth poza AuthProvider');
  return ctx;
}
