import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import { getStroke } from 'perfect-freehand';
import type { BoardElement, FormulaElement, ImageElement, PlotElement, ShapeElement, SolidElement, StrokeElement, StrokeTool, TextElement } from '@matdraw/shared';
import { normRect } from './geometry';
import { projectSolid } from './solids';
import { compileExpression, plotPath } from '../math/expr';
import { CKE_MACROS } from '../cke/formulas';

const avg = (a: number, b: number) => (a + b) / 2;

function pathFromOutline(points: number[][]): string {
  const len = points.length;
  if (len < 4) return '';
  let a = points[0]!;
  let b = points[1]!;
  const c = points[2]!;
  let d = `M${a[0]!.toFixed(2)},${a[1]!.toFixed(2)} Q${b[0]!.toFixed(2)},${b[1]!.toFixed(2)} ${avg(b[0]!, c[0]!).toFixed(2)},${avg(b[1]!, c[1]!).toFixed(2)} T`;
  for (let i = 2; i < len - 1; i++) {
    a = points[i]!;
    b = points[i + 1]!;
    d += `${avg(a[0]!, b[0]!).toFixed(2)},${avg(a[1]!, b[1]!).toFixed(2)} `;
  }
  return d + 'Z';
}

/** Kontur kreski (z uwzględnieniem nacisku pióra) jako ścieżka SVG. */
export function strokePath(points: number[], size: number, tool: StrokeTool, complete = true): string {
  const input: number[][] = [];
  for (let i = 0; i < points.length; i += 3) input.push([points[i]!, points[i + 1]!, points[i + 2] ?? 0.5]);
  const outline = getStroke(input, {
    size,
    thinning: tool === 'highlighter' ? 0 : 0.6,
    smoothing: 0.5,
    streamline: 0.35,
    simulatePressure: false,
    last: complete,
    start: { cap: true },
    end: { cap: true },
  });
  return pathFromOutline(outline);
}

export function StrokeView({ el }: { el: Pick<StrokeElement, 'points' | 'size' | 'tool' | 'color'> & { complete?: boolean } }) {
  const d = useMemo(() => strokePath(el.points, el.size, el.tool, el.complete ?? true), [el.points, el.size, el.tool, el.complete]);
  return <path d={d} fill={el.color} opacity={el.tool === 'highlighter' ? 0.35 : 1} />;
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + Math.PI - 0.45;
  const a2 = ang + Math.PI + 0.45;
  return `M${x2 + Math.cos(a1) * size} ${y2 + Math.sin(a1) * size} L${x2} ${y2} L${x2 + Math.cos(a2) * size} ${y2 + Math.sin(a2) * size}`;
}

function polygon(pts: [number, number][]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + ' Z';
}

export function ShapeView({ el }: { el: ShapeElement }) {
  const common = {
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    fill: el.fill ?? 'none',
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };
  if (el.kind === 'line' || el.kind === 'arrow') {
    const x2 = el.x + el.w;
    const y2 = el.y + el.h;
    return (
      <g {...common} fill="none">
        <line x1={el.x} y1={el.y} x2={x2} y2={y2} />
        {el.kind === 'arrow' && <path d={arrowHead(el.x, el.y, x2, y2, 8 + el.strokeWidth * 3)} />}
      </g>
    );
  }
  const r = normRect(el.x, el.y, el.w, el.h);
  const { x, y, w, h } = r;
  switch (el.kind) {
    case 'rect':
      return <rect x={x} y={y} width={w} height={h} {...common} />;
    case 'ellipse':
      return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />;
    case 'triangle':
      return <path d={polygon([[x + w / 2, y], [x + w, y + h], [x, y + h]])} {...common} />;
    case 'rightTriangle': {
      const m = Math.min(w, h) * 0.12;
      return (
        <g {...common}>
          <path d={polygon([[x, y], [x + w, y + h], [x, y + h]])} />
          <path d={`M${x} ${y + h - m} L${x + m} ${y + h - m} L${x + m} ${y + h}`} fill="none" strokeWidth={Math.max(1, el.strokeWidth * 0.6)} />
        </g>
      );
    }
    case 'rhombus':
      return <path d={polygon([[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]])} {...common} />;
    case 'hexagon':
      return (
        <path
          d={polygon([[x + w * 0.25, y], [x + w * 0.75, y], [x + w, y + h / 2], [x + w * 0.75, y + h], [x + w * 0.25, y + h], [x, y + h / 2]])}
          {...common}
        />
      );
    case 'axes': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const head = 8 + el.strokeWidth * 2;
      const step = 20;
      let ticks = '';
      for (let t = cx + step; t < x + w - head; t += step) ticks += `M${t} ${cy - 4}L${t} ${cy + 4}`;
      for (let t = cx - step; t > x; t -= step) ticks += `M${t} ${cy - 4}L${t} ${cy + 4}`;
      for (let t = cy - step; t > y + head; t -= step) ticks += `M${cx - 4} ${t}L${cx + 4} ${t}`;
      for (let t = cy + step; t < y + h; t += step) ticks += `M${cx - 4} ${t}L${cx + 4} ${t}`;
      return (
        <g {...common} fill="none">
          <path d={`M${x} ${cy} L${x + w} ${cy} M${cx} ${y + h} L${cx} ${y}`} />
          <path d={arrowHead(x, cy, x + w, cy, head) + arrowHead(cx, y + h, cx, y, head)} />
          <path d={ticks} strokeWidth={Math.max(1, el.strokeWidth * 0.6)} />
          <text x={x + w - 4} y={cy + 18} fill={el.stroke} stroke="none" fontSize={14} textAnchor="end" fontStyle="italic">
            x
          </text>
          <text x={cx + 8} y={y + 12} fill={el.stroke} stroke="none" fontSize={14} fontStyle="italic">
            y
          </text>
        </g>
      );
    }
  }
}

export function SolidView({ el }: { el: SolidElement }) {
  const r = normRect(el.x, el.y, el.w, el.h);
  const edges = useMemo(() => projectSolid(el.kind, r.x, r.y, r.w, r.h, el.rotX, el.rotY), [el.kind, r.x, r.y, r.w, r.h, el.rotX, el.rotY]);
  let visible = '';
  let hidden = '';
  for (const e of edges) {
    const seg = `M${e.a[0].toFixed(1)} ${e.a[1].toFixed(1)}L${e.b[0].toFixed(1)} ${e.b[1].toFixed(1)}`;
    if (e.hidden) hidden += seg;
    else visible += seg;
  }
  return (
    <g fill="none" stroke={el.stroke} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {el.showHidden && hidden && <path d={hidden} strokeDasharray={`${el.strokeWidth * 3} ${el.strokeWidth * 3}`} opacity={0.7} />}
      <path d={visible} />
    </g>
  );
}

function niceStep(span: number) {
  const raw = span / 10;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function PlotView({ el }: { el: PlotElement }) {
  const r = normRect(el.x, el.y, el.w, el.h);
  const range = { xMin: el.xMin, xMax: el.xMax, yMin: el.yMin, yMax: el.yMax };
  const result = useMemo(() => {
    try {
      return { d: plotPath(compileExpression(el.expr), r, range), error: null };
    } catch (e) {
      return { d: '', error: (e as Error).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.expr, r.x, r.y, r.w, r.h, el.xMin, el.xMax, el.yMin, el.yMax]);

  const toX = (v: number) => r.x + ((v - el.xMin) / (el.xMax - el.xMin)) * r.w;
  const toY = (v: number) => r.y + r.h - ((v - el.yMin) / (el.yMax - el.yMin)) * r.h;
  const grid: string[] = [];
  const sx = niceStep(el.xMax - el.xMin);
  const sy = niceStep(el.yMax - el.yMin);
  for (let v = Math.ceil(el.xMin / sx) * sx; v <= el.xMax; v += sx) grid.push(`M${toX(v)} ${r.y}V${r.y + r.h}`);
  for (let v = Math.ceil(el.yMin / sy) * sy; v <= el.yMax; v += sy) grid.push(`M${r.x} ${toY(v)}H${r.x + r.w}`);
  const axisX = el.yMin <= 0 && el.yMax >= 0 ? toY(0) : null;
  const axisY = el.xMin <= 0 && el.xMax >= 0 ? toX(0) : null;
  const clipId = `clip-${el.id}`;
  return (
    <g>
      <clipPath id={clipId}>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} />
      </clipPath>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(255,255,255,0.6)" stroke="#adb5bd" strokeWidth={1} />
      <path d={grid.join('')} stroke="#e9ecef" strokeWidth={1} />
      <g stroke="#495057" strokeWidth={1.2}>
        {axisX !== null && <line x1={r.x} y1={axisX} x2={r.x + r.w} y2={axisX} />}
        {axisY !== null && <line x1={axisY} y1={r.y} x2={axisY} y2={r.y + r.h} />}
      </g>
      <g fontSize={10} fill="#868e96">
        {axisX !== null &&
          [el.xMin, el.xMax].map((v, i) => (
            <text key={i} x={toX(v) + (i ? -3 : 3)} y={axisX + 12} textAnchor={i ? 'end' : 'start'}>
              {+v.toFixed(2)}
            </text>
          ))}
        {axisY !== null &&
          [el.yMin, el.yMax].map((v, i) => (
            <text key={i} x={axisY + 4} y={toY(v) + (i ? 11 : -3)}>
              {+v.toFixed(2)}
            </text>
          ))}
      </g>
      <path d={result.d} clipPath={`url(#${clipId})`} fill="none" stroke={el.color} strokeWidth={2} strokeLinejoin="round" />
      <text x={r.x + 6} y={r.y + 16} fontSize={13} fill={result.error ? '#e03131' : el.color} fontStyle="italic">
        {result.error ? `Błąd: ${result.error}` : `y = ${el.expr}`}
      </text>
    </g>
  );
}

/** Element rysowany w warstwie SVG. Wzory i tekst są w warstwie HTML (HtmlElementView). */
export const SvgElementView = memo(function SvgElementView({ el }: { el: BoardElement }) {
  switch (el.type) {
    case 'stroke':
      return <StrokeView el={el} />;
    case 'shape':
      return <ShapeView el={el} />;
    case 'solid':
      return <SolidView el={el} />;
    case 'plot':
      return <PlotView el={el} />;
    case 'image':
      return <ImageView el={el} />;
    default:
      return null;
  }
});

/** Tylko osadzone obrazy – bez zewnętrznych adresów (prywatność, CSP). */
export const isSafeImageSrc = (src: string) => /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(src);

function ImageView({ el }: { el: ImageElement }) {
  const r = normRect(el.x, el.y, el.w, el.h);
  if (!isSafeImageSrc(el.src)) {
    return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#f1f3f5" stroke="#adb5bd" strokeDasharray="4 4" />;
  }
  return (
    <image href={el.src} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none">
      {el.title && <title>{el.title}</title>}
    </image>
  );
}

const katexCache = new Map<string, string>();
export function renderLatex(latex: string, display = true): string {
  const key = `${display ? 'D' : 'I'}${latex}`;
  let html = katexCache.get(key);
  if (html === undefined) {
    html = katex.renderToString(latex || '\\square', { throwOnError: false, displayMode: display, strict: 'ignore', trust: false, output: 'html', macros: { ...CKE_MACROS } });
    if (katexCache.size > 500) katexCache.clear();
    katexCache.set(key, html);
  }
  return html;
}

/** Wzór / tekst w warstwie HTML; po wyrenderowaniu raportuje swój rozmiar (do zaznaczania i trafień). */
export const HtmlElementView = memo(function HtmlElementView({
  el,
  onSize,
}: {
  el: FormulaElement | TextElement;
  onSize(id: string, w: number, h: number): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const html = el.type === 'formula' ? renderLatex(el.latex) : null;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const report = () => onSize(el.id, node.offsetWidth, node.offsetHeight);
    report();
    // Czcionki KaTeX ładują się asynchronicznie – zmierz ponownie po ich załadowaniu.
    void document.fonts?.ready.then(report);
  }, [el, html, onSize]);
  return (
    <div
      ref={ref}
      className={el.type === 'formula' ? 'board-formula' : 'board-text'}
      style={{ left: el.x, top: el.y, fontSize: el.fontSize, color: el.color }}
      {...(html !== null ? { dangerouslySetInnerHTML: { __html: html } } : { children: el.type === 'text' ? el.text : null })}
    />
  );
});
