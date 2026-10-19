import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../api/auth';
import { Icon, type IconName } from './icons';

const LINKS: { to: string; label: string; icon: IconName; title: string }[] = [
  { to: '/', label: 'Tablice', icon: 'home', title: 'Moje tablice' },
  { to: '/wzory', label: 'Wzory', icon: 'book', title: 'Wzory maturalne CKE' },
  { to: '/dev', label: 'Diagnostyka', icon: 'activity', title: 'Diagnostyka połączeń' },
  { to: '/konto', label: 'Konto', icon: 'account', title: 'Ustawienia konta' },
];

export function AppHeader() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="topbar app-header">
      <Link to="/" className="brand">
        <img src="/icon.svg" alt="" width={28} height={28} /> <span>MatDraw</span>
      </Link>
      <nav id="app-mobile-menu" className={`app-nav${mobileMenuOpen ? ' mobile-open' : ''}`} aria-label="Menu główne">
        {LINKS.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} title={item.title} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button className="signout-button" onClick={signOut} title="Wyloguj się">
        <Icon name="logout" size={17} />
        <span>Wyloguj</span>
      </button>
      <button
        className={`mobile-menu-toggle${mobileMenuOpen ? ' open' : ''}`}
        type="button"
        aria-label={mobileMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls="app-mobile-menu"
        onClick={() => setMobileMenuOpen((open) => !open)}
      >
        <span className="mobile-menu-bars" aria-hidden="true" />
      </button>
    </header>
  );
}
