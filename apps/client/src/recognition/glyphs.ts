import { prepare, type Pt, type Template } from './pdollar';

/**
 * Wbudowane wzorce znaków pisma odręcznego – zdefiniowane geometrycznie w polu 1×1 (y w dół).
 * Każdy znak może mieć kilka wariantów zapisu. Z każdego wariantu generujemy kilka
 * deterministycznie zniekształconych kopii (obrót, pochylenie, proporcje), co zwiększa odporność.
 */

type Glyph = Pt[][];

function arc(cx: number, cy: number, rx: number, ry: number, fromDeg: number, toDeg: number, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / n) * Math.PI) / 180;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

const P = (...xy: number[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < xy.length; i += 2) out.push({ x: xy[i]!, y: xy[i + 1]! });
  return out;
};

export const GLYPHS: Record<string, Glyph[]> = {
  '0': [[arc(0.5, 0.5, 0.3, 0.5, -90, 270)]],
  '1': [[P(0.5, 0, 0.5, 1)], [P(0.25, 0.25, 0.5, 0, 0.5, 1)]],
  '2': [[[...arc(0.5, 0.28, 0.32, 0.28, -165, 25), ...P(0.15, 1, 0.9, 1)]]],
  '3': [[[...arc(0.45, 0.25, 0.32, 0.25, -150, 90), ...arc(0.45, 0.75, 0.35, 0.25, -90, 150)]]],
  '4': [
    [P(0.6, 0, 0.1, 0.65, 0.9, 0.65), P(0.65, 0.3, 0.65, 1)],
    [P(0.15, 0, 0.1, 0.6, 0.9, 0.6), P(0.7, 0, 0.7, 1)],
  ],
  '5': [[P(0.8, 0, 0.25, 0, 0.2, 0.45), arc(0.45, 0.7, 0.33, 0.3, -125, 150)], [[...P(0.8, 0, 0.25, 0, 0.2, 0.45), ...arc(0.45, 0.7, 0.33, 0.3, -125, 150)]]],
  '6': [[[...arc(0.55, 0.5, 0.35, 0.5, -60, -180), ...arc(0.5, 0.72, 0.3, 0.28, 180, 540)]]],
  '7': [[P(0.1, 0, 0.9, 0, 0.35, 1)], [P(0.1, 0, 0.9, 0, 0.35, 1), P(0.35, 0.5, 0.8, 0.5)]],
  '8': [[[...arc(0.5, 0.25, 0.26, 0.25, 90, 450), ...arc(0.5, 0.75, 0.3, 0.25, -90, 270)]]],
  '9': [[[...arc(0.5, 0.28, 0.32, 0.28, 0, 360), ...P(0.82, 0.28, 0.75, 1)]], [[...arc(0.5, 0.28, 0.32, 0.28, 0, 360), ...arc(0.4, 0.4, 0.42, 0.6, 0, 100)]]],
  '+': [[P(0.5, 0.05, 0.5, 0.95), P(0.05, 0.5, 0.95, 0.5)]],
  x: [[P(0.1, 0.1, 0.9, 0.9), P(0.9, 0.1, 0.1, 0.9)], [arc(0.15, 0.5, 0.35, 0.5, -70, 70), arc(0.85, 0.5, 0.35, 0.5, 110, 250)]],
  y: [[P(0.1, 0, 0.5, 0.5), P(0.9, 0, 0.3, 1)], [[...P(0.1, 0, 0.15, 0.4), ...arc(0.4, 0.4, 0.25, 0.2, 180, 0, 8), ...P(0.65, 0.4, 0.65, 0, 0.62, 0.85), ...arc(0.4, 0.8, 0.22, 0.2, 0, 160, 8)]]],
  a: [[arc(0.45, 0.55, 0.32, 0.42, 0, 360), P(0.77, 0.13, 0.79, 1)], [[...arc(0.45, 0.55, 0.32, 0.42, -10, -370), ...P(0.77, 0.15, 0.79, 1)]]],
  b: [[[...P(0.2, 0, 0.2, 1), ...arc(0.5, 0.72, 0.3, 0.28, 180, 540)]]],
  c: [[arc(0.55, 0.5, 0.4, 0.5, -45, -315)]],
  n: [
    [[...P(0.15, 0.2, 0.15, 1, 0.15, 0.45), ...arc(0.5, 0.45, 0.35, 0.3, 180, 360), ...P(0.85, 0.45, 0.85, 1)]],
    [P(0.15, 0.15, 0.15, 1), [...P(0.15, 0.5), ...arc(0.5, 0.45, 0.35, 0.3, 180, 360), ...P(0.85, 0.45, 0.85, 1)]],
  ],
  '(': [[arc(1, 0.5, 0.8, 0.5, -120, -240)]],
  ')': [[arc(0, 0.5, 0.8, 0.5, -60, 60)]],
  '<': [[P(0.9, 0.1, 0.1, 0.5, 0.9, 0.9)]],
  '>': [[P(0.1, 0.1, 0.9, 0.5, 0.1, 0.9)]],
  '/': [[P(0.8, 0, 0.2, 1)]],
  '\\pi': [[P(0, 0.15, 1, 0.15), P(0.3, 0.15, 0.25, 1), P(0.7, 0.15, 0.75, 1)]],
  '\\sqrt': [[P(0, 0.6, 0.12, 0.5, 0.3, 1, 0.5, 0, 1.6, 0)]],
};

/** Prosty deterministyczny generator liczb pseudolosowych (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Losowe zniekształcenie afiniczne kreski (obrót, pochylenie, proporcje) + drżenie punktów. */
export function distort(glyph: Glyph, random: () => number, amount = 1): Glyph {
  const rot = (random() - 0.5) * 0.25 * amount;
  const shear = (random() - 0.5) * 0.35 * amount;
  const sx = 1 + (random() - 0.5) * 0.3 * amount;
  const sy = 1 + (random() - 0.5) * 0.3 * amount;
  const c = Math.cos(rot), s = Math.sin(rot);
  return glyph.map((stroke) =>
    stroke.map((p) => {
      const x = (p.x - 0.5) * sx + shear * (p.y - 0.5);
      const y = (p.y - 0.5) * sy;
      return {
        x: 0.5 + x * c - y * s + (random() - 0.5) * 0.02 * amount,
        y: 0.5 + x * s + y * c + (random() - 0.5) * 0.02 * amount,
      };
    }),
  );
}

let builtIn: Template[] | null = null;

export function builtInTemplates(variants = 8): Template[] {
  if (builtIn) return builtIn;
  const random = rng(1234);
  const out: Template[] = [];
  for (const [symbol, glyphs] of Object.entries(GLYPHS)) {
    for (const g of glyphs) {
      out.push({ symbol, points: prepare(g) });
      for (let i = 0; i < variants; i++) out.push({ symbol, points: prepare(distort(g, random)) });
    }
  }
  builtIn = out;
  return out;
}

export const TRAINABLE_SYMBOLS = Object.keys(GLYPHS);
