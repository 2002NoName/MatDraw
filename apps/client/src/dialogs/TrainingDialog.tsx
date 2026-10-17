import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Modal } from '../components/Modal';
import { TRAINABLE_SYMBOLS } from '../recognition/glyphs';
import type { Pt } from '../recognition/pdollar';
import { addUserSample, clearUserSamples, loadUserSamples } from '../recognition/userTemplates';
import { renderLatex } from '../board/render';

const display = (s: string) => (s === '\\sqrt' ? '\\sqrt{\\ }' : s);

function countSamples() {
  const c: Record<string, number> = {};
  for (const s of loadUserSamples()) c[s.symbol] = (c[s.symbol] ?? 0) + 1;
  return c;
}

/** Nauka pisma: użytkownik rysuje wybrany znak, próbki trafiają do lokalnych wzorców (localStorage). */
export function TrainingDialog({ onClose }: { onClose(): void }) {
  const [symbol, setSymbol] = useState(TRAINABLE_SYMBOLS[0]!);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [counts, setCounts] = useState(countSamples);
  const drawing = useRef<Pt[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const point = (e: ReactPointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 300, y: ((e.clientY - r.top) / r.height) * 300 };
  };

  const save = () => {
    if (!strokes.length) return;
    addUserSample({ symbol, strokes });
    setStrokes([]);
    setCounts(countSamples());
  };

  return (
    <Modal title="Nauka pisma odręcznego" onClose={onClose} wide>
      <p className="muted">
        Wybierz znak i napisz go w polu poniżej tak, jak zwykle piszesz. Zapisz 3–5 próbek każdego znaku, który jest źle rozpoznawany. Próbki są
        przechowywane tylko na tym urządzeniu.
      </p>
      <div className="chips">
        {TRAINABLE_SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${s === symbol ? ' active' : ''}`}
            onClick={() => {
              setSymbol(s);
              setStrokes([]);
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: renderLatex(display(s), false) }} />
            {counts[s] ? <sup> {counts[s]}</sup> : null}
          </button>
        ))}
      </div>
      <div className="training-row">
        <svg
          ref={svgRef}
          className="training-pad"
          viewBox="0 0 300 300"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = [point(e)];
            setStrokes((s) => [...s, [...drawing.current!]]);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            drawing.current.push(point(e));
            const cur = [...drawing.current];
            setStrokes((s) => [...s.slice(0, -1), cur]);
          }}
          onPointerUp={() => (drawing.current = null)}
          onPointerCancel={() => (drawing.current = null)}
        >
          <line x1={0} y1={150} x2={300} y2={150} stroke="#e9ecef" />
          {strokes.map((s, i) => (
            <polyline
              key={i}
              points={s.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#212529"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <div className="stack">
          <div className="training-target" dangerouslySetInnerHTML={{ __html: renderLatex(display(symbol)) }} />
          <button className="primary" disabled={!strokes.length} onClick={save}>
            Zapisz próbkę
          </button>
          <button disabled={!strokes.length} onClick={() => setStrokes([])}>
            Wyczyść pole
          </button>
          <button
            className="danger"
            onClick={() => {
              if (confirm('Usunąć wszystkie zapisane próbki pisma?')) {
                clearUserSamples();
                setCounts({});
              }
            }}
          >
            Usuń wszystkie próbki
          </button>
        </div>
      </div>
    </Modal>
  );
}
