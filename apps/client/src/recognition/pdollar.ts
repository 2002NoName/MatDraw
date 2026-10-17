/**
 * Klasyfikator $P (point-cloud) – Vatavu, Anthony, Wobbrock (2012).
 * Rozpoznaje znak jako chmurę punktów, więc jest niezależny od kolejności
 * i kierunku kresek oraz od ich liczby.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Template {
  symbol: string;
  points: Pt[];
  /** Szablon użytkownika (trening) – preferowany przy remisach. */
  user?: boolean;
}

export const NUM_POINTS = 32;

export function pathLength(strokes: Pt[][]) {
  let d = 0;
  for (const s of strokes) for (let i = 1; i < s.length; i++) d += Math.hypot(s[i]!.x - s[i - 1]!.x, s[i]!.y - s[i - 1]!.y);
  return d;
}

/** Równomierne przepróbkowanie wszystkich kresek do n punktów. */
export function resample(strokes: Pt[][], n = NUM_POINTS): Pt[] {
  const valid = strokes.filter((s) => s.length > 0);
  const total = pathLength(valid);
  if (total === 0) {
    const p = valid[0]?.[0] ?? { x: 0, y: 0 };
    return Array.from({ length: n }, () => ({ ...p }));
  }
  const I = total / (n - 1);
  const out: Pt[] = [{ ...valid[0]![0]! }];
  let D = 0;
  for (const stroke of valid) {
    const pts = stroke.map((p) => ({ ...p }));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!, b = pts[i]!;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (D + d >= I && d > 0) {
        const t = (I - D) / d;
        const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        out.push(q);
        pts.splice(i, 0, q);
        D = 0;
      } else D += d;
    }
  }
  while (out.length < n) out.push({ ...out[out.length - 1]! });
  return out.slice(0, n);
}

/** Normalizacja: skala jednorodna (zachowuje proporcje) i przesunięcie środka ciężkości do (0,0). */
export function normalize(points: Pt[]): Pt[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const scaled = points.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size }));
  const cx = scaled.reduce((s, p) => s + p.x, 0) / scaled.length;
  const cy = scaled.reduce((s, p) => s + p.y, 0) / scaled.length;
  return scaled.map((p) => ({ x: p.x - cx, y: p.y - cy }));
}

export function prepare(strokes: Pt[][]): Pt[] {
  return normalize(resample(strokes));
}

function cloudDistance(a: Pt[], b: Pt[], start: number, minSoFar: number) {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity, idx = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = (a[i]!.x - b[j]!.x) ** 2 + (a[i]!.y - b[j]!.y) ** 2;
      if (d < min) {
        min = d;
        idx = j;
      }
    }
    matched[idx] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * Math.sqrt(min);
    if (sum >= minSoFar) return sum;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

export function greedyCloudMatch(points: Pt[], template: Pt[], minSoFar = Infinity) {
  const n = points.length;
  const step = Math.max(1, Math.floor(Math.sqrt(n)));
  let min = minSoFar;
  for (let i = 0; i < n; i += step) {
    min = Math.min(min, cloudDistance(points, template, i, min), cloudDistance(template, points, i, min));
  }
  return min;
}

export interface Candidate {
  symbol: string;
  distance: number;
}

const GRID = 5;

/** Siatka zajętości 5×5 (rozciągnięta do prostokąta otaczającego) – cecha pomocnicza do rozstrzygania remisów. */
export function occupancy(points: Pt[]): Set<number> {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX || 1, h = maxY - minY || 1;
  // cienkie znaki (np. "1", "-") nie są rozciągane w wąskim wymiarze
  const sx = w / h < 0.25 ? h : w, sy = h / w < 0.25 ? w : h;
  const cells = new Set<number>();
  for (const p of points) {
    const gx = Math.min(GRID - 1, Math.floor(((p.x - minX) / sx) * GRID));
    const gy = Math.min(GRID - 1, Math.floor(((p.y - minY) / sy) * GRID));
    cells.add(gy * GRID + gx);
  }
  return cells;
}

function jaccardDistance(a: Set<number>, b: Set<number>) {
  let inter = 0;
  for (const c of a) if (b.has(c)) inter++;
  const union = a.size + b.size - inter;
  return union ? 1 - inter / union : 0;
}

const gridCache = new WeakMap<Template, Set<number>>();
const gridOf = (t: Template) => {
  let g = gridCache.get(t);
  if (!g) gridCache.set(t, (g = occupancy(t.points)));
  return g;
};

/** Zwraca kandydatów (najlepszy wynik na symbol), posortowanych rosnąco wg odległości. */
export function classify(points: Pt[], templates: Template[], limit = 5): Candidate[] {
  const best = new Map<string, { d: number; t: Template }>();
  for (const t of templates) {
    const cur = best.get(t.symbol)?.d ?? Infinity;
    const d = greedyCloudMatch(points, t.points, cur) * (t.user ? 0.92 : 1);
    if (d < cur) best.set(t.symbol, { d, t });
  }
  const input = occupancy(points);
  return [...best.entries()]
    .map(([symbol, { d, t }]) => ({ symbol, distance: d + 0.8 * jaccardDistance(input, gridOf(t)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
