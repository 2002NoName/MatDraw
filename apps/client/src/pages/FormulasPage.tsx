import { Link } from 'react-router-dom';
import { FormulaLibrary } from '../cke/FormulaLibrary';
import { AppFooter } from '../components/AppFooter';

/** Tablice wzorów maturalnych CKE – dostępne dla wszystkich zalogowanych użytkowników. */
export function FormulasPage() {
  return (
    <div className="page formulas-page">
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} /> MatDraw
        </Link>
        <div className="spacer" />
        <Link to="/">← Moje tablice</Link>
      </header>
      <main>
        <FormulaLibrary variant="page" />
      </main>
      <AppFooter />
    </div>
  );
}
