import { FormulaLibrary } from '../cke/FormulaLibrary';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';

/** Tablice wzorów maturalnych CKE – dostępne dla wszystkich zalogowanych użytkowników. */
export function FormulasPage() {
  return (
    <div className="page formulas-page">
      <AppHeader />
      <main>
        <FormulaLibrary variant="page" />
      </main>
      <AppFooter />
    </div>
  );
}
