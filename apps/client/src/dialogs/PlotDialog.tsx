import { useMemo, useState, type ChangeEvent } from 'react';
import { Modal } from '../components/Modal';
import { compileExpression, plotPath } from '../math/expr';

export interface PlotParams {
  expr: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const EXAMPLES = ['x^2 - 2x - 3', '2x + 1', 'sin(x)', '1/x', 'sqrt(x)', 'abs(x - 1)', '2^x', 'log(x)'];

type Parsed = { vals: Omit<PlotParams, 'expr'>; d: string } | { error: string };

export function PlotDialog({ initial, onSave, onClose }: { initial: PlotParams; onSave(p: PlotParams): void; onClose(): void }) {
  const [p, setP] = useState(() => ({
    expr: initial.expr,
    xMin: String(initial.xMin),
    xMax: String(initial.xMax),
    yMin: String(initial.yMin),
    yMax: String(initial.yMax),
  }));
  const parsed = useMemo<Parsed>(() => {
    const num = (s: string) => Number(s.trim().replace(',', '.'));
    const vals = { xMin: num(p.xMin), xMax: num(p.xMax), yMin: num(p.yMin), yMax: num(p.yMax) };
    if (Object.values(vals).some((v) => !Number.isFinite(v))) return { error: 'Zakresy muszą być liczbami' };
    if (vals.xMin >= vals.xMax || vals.yMin >= vals.yMax) return { error: 'Minimum musi być mniejsze od maksimum' };
    try {
      const f = compileExpression(p.expr);
      return { vals, d: plotPath(f, { x: 0, y: 0, w: 300, h: 200 }, vals, 300) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [p]);

  const set = (k: keyof typeof p) => (e: ChangeEvent<HTMLInputElement>) => setP((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Modal title="Wykres funkcji" onClose={onClose}>
      <label>
        y =
        <input className="mono" autoFocus value={p.expr} onChange={set('expr')} placeholder="np. x^2 - 3x + 2" autoCapitalize="off" autoCorrect="off" />
      </label>
      <div className="chips">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => setP((s) => ({ ...s, expr: ex }))}>
            {ex}
          </button>
        ))}
      </div>
      <p className="muted small">
        Dostępne: + − * / ^, nawiasy, sin, cos, tg, ctg, sqrt, abs, log (dziesiętny), ln, exp, pi, e. Znak mnożenia można pomijać: 2x, 3(x+1).
      </p>
      <div className="row">
        <label>
          x od
          <input inputMode="decimal" value={p.xMin} onChange={set('xMin')} />
        </label>
        <label>
          x do
          <input inputMode="decimal" value={p.xMax} onChange={set('xMax')} />
        </label>
        <label>
          y od
          <input inputMode="decimal" value={p.yMin} onChange={set('yMin')} />
        </label>
        <label>
          y do
          <input inputMode="decimal" value={p.yMax} onChange={set('yMax')} />
        </label>
      </div>
      <svg className="plot-preview" viewBox="0 0 300 200">
        <rect width={300} height={200} fill="#fff" stroke="#ced4da" />
        {'d' in parsed && <path d={parsed.d} fill="none" stroke="#1c7ed6" strokeWidth={2} />}
      </svg>
      {'error' in parsed && <div className="error">{parsed.error}</div>}
      <div className="row end">
        <button onClick={onClose}>Anuluj</button>
        <button className="primary" disabled={'error' in parsed} onClick={() => 'vals' in parsed && onSave({ expr: p.expr.trim(), ...parsed.vals })}>
          Zapisz
        </button>
      </div>
    </Modal>
  );
}
