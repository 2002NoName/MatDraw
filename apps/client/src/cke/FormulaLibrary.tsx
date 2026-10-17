import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CKE_SECTIONS, CKE_SOURCE_NOTE, searchFormulas, type CkeFormula } from './formulas';
import { renderLatex } from '../board/render';
import { CKE_INFO } from './formulaInfo';

export type LevelFilter = 'all' | 'basic' | 'ext';

/** Tekst z wstawkami matematycznymi `$…$` (KaTeX, tryb inline). */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('$').map((part, i) =>
        i % 2 === 1 ? <span key={i} className="cke-math" dangerouslySetInnerHTML={{ __html: renderLatex(part, false) }} /> : part,
      )}
    </>
  );
}

function FormulaDetails({ id }: { id: string }) {
  const info = CKE_INFO[id];
  if (!info) return null;
  return (
    <div className="cke-info" id={`cke-info-${id}`}>
      <p>
        <strong>Co to jest? </strong>
        <RichText text={info.about} />
      </p>
      <p>
        <strong>Jak korzystać? </strong>
        <RichText text={info.use} />
      </p>
      <p className="cke-example">
        <strong>Przykład: </strong>
        <RichText text={info.example} />
      </p>
    </div>
  );
}

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
  const [infoOpen, setInfoOpen] = useState<Set<string>>(() => new Set());
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
    if ((e.target as HTMLElement).closest('button, .cke-info')) return;
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

  const toggleIn = (set: typeof setOpen) => (id: string) =>
    set((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggle = toggleIn(setOpen);
  const toggleInfo = toggleIn(setInfoOpen);

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
        <p className="muted small">
          {onInsert ? 'Przeciągnij wzór na tablicę lub kliknij „+”. „?” pokazuje opis i przykład.' : 'Kliknij wzór, aby zobaczyć opis, zastosowanie i przykład.'}
        </p>
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
                  {s.items.map((f) => {
                    const hasInfo = !!CKE_INFO[f.id];
                    const showInfo = hasInfo && infoOpen.has(f.id);
                    const clickToggles = !onInsert && hasInfo;
                    return (
                      <li
                        key={f.id}
                        className={`cke-item${onInsert ? ' draggable' : ''}${clickToggles ? ' expandable' : ''}${showInfo ? ' info-open' : ''}${drag?.active && drag.f.id === f.id ? ' dragging' : ''}`}
                        onPointerDown={onItemDown(f)}
                        onPointerMove={onItemMove}
                        onPointerUp={onItemUp}
                        onPointerCancel={() => update(null)}
                        onClick={
                          clickToggles
                            ? (e) => {
                                if ((e.target as HTMLElement).closest('button, .cke-info')) return;
                                toggleInfo(f.id);
                              }
                            : undefined
                        }
                      >
                        <div className="cke-item-head">
                          <span>
                            {f.title}
                            {f.ext && <span className="badge ext" title="Poziom rozszerzony">R</span>}
                          </span>
                          <span className="cke-item-actions">
                            {hasInfo && (
                              <button
                                type="button"
                                className={`cke-info-btn${showInfo ? ' active' : ''}`}
                                title={showInfo ? 'Ukryj opis' : 'Pokaż opis i przykład'}
                                aria-label={`${showInfo ? 'Ukryj' : 'Pokaż'} opis: ${f.title}`}
                                aria-expanded={showInfo}
                                aria-controls={`cke-info-${f.id}`}
                                onClick={() => toggleInfo(f.id)}
                              >
                                {onInsert ? '?' : showInfo ? '▴ Opis' : '▾ Opis'}
                              </button>
                            )}
                            {onInsert && (
                              <button type="button" className="cke-add" title="Wstaw na środek tablicy" aria-label={`Wstaw: ${f.title}`} onClick={() => onInsert(f)}>
                                +
                              </button>
                            )}
                          </span>
                        </div>
                        <div className="cke-preview" dangerouslySetInnerHTML={{ __html: renderLatex(f.latex) }} />
                        {showInfo && <FormulaDetails id={f.id} />}
                      </li>
                    );
                  })}
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
