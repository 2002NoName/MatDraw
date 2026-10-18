import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { MathfieldElement } from 'mathlive';
import { Modal } from '../components/Modal';
import { renderLatex } from '../board/render';
import { recognize } from '../recognition/recognizer';
import type { Pt } from '../recognition/pdollar';
import { allTemplates } from '../recognition/userTemplates';

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

function HandwritingInput({ value, onChange }: { value: string; onChange(v: string): void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef<Pt[] | null>(null);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [message, setMessage] = useState('');

  const point = (event: ReactPointerEvent<SVGSVGElement>): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 700, y: ((event.clientY - rect.top) / rect.height) * 150 };
  };

  const finishStroke = () => {
    const stroke = drawingRef.current;
    if (!stroke) return;
    drawingRef.current = null;
    const nextStrokes = [...strokes, stroke];
    setStrokes(nextStrokes);
    const result = recognize(nextStrokes, allTemplates());
    if (result.latex) {
      onChange(result.latex);
      setMessage('');
    } else {
      setMessage('Nie udało się rozpoznać zapisu. Spróbuj napisać go wyraźniej.');
    }
  };

  return (
    <div className="formula-handwriting">
      <p className="muted small">Napisz wzór palcem, myszą lub rysikiem. Rozpoznany zapis pojawi się w podglądzie.</p>
      <svg
        ref={svgRef}
        className="formula-writing-pad"
        viewBox="0 0 700 150"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawingRef.current = [point(event)];
          setStrokes((current) => [...current, [...drawingRef.current!]]);
          setMessage('');
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          drawingRef.current.push(point(event));
          const currentStroke = [...drawingRef.current];
          setStrokes((current) => [...current.slice(0, -1), currentStroke]);
        }}
        onPointerUp={finishStroke}
        onPointerCancel={() => {
          drawingRef.current = null;
        }}
      >
        {strokes.map((stroke, index) => (
          <polyline
            key={index}
            points={stroke.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#212529"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="row between">
        <span className={message ? 'error small' : 'muted small'}>{message || (value ? 'Wzór rozpoznany — możesz go poprawić w edytorze matematycznym lub LaTeX.' : '')}</span>
        <button type="button" disabled={!strokes.length} onClick={() => { setStrokes([]); setMessage(''); }}>
          Wyczyść pismo
        </button>
      </div>
      <div className="formula-preview formula-recognition-preview" aria-label="Podgląd rozpoznanego wzoru">
        {value ? <span dangerouslySetInnerHTML={{ __html: renderLatex(value) }} /> : <span className="muted small">Podgląd rozpoznanego wzoru</span>}
      </div>
    </div>
  );
}

export function LatexInput({ value, onChange, autoFocus }: { value: string; onChange(v: string): void; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const visualHostRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const onChangeRef = useRef(onChange);
  const [mode, setMode] = useState<'visual' | 'handwriting' | 'latex'>('visual');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const mathfield = new MathfieldElement();
    mathfield.value = value;
    mathfield.mathVirtualKeyboardPolicy = 'auto';
    mathfield.setAttribute('aria-label', 'Wpisz wzór matematyczny');
    const handleInput = () => onChangeRef.current(mathfield.value);
    mathfield.addEventListener('input', handleInput);
    visualHostRef.current?.replaceChildren(mathfield);
    mathfieldRef.current = mathfield;
    if (autoFocus) mathfield.focus();
    return () => {
      mathfield.removeEventListener('input', handleInput);
      mathfield.remove();
      mathfieldRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mathfield = mathfieldRef.current;
    if (mathfield && mathfield.value !== value) mathfield.value = value;
  }, [value]);

  useEffect(() => {
    const host = visualHostRef.current;
    const mathfield = mathfieldRef.current;
    if (mode === 'visual' && host && mathfield && !host.contains(mathfield)) {
      host.appendChild(mathfield);
    }
  }, [mode]);

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
      <div className="segmented formula-input-modes" aria-label="Sposób wprowadzania wzoru">
        <button type="button" className={mode === 'visual' ? 'active' : ''} aria-pressed={mode === 'visual'} onClick={() => setMode('visual')}>
          Edytor
        </button>
        <button type="button" className={mode === 'handwriting' ? 'active' : ''} aria-pressed={mode === 'handwriting'} onClick={() => setMode('handwriting')}>
          Pismo odręczne
        </button>
        <button type="button" className={mode === 'latex' ? 'active' : ''} aria-pressed={mode === 'latex'} onClick={() => setMode('latex')}>
          LaTeX
        </button>
      </div>
      <div
        ref={visualHostRef}
        className="formula-preview formula-mathfield"
        style={{ display: mode === 'visual' ? undefined : 'none' }}
        aria-hidden={mode !== 'visual'}
      />
      {mode === 'handwriting' && <HandwritingInput value={value} onChange={onChange} />}
      {mode === 'latex' && (
        <>
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
        </>
      )}
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
  return (
    <Modal title="Wzór matematyczny" onClose={onClose} wide>
      <LatexInput value={latex} onChange={setLatex} autoFocus />
      <div className="dialog-actions">
        <button onClick={onClose}>Anuluj</button>
        <button className="primary" disabled={!latex.trim()} onClick={() => onSave(latex.trim(), initialSize)}>
          Zapisz
        </button>
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
