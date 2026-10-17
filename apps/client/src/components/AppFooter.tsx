export const APP_AUTHORS = 'Michał Kozieński, Weblance.pl';

export function AppFooter() {
  return (
    <footer className="app-footer">
      MatDraw © {new Date().getFullYear()} {APP_AUTHORS}. Aplikacja wyłącznie dla osób upoważnionych przez autorów.
    </footer>
  );
}
