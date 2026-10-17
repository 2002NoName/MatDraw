import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CKE_SECTIONS, CKE_SOURCE_NOTE, searchFormulas, type CkeFormula } from './formulas';
import { renderLatex } from '../board/render';

export type LevelFilter = 'all' | 'basic' | 'ext';

interface DragState {
  f: CkeFormula;
  pointerId: number;
  start: { x: number; y: number };
  x: number;
  y: number;
  active: boolean;
  overBoard: boolean;
}

const DRAG_THRESHOLD = 6;

const boardAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('.board-surface') ?? null;

/**
 * Tablice wzorów maturalnych CKE. Wzór można przeciągnąć na tablicę (mysz, pióro, palec – ruch w poziomie)
 * albo wstawić przyciskiem „+”. Bez `onInsert` panel działa w trybie tylko do przeglądania.
 */
export function FormulaLibrary({
  onInsert,
  onClose,
  variant = 'panel',
}: {
  onInsert?: (f: CkeFormula, at?: { clientX: number; clientY: number }) => void;
  onClose?: () => void;
  variant?: 'panel' | 'page';
}) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [open, setOpen] = useState<Set<string>>(() => new Set(variant === 'page' ? CKE_SECTIONS.map((s) => s.id) : [CKE_SECTIONS[0]!.id]));
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const sections = useMemo(() => {
    const byLevel = CKE_SECTIONS.map((s) => ({ ...s, items: s.items.filter((f) => level === 'all' || (level === 'ext' ? f.ext : !f.ext)) })).filter(
      (s) => s.items.length,
    );
    return searchFormulas(query, byLevel);
  }, [query, level]);
  const searching = query.trim().length > 0;

  const update = (d: DragState | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  const onItemDown = (f: CkeFormula) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!onInsert || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    update({ f, pointerId: e.pointerId, start: { x: e.clientX, y: e.clientY }, x: e.clientX, y: e.clientY, active: false, overBoard: false });
  };
  const onItemMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const active = d.active || Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) > DRAG_THRESHOLD;
    update({ ...d, x: e.clientX, y: e.clientY, active, overBoard: active && !!boardAt(e.clientX, e.clientY) });
  };
  const onItemUp = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    update(null);
    if (d.active && boardAt(e.clientX, e.clientY)) onInsert?.(d.f, { clientX: e.clientX, clientY: e.clientY });
  };

  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <aside className={`cke-library ${variant}`} onPointerDown={(e) => e.stopPropagation()} aria-label="Wzory maturalne CKE">
      <header>
        <div className="cke-title">
          <strong>Wzory maturalne CKE</strong>
          {onClose && (
            <button type="button" className="icon-close" onClick={onClose} aria-label="Zamknij panel wzorów" title="Zamknij">
              ×
            </button>
          )}
        </div>
        <input type="search" placeholder="Szukaj wzoru, np. delta, stożek, sinus…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="cke-levels" role="radiogroup" aria-label="Poziom">
          {(
            [
              ['all', 'Wszystkie'],
              ['basic', 'Podstawowy'],
              ['ext', 'Tylko rozszerzony'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={level === v} className={level === v ? 'active' : ''} onClick={() => setLevel(v)}>
              {label}
            </button>
          ))}
        </div>
        {onInsert && <p className="muted small">Przeciągnij wzór na tablicę lub kliknij „+”.</p>}
      </header>
      <div className="cke-list">
        {sections.length === 0 && <p className="muted">Brak wzorów pasujących do wyszukiwania.</p>}
        {sections.map((s) => {
          const expanded = searching || open.has(s.id);
          return (
            <section key={s.id}>
              <button type="button" className="cke-section" aria-expanded={expanded} onClick={() => toggle(s.id)}>
                <span>{expanded ? '▾' : '▸'}</span> {s.title}
              </button>
              {expanded && (
                <ul>
                  {s.items.map((f) => (
                    <li
                      key={f.id}
                      className={`cke-item${onInsert ? ' draggable' : ''}${drag?.active && drag.f.id === f.id ? ' dragging' : ''}`}
                      onPointerDown={onItemDown(f)}
                      onPointerMove={onItemMove}
                      onPointerUp={onItemUp}
                      onPointerCancel={() => update(null)}
                    >
                      <div className="cke-item-head">
                        <span>
                          {f.title}
                          {f.ext && <span className="badge ext" title="Poziom rozszerzony">R</span>}
                        </span>
                        {onInsert && (
                          <button type="button" className="cke-add" title="Wstaw na środek tablicy" aria-label={`Wstaw: ${f.title}`} onClick={() => onInsert(f)}>
                            +
                          </button>
                        )}
                      </div>
                      <div className="cke-preview" dangerouslySetInnerHTML={{ __html: renderLatex(f.latex) }} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        <p className="muted small cke-note">{CKE_SOURCE_NOTE}</p>
      </div>
      {drag?.active && (
        <div className={`cke-ghost${drag.overBoard ? ' over' : ''}`} style={{ transform: `translate(${drag.x + 12}px, ${drag.y + 12}px)` }}>
          <div className="small">{drag.f.title}</div>
          <div dangerouslySetInnerHTML={{ __html: renderLatex(drag.f.latex) }} />
        </div>
      )}
    </aside>
  );
}
