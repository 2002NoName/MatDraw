import { useState } from 'react';
import { Modal } from '../components/Modal';
import type { RecognitionResult } from '../recognition/recognizer';
import { LatexInput } from './FormulaDialog';

export function RecognizeDialog({
  result,
  onInsert,
  onTrain,
  onClose,
}: {
  result: RecognitionResult;
  onInsert(latex: string, removeStrokes: boolean): void;
  onTrain(): void;
  onClose(): void;
}) {
  const [latex, setLatex] = useState(result.latex);
  const [remove, setRemove] = useState(true);
  const uncertain = result.symbols.some((s) => s.confidence < 0.45);
  return (
    <Modal title="Rozpoznany wzór" onClose={onClose} wide>
      {!result.latex && <div className="error">Nie udało się rozpoznać pisma. Wpisz wzór ręcznie lub naucz aplikację swojego pisma.</div>}
      {result.symbols.length > 0 && (
        <div className="recognized-symbols">
          <span className="muted small">Rozpoznane znaki (przytrzymaj / najedź, aby zobaczyć alternatywy):</span>
          <div className="chips">
            {result.symbols.map((s, i) => (
              <span key={i} className={`chip${s.confidence < 0.45 ? ' warn' : ''}`} title={s.alternatives.length ? `Alternatywy: ${s.alternatives.join(', ')}` : ''}>
                {s.latex}
              </span>
            ))}
          </div>
          {uncertain && <p className="muted small">Znaki oznaczone na pomarańczowo rozpoznano z niską pewnością – sprawdź wynik.</p>}
        </div>
      )}
      <LatexInput value={latex} onChange={setLatex} autoFocus />
      <div className="row between">
        <div className="row">
          <label className="checkbox">
            <input type="checkbox" checked={remove} onChange={(e) => setRemove(e.target.checked)} />
            Usuń odręczne pismo
          </label>
          <button type="button" className="link-button" onClick={onTrain}>
            Naucz moje pismo…
          </button>
        </div>
        <div className="row">
          <button onClick={onClose}>Anuluj</button>
          <button className="primary" disabled={!latex.trim()} onClick={() => onInsert(latex.trim(), remove)}>
            Wstaw wzór
          </button>
        </div>
      </div>
    </Modal>
  );
}
