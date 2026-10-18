import type { BoardBackground, Shape2DKind, Solid3DKind } from '@matdraw/shared';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton, type IconName } from '../components/icons';
import { ColorPickerDialog } from './ColorPicker';
import { SOLID_LABELS } from './solids';

export type Tool = 'select' | 'pan' | 'pen' | 'highlighter' | 'eraser' | 'shape' | 'solid' | 'text' | 'formula' | 'plot' | 'recognize';

export interface ToolOptions {
  color: string;
  penSize: number;
  highlighterSize: number;
  shape: Shape2DKind;
  solid: Solid3DKind;
  fill: boolean;
  /** Palce przesuwają widok, rysuje tylko pióro (odrzucanie dłoni). */
  penOnly: boolean;
}

export const COLORS = ['#212529', '#1c7ed6', '#e03131', '#2f9e44', '#f08c00', '#9c36b5', '#868e96'];
export const PEN_SIZES = [2.5, 4, 8];
export const HIGHLIGHTER_SIZES = [16, 28];

export function cycleValue<T>(values: readonly T[], current: T): T {
  if (values.length === 0) return current;
  return values[(values.indexOf(current) + 1 + values.length) % values.length]!;
}

export const SHAPE_LABELS: Record<Shape2DKind, string> = {
  line: 'Odcinek',
  arrow: 'Strzałka',
  rect: 'Prostokąt',
  ellipse: 'Elipsa / okrąg',
  triangle: 'Trójkąt',
  rightTriangle: 'Trójkąt prostokątny',
  rhombus: 'Romb',
  hexagon: 'Sześciokąt',
  axes: 'Układ współrzędnych',
};

const BACKGROUNDS: { value: BoardBackground; label: string; icon: IconName }[] = [
  { value: 'blank', label: 'Gładkie', icon: 'backgroundBlank' },
  { value: 'grid', label: 'Kratka', icon: 'backgroundGrid' },
  { value: 'dots', label: 'Kropki', icon: 'backgroundDots' },
];

const TOOLS: { tool: Tool; icon: IconName; label: string; edit: boolean }[] = [
  { tool: 'select', icon: 'select', label: 'Zaznaczanie i przesuwanie (V)', edit: true },
  { tool: 'pan', icon: 'pan', label: 'Przesuwanie widoku (H; lub Spacja + przeciągnięcie)', edit: false },
  { tool: 'pen', icon: 'pen', label: 'Pióro (P)', edit: true },
  { tool: 'highlighter', icon: 'highlighter', label: 'Zakreślacz', edit: true },
  { tool: 'eraser', icon: 'eraser', label: 'Gumka (E)', edit: true },
  { tool: 'shape', icon: 'shape', label: 'Figury 2D (S; R prostokąt, O elipsa, L strzałka; ponownie S: kolejna figura)', edit: true },
  { tool: 'solid', icon: 'solid', label: 'Bryły 3D (B; ponownie B: kolejna bryła)', edit: true },
  { tool: 'formula', icon: 'formula', label: 'Wzór matematyczny (LaTeX)', edit: true },
  { tool: 'recognize', icon: 'recognize', label: 'Rozpoznaj pismo: zaznacz odręczny zapis', edit: true },
  { tool: 'text', icon: 'text', label: 'Tekst (T)', edit: true },
  { tool: 'plot', icon: 'plot', label: 'Wykres funkcji', edit: true },
];

export function ToolRail({
  tool,
  activateTool,
  readOnly,
  onImage,
  libraryOpen,
  onLibrary,
}: {
  tool: Tool;
  activateTool(t: Tool): void;
  readOnly: boolean;
  onImage(): void;
  libraryOpen: boolean;
  onLibrary(): void;
}) {
  return (
    <div className="tool-rail" role="toolbar" aria-label="Narzędzia" onPointerDown={(e) => e.stopPropagation()}>
      {TOOLS.filter((t) => !readOnly || !t.edit).map((t) => (
        <IconButton key={t.tool} icon={t.icon} label={t.label} active={tool === t.tool} onClick={() => activateTool(t.tool)} />
      ))}
      <div className="rail-sep" />
      {!readOnly && <IconButton icon="image" label="Wstaw obraz (także Ctrl+V lub przeciągnij plik)" onClick={onImage} />}
      <IconButton icon="book" label="Wzory maturalne CKE" active={libraryOpen} onClick={onLibrary} />
    </div>
  );
}

export function OptionsBar({
  tool,
  opts,
  setOpts,
  onColor,
  background,
  setBackground,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTrain,
  onClear,
  readOnly,
}: {
  tool: Tool;
  opts: ToolOptions;
  setOpts(o: Partial<ToolOptions>): void;
  onColor(c: string): void;
  background: BoardBackground;
  setBackground(b: BoardBackground): void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  onTrain(): void;
  onClear(): void;
  readOnly: boolean;
}) {
  const showColor = !readOnly && tool !== 'pan' && tool !== 'eraser' && tool !== 'recognize';
  const [picker, setPicker] = useState(false);
  return (
    <div className="options-bar" onPointerDown={(e) => e.stopPropagation()}>
      {!readOnly && (
        <div className="group">
          <IconButton icon="undo" label="Cofnij (Ctrl+Z)" disabled={!canUndo} onClick={onUndo} />
          <IconButton icon="redo" label="Ponów (Ctrl+Y)" disabled={!canRedo} onClick={onRedo} />
        </div>
      )}
      {showColor && (
        <div className="group" role="radiogroup" aria-label="Kolor">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${opts.color === c ? ' active' : ''}`}
              style={{ background: c }}
              aria-label={`Kolor ${c}`}
              onClick={() => onColor(c)}
            />
          ))}
          <button
            type="button"
            className={`swatch custom${COLORS.includes(opts.color) ? '' : ' active'}`}
            title="Własny kolor…"
            aria-label="Własny kolor"
            style={{ background: COLORS.includes(opts.color) ? undefined : opts.color }}
            onClick={() => setPicker(true)}
          />
          {picker &&
            createPortal(<ColorPickerDialog initial={opts.color} onPick={onColor} onClose={() => setPicker(false)} />, document.body)}
        </div>
      )}
      {tool === 'pen' && (
        <div className="group">
          {PEN_SIZES.map((s) => (
            <button key={s} type="button" className={`size-btn${opts.penSize === s ? ' active' : ''}`} onClick={() => setOpts({ penSize: s })} aria-label={`Grubość ${s}`}>
              <span style={{ width: s * 1.6 + 2, height: s * 1.6 + 2 }} />
            </button>
          ))}
        </div>
      )}
      {tool === 'highlighter' && (
        <div className="group">
          {HIGHLIGHTER_SIZES.map((s) => (
            <button key={s} type="button" className={`size-btn${opts.highlighterSize === s ? ' active' : ''}`} onClick={() => setOpts({ highlighterSize: s })}>
              <span style={{ width: s / 2, height: s / 2, borderRadius: 3 }} />
            </button>
          ))}
        </div>
      )}
      {tool === 'shape' && (
        <div className="group">
          <select value={opts.shape} onChange={(e) => setOpts({ shape: e.target.value as Shape2DKind })} aria-label="Figura">
            {Object.entries(SHAPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={opts.fill} onChange={(e) => setOpts({ fill: e.target.checked })} />
            wypełnienie
          </label>
        </div>
      )}
      {tool === 'solid' && (
        <div className="group">
          <select value={opts.solid} onChange={(e) => setOpts({ solid: e.target.value as Solid3DKind })} aria-label="Bryła">
            {Object.entries(SOLID_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}
      {tool === 'recognize' && (
        <div className="group">
          <span className="muted small">Zaznacz prostokątem odręcznie napisany wzór</span>
          <IconButton icon="train" label="Naucz moje pismo" onClick={onTrain} />
        </div>
      )}
      <div className="group">
        <IconButton
          icon="penOnly"
          label={`Tylko rysik — ${opts.penOnly ? 'włączone' : 'wyłączone'} (palce przesuwają i powiększają widok)`}
          active={opts.penOnly}
          onClick={() => setOpts({ penOnly: !opts.penOnly })}
        />
        {!readOnly && (
          <>
            <div className="group" role="group" aria-label="Tło tablicy">
              {BACKGROUNDS.map((bg) => (
                <IconButton key={bg.value} icon={bg.icon} label={`Tło: ${bg.label}`} active={background === bg.value} onClick={() => setBackground(bg.value)} />
              ))}
            </div>
            <IconButton icon="trash" label="Wyczyść tablicę" onClick={onClear} />
          </>
        )}
      </div>
    </div>
  );
}
