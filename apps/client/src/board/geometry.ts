import type { BoardElement, StrokeElement } from '@matdraw/shared';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

/** Rozmiary elementów HTML (wzory, tekst) mierzone po wyrenderowaniu, w jednostkach świata. */
export type SizeLookup = (id: string) => Size | undefined;

export function normRect(x: number, y: number, w: number, h: number): Rect {
  return { x: Math.min(x, x + w), y: Math.min(y, y + h), w: Math.abs(w), h: Math.abs(h) };
}

export function strokeBounds(points: number[], pad = 0): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i]!, y = points[i + 1]!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (minX === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
}

export function elementBounds(el: BoardElement, size?: SizeLookup): Rect {
  switch (el.type) {
    case 'stroke':
      return strokeBounds(el.points, el.size / 2);
    case 'shape':
    case 'solid':
    case 'plot':
    case 'image':
      return normRect(el.x, el.y, el.w, el.h);
    case 'formula':
    case 'text': {
      const s = size?.(el.id) ?? { w: el.fontSize * 4, h: el.fontSize * 1.4 };
      return { x: el.x, y: el.y, w: s.w, h: s.h };
    }
  }
}

export function unionRects(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function rectContains(r: Rect, x: number, y: number, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

export function rectsIntersect(a: Rect, b: Rect) {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
}

export function rectInside(inner: Rect, outer: Rect) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function strokeHit(el: StrokeElement, x: number, y: number, tolerance: number) {
  const pts = el.points;
  const r = el.size / 2 + tolerance;
  if (!rectContains(strokeBounds(pts), x, y, r)) return false;
  if (pts.length === 3) return Math.hypot(pts[0]! - x, pts[1]! - y) <= r;
  for (let i = 3; i < pts.length; i += 3) {
    if (distToSegment(x, y, pts[i - 3]!, pts[i - 2]!, pts[i]!, pts[i + 1]!) <= r) return true;
  }
  return false;
}

/** Trafienie elementu w punkcie (w jednostkach świata). */
export function hitTest(el: BoardElement, x: number, y: number, tolerance: number, size?: SizeLookup) {
  if (el.type === 'stroke') return strokeHit(el, x, y, tolerance);
  if (el.type === 'shape' && (el.kind === 'line' || el.kind === 'arrow')) {
    return distToSegment(x, y, el.x, el.y, el.x + el.w, el.y + el.h) <= el.strokeWidth / 2 + tolerance;
  }
  return rectContains(elementBounds(el, size), x, y, tolerance);
}

export function translateElement<T extends BoardElement>(el: T, dx: number, dy: number): T {
  if (el.type === 'stroke') {
    const points = el.points.slice();
    for (let i = 0; i < points.length; i += 3) {
      points[i] = points[i]! + dx;
      points[i + 1] = points[i + 1]! + dy;
    }
    return { ...el, points };
  }
  return { ...el, x: el.x + dx, y: el.y + dy };
}

/** Skalowanie elementu względem punktu zaczepienia (ox, oy). */
export function scaleElement<T extends BoardElement>(el: T, ox: number, oy: number, sx: number, sy: number): T {
  const tx = (x: number) => ox + (x - ox) * sx;
  const ty = (y: number) => oy + (y - oy) * sy;
  switch (el.type) {
    case 'stroke': {
      const points = el.points.slice();
      for (let i = 0; i < points.length; i += 3) {
        points[i] = tx(points[i]!);
        points[i + 1] = ty(points[i + 1]!);
      }
      return { ...el, points };
    }
    case 'shape':
    case 'solid':
    case 'plot':
    case 'image':
      return { ...el, x: tx(el.x), y: ty(el.y), w: el.w * sx, h: el.h * sy };
    case 'formula':
    case 'text':
      return { ...el, x: tx(el.x), y: ty(el.y), fontSize: Math.max(6, el.fontSize * Math.sqrt(Math.abs(sx * sy))) };
  }
}
