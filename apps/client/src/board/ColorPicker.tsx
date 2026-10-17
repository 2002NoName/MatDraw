import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Modal } from '../components/Modal';
import { hexToHsv, hsvToHex, loadRecentColors, normalizeHex, pushRecentColor, type Hsv } from './color';

/** Rozszerzona paleta – odcienie dobrze widoczne na białej i kratkowanej tablicy. */
export const EXTENDED_PALETTE = [
  '#000000', '#495057', '#868e96', '#ced4da',
  '#c92a2a', '#e03131', '#f76707', '#f59f00',
  '#fab005', '#5c940d', '#2f9e44', '#0ca678',
  '#1098ad', '#1c7ed6', '#1864ab', '#4263eb',
  '#7048e8', '#9c36b5', '#c2255c', '#e64980',
  '#845ef7', '#d9480f', '#795548', '#ffffff',
];

/** Przeciąganie wskaźnikiem (mysz, pióro, palec) wewnątrz prostokąta – zwraca pozycję 0–1. */
function useDrag(onMove: (fx: number, fy: number) => void) {
  const el = useRef<HTMLDivElement>(null);
  const at = (e: ReactPointerEvent) => {
    const r = el.current!.getBoundingClientRect();
    onMove(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  return {
    ref: el,
    onPointerDown: (e: ReactPointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      at(e);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) at(e);
    },
  };
}

/** Okno wyboru własnego koloru (zamiast systemowego `<input type="color">`). */
export function ColorPickerDialog({ initial, onPick, onClose }: { initial: string; onPick(color: string): void; onClose(): void }) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(normalizeHex(initial) ?? '#212529'));
  const hex = hsvToHex(hsv);
  const [text, setText] = useState(hex);
  const [recent] = useState(loadRecentColors);
  const original = normalizeHex(initial) ?? '#212529';

  const set = (next: Hsv) => {
    setHsv(next);
    setText(hsvToHex(next));
  };
  const setHex = (c: string) => {
    const n = normalizeHex(c);
    if (!n) return;
    // Zachowaj odcień przy kolorach bez nasycenia (szarości), aby suwak nie skakał na czerwień.
    const v = hexToHsv(n);
    set(v.s === 0 || v.v === 0 ? { ...v, h: hsv.h } : v);
  };

  const sv = useDrag((fx, fy) => set({ ...hsv, s: fx, v: 1 - fy }));
  const hue = useDrag((fx) => set({ ...hsv, h: fx * 360 }));

  const svKeys = (e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    set({ ...hsv, s: Math.min(1, Math.max(0, hsv.s + m[0])), v: Math.min(1, Math.max(0, hsv.v + m[1])) });
  };
  const hueKeys = (e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 30 : 5;
    const m = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : 0;
    if (!m) return;
    e.preventDefault();
    set({ ...hsv, h: (hsv.h + m + 360) % 360 });
  };

  const confirm = () => {
    pushRecentColor(hex);
    onPick(hex);
    onClose();
  };

  const swatches = (list: string[], label: string) => (
    <div className="cp-swatches" role="listbox" aria-label={label}>
      {list.map((c) => (
        <button
          key={c}
          type="button"
          role="option"
          aria-selected={c === hex}
          className={`swatch${c === hex ? ' active' : ''}`}
          style={{ background: c }}
          title={c}
          aria-label={c}
          onClick={() => setHex(c)}
          onDoubleClick={() => {
            pushRecentColor(c);
            onPick(c);
            onClose();
          }}
        />
      ))}
    </div>
  );

  return (
    <Modal title="Własny kolor" onClose={onClose} className="dialog color-picker">
      <div
        className="cp-sv"
        {...sv}
        style={{ background: `hsl(${hsv.h} 100% 50%)` }}
        tabIndex={0}
        role="slider"
        aria-label="Nasycenie i jasność"
        aria-valuetext={`nasycenie ${Math.round(hsv.s * 100)}%, jasność ${Math.round(hsv.v * 100)}%`}
        onKeyDown={svKeys}
      >
        <div className="cp-thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
      </div>
      <div
        className="cp-hue"
        {...hue}
        tabIndex={0}
        role="slider"
        aria-label="Odcień"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={hueKeys}
      >
        <div className="cp-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, top: '50%', background: `hsl(${hsv.h} 100% 50%)` }} />
      </div>

      <div className="cp-row">
        <div className="cp-compare" title="Poprzedni / nowy kolor">
          <button type="button" style={{ background: original }} onClick={() => setHex(original)} aria-label={`Przywróć ${original}`} />
          <span style={{ background: hex }} />
        </div>
        <label className="cp-hex">
          <span>HEX</span>
          <input
            value={text}
            maxLength={7}
            spellCheck={false}
            aria-invalid={!normalizeHex(text)}
            onChange={(e) => {
              setText(e.target.value);
              const n = normalizeHex(e.target.value);
              if (n && e.target.value.replace('#', '').length === 6) setHex(n);
            }}
            onBlur={() => (normalizeHex(text) ? setHex(text) : setText(hex))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (normalizeHex(text)) {
                  setHex(text);
                  const n = normalizeHex(text)!;
                  pushRecentColor(n);
                  onPick(n);
                  onClose();
                }
              }
            }}
          />
        </label>
      </div>

      <div className="cp-label">Paleta</div>
      {swatches(EXTENDED_PALETTE, 'Paleta')}
      {recent.length > 0 && (
        <>
          <div className="cp-label">Ostatnio używane</div>
          {swatches(recent, 'Ostatnio używane')}
        </>
      )}

      <div className="dialog-actions">
        <button type="button" onClick={onClose}>
          Anuluj
        </button>
        <button type="button" className="primary" onClick={confirm}>
          Wybierz
        </button>
      </div>
    </Modal>
  );
}
