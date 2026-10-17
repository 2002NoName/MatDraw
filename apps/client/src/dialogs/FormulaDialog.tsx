import { useRef, useState } from 'react';
import { Modal } from '../components/Modal';
import { renderLatex } from '../board/render';

interface PaletteItem {
  label: string;
  insert: string;
  /** Pozycja kursora względem początku wstawionego tekstu. */
  caret?: number;
}

const PALETTE: { group: string; items: PaletteItem[] }[] = [
  {
    group: 'Podstawowe',
    items: [
      { label: '\\frac{a}{b}', insert: '\\frac{}{}', caret: 6 },
      { label: 'x^{n}', insert: '^{}', caret: 2 },
      { label: 'x_{n}', insert: '_{}', caret: 2 },
      { label: '\\sqrt{x}', insert: '\\sqrt{}', caret: 6 },
      { label: '\\sqrt[n]{x}', insert: '\\sqrt[]{}', caret: 6 },
      { label: '\\left( x \\right)', insert: '\\left(  \\right)', caret: 7 },
      { label: '|x|', insert: '\\left|  \\right|', caret: 7 },
      { label: '\\cdot', insert: '\\cdot ' },
      { label: '\\times', insert: '\\times ' },
      { label: '\\div', insert: '\\div ' },
      { label: '\\pm', insert: '\\pm ' },
    ],
  },
  {
    group: 'Relacje',
    items: [
      { label: '\\neq', insert: '\\neq ' },
      { label: '\\leq', insert: '\\leq ' },
      { label: '\\geq', insert: '\\geq ' },
      { label: '\\approx', insert: '\\approx ' },
      { label: '\\equiv', insert: '\\equiv ' },
      { label: '\\in', insert: '\\in ' },
      { label: '\\subset', insert: '\\subset ' },
      { label: '\\Rightarrow', insert: '\\Rightarrow ' },
      { label: '\\Leftrightarrow', insert: '\\Leftrightarrow ' },
      { label: '\\perp', insert: '\\perp ' },
      { label: '\\parallel', insert: '\\parallel ' },
    ],
  },
  {
    group: 'Greckie',
    items: ['alpha', 'beta', 'gamma', 'delta', 'Delta', 'pi', 'theta', 'lambda', 'mu', 'sigma', 'phi', 'omega'].map((g) => ({
      label: `\\${g}`,
      insert: `\\${g} `,
    })),
  },
  {
    group: 'Analiza',
    items: [
      { label: '\\infty', insert: '\\infty ' },
      { label: '\\lim_{x \\to a}', insert: '\\lim_{x \\to } ', caret: 12 },
      { label: '\\sum_{i=1}^{n}', insert: '\\sum_{i=1}^{n} ' },
      { label: '\\int_{a}^{b}', insert: '\\int_{}^{} \\, dx', caret: 6 },
      { label: "f'(x)", insert: "f'(x)" },
      { label: '\\log_{a}', insert: '\\log_{} ', caret: 6 },
      { label: '\\sin', insert: '\\sin ' },
      { label: '\\cos', insert: '\\cos ' },
      { label: '\\operatorname{tg}', insert: '\\operatorname{tg} ' },
    ],
  },
  {
    group: 'Geometria / zbiory',
    items: [
      { label: '\\angle', insert: '\\angle ' },
      { label: '^{\\circ}', insert: '^{\\circ}' },
      { label: '\\triangle', insert: '\\triangle ' },
      { label: '\\vec{v}', insert: '\\vec{}', caret: 5 },
      { label: '\\overline{AB}', insert: '\\overline{}', caret: 10 },
      { label: '\\mathbb{R}', insert: '\\mathbb{R}' },
      { label: '\\cup', insert: '\\cup ' },
      { label: '\\cap', insert: '\\cap ' },
      { label: '\\emptyset', insert: '\\emptyset ' },
      { label: '\\begin{cases}', insert: '\\begin{cases}  \\\\  \\end{cases}', caret: 14 },
      { label: '\\begin{bmatrix}', insert: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
    ],
  },
];

const PALETTE_PREVIEW: Record<string, string> = {
  '\\begin{cases}': '\\begin{cases} a \\\\ b \\end{cases}',
  '\\begin{bmatrix}': '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
};

export function LatexInput({ value, onChange, autoFocus }: { value: string; onChange(v: string): void; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (item: PaletteItem) => {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + item.insert + value.slice(end));
    const caret = start + (item.caret ?? item.insert.length);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  };
  return (
    <div className="latex-input">
      <div className="formula-preview" dangerouslySetInnerHTML={{ __html: renderLatex(value) }} />
      <textarea
        ref={ref}
        className="mono"
        rows={3}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="np. \frac{1}{2}x^2 + \sqrt{3}"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="palette">
        {PALETTE.map((g) => (
          <div key={g.group} className="palette-group">
            <span className="muted small">{g.group}</span>
            <div className="palette-items">
              {g.items.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  className="palette-btn"
                  title={it.insert.trim()}
                  onClick={() => insert(it)}
                  dangerouslySetInnerHTML={{ __html: renderLatex(PALETTE_PREVIEW[it.label] ?? it.label, false) }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const FONT_SIZES = [16, 20, 24, 32, 40, 56, 72];

function SizeSelect({ value, onChange }: { value: number; onChange(v: number): void }) {
  return (
    <label className="row">
      Rozmiar
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {[...new Set([...FONT_SIZES, value])].sort((a, b) => a - b).map((s) => (
          <option key={s} value={s}>
            {Math.round(s)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormulaDialog({
  initial,
  initialSize,
  onSave,
  onClose,
}: {
  initial: string;
  initialSize: number;
  onSave(latex: string, fontSize: number): void;
  onClose(): void;
}) {
  const [latex, setLatex] = useState(initial);
  const [size, setSize] = useState(initialSize);
  return (
    <Modal title="Wzór matematyczny" onClose={onClose} wide>
      <LatexInput value={latex} onChange={setLatex} autoFocus />
      <div className="row between">
        <SizeSelect value={size} onChange={setSize} />
        <div className="row">
          <button onClick={onClose}>Anuluj</button>
          <button className="primary" disabled={!latex.trim()} onClick={() => onSave(latex.trim(), size)}>
            Zapisz
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function TextDialog({
  initial,
  initialSize,
  onSave,
  onClose,
}: {
  initial: string;
  initialSize: number;
  onSave(text: string, fontSize: number): void;
  onClose(): void;
}) {
  const [text, setText] = useState(initial);
  const [size, setSize] = useState(initialSize);
  return (
    <Modal title="Tekst" onClose={onClose}>
      <textarea rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row between">
        <SizeSelect value={size} onChange={setSize} />
        <div className="row">
          <button onClick={onClose}>Anuluj</button>
          <button className="primary" disabled={!text.trim()} onClick={() => onSave(text, size)}>
            Zapisz
          </button>
        </div>
      </div>
    </Modal>
  );
}
