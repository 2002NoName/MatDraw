import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './styles.css';
import { App } from './App';

// Usuwa service worker pozostały po dawnej wersji PWA, aby nie serwował nieaktualnych plików.
navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()), () => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
