import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './api/auth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BoardPage } from './pages/BoardPage';
import { FormulasPage } from './pages/FormulasPage';
import { AccountPage } from './pages/AccountPage';
import { DevPage } from './pages/DevPage';
import { DialogProvider } from './components/dialogs';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Ładowanie…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <DialogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/board/:id"
            element={
              <RequireAuth>
                <BoardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/wzory"
            element={
              <RequireAuth>
                <FormulasPage />
              </RequireAuth>
            }
          />
          <Route
            path="/konto"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dev"
            element={
              <RequireAuth>
                <DevPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  );
}
