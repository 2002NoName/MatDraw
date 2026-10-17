import { classify, prepare, type Candidate, type Pt, type Template } from './pdollar';
import { builtInTemplates } from './glyphs';

/**
 * Rozpoznawanie wzorów z pisma odręcznego – w całości lokalnie, bez usług zewnętrznych.
 *  1. analiza układu: kreski ułamkowe (kreska pozioma z symbolami nad i pod nią), pierwiastki,
 *  2. segmentacja na znaki (grupowanie kresek zachodzących na siebie w poziomie),
 *  3. klasyfikacja znaku algorytmem $P,
 *  4. wykrywanie wykładników i indeksów dolnych na podstawie położenia i wielkości.
 */

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface RecognizedSymbol {
  latex: string;
  alternatives: string[];
  confidence: number;
  box: Box;
}

export interface RecognitionResult {
  latex: string;
  symbols: RecognizedSymbol[];
}

type Kind = 'base' | 'op' | 'open';

interface Sym {
  ids: number[];
  box: Box;
  latex: string;
  kind: Kind;
}

const BASE_SYMBOLS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', 'y', 'a', 'b', 'c', 'n', ')', '\\pi']);

function boxOf(points: Pt[]): Box {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

const median = (v: number[]) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

/** Zakres ufności 0..1 na podstawie odległości $P (empirycznie). */
const confidenceOf = (c?: Candidate) => (c ? Math.max(0, Math.min(1, 1 - c.distance / 6)) : 0);

export class Recognizer {
  private boxes: Box[] = [];
  private symbols: RecognizedSymbol[] = [];

  constructor(
    private strokes: Pt[][],
    private templates: Template[],
  ) {}

  run(): RecognitionResult {
    this.strokes = this.strokes.filter((s) => s.length > 0);
    this.boxes = this.strokes.map(boxOf);
    this.symbols = [];
    const latex = this.parse(this.strokes.map((_, i) => i)).trim();
    return { latex, symbols: this.symbols };
  }

  private isHorizontalLine(i: number) {
    const b = this.boxes[i]!;
    if (b.w === 0 || b.h > b.w * 0.3) return false;
    // prostoliniowość: długość ścieżki ≈ szerokość
    const s = this.strokes[i]!;
    let len = 0;
    for (let k = 1; k < s.length; k++) len += Math.hypot(s[k]!.x - s[k - 1]!.x, s[k]!.y - s[k - 1]!.y);
    return len < b.w * 1.35;
  }

  private refHeight(ids: number[]) {
    const tall = ids.filter((i) => !this.isHorizontalLine(i)).map((i) => this.boxes[i]!.h);
    const h = median(tall.filter((x) => x > 0));
    return h || median(ids.map((i) => Math.max(this.boxes[i]!.w, this.boxes[i]!.h))) || 1;
  }

  private parse(ids: number[]): string {
    if (!ids.length) return '';
    const H = this.refHeight(ids);
    return this.tryFraction(ids, H) ?? this.trySqrt(ids, H) ?? this.layout(ids, H);
  }

  private tryFraction(ids: number[], H: number): string | null {
    const bars = ids.filter((i) => this.isHorizontalLine(i) && this.boxes[i]!.w > H * 0.6).sort((a, b) => this.boxes[b]!.w - this.boxes[a]!.w);
    for (const bar of bars) {
      const bb = this.boxes[bar]!;
      const tol = bb.w * 0.1;
      const inSpan = (i: number) => {
        const b = this.boxes[i]!;
        return b.cx >= bb.minX - tol && b.cx <= bb.maxX + tol && Math.abs(b.cy - bb.cy) < H * 3;
      };
      const above = ids.filter((i) => i !== bar && inSpan(i) && this.boxes[i]!.cy < bb.cy);
      const below = ids.filter((i) => i !== bar && inSpan(i) && this.boxes[i]!.cy > bb.cy);
      if (!above.length || !below.length) continue;
      const used = new Set([bar, ...above, ...below]);
      const rest = ids.filter((i) => !used.has(i));
      const left = rest.filter((i) => this.boxes[i]!.cx < bb.minX);
      const right = rest.filter((i) => this.boxes[i]!.cx >= bb.minX);
      return `${this.parse(left)}\\frac{${this.parse(above)}}{${this.parse(below)}}${this.parse(right)}`;
    }
    return null;
  }

  private trySqrt(ids: number[], H: number): string | null {
    const wide = ids
      .filter((i) => !this.isHorizontalLine(i) && this.boxes[i]!.w > H * 1.1)
      .sort((a, b) => this.boxes[b]!.w - this.boxes[a]!.w);
    for (const s of wide) {
      const [best] = classify(prepare([this.strokes[s]!]), this.templates, 1);
      if (best?.symbol !== '\\sqrt') continue;
      const sb = this.boxes[s]!;
      const inside = ids.filter((i) => {
        if (i === s) return false;
        const b = this.boxes[i]!;
        return b.cx > sb.minX + sb.w * 0.2 && b.cx < sb.maxX + H * 0.1 && b.cy > sb.minY && b.minY > sb.minY - H * 0.2;
      });
      const used = new Set([s, ...inside]);
      const rest = ids.filter((i) => !used.has(i));
      const left = rest.filter((i) => this.boxes[i]!.cx < sb.minX + sb.w * 0.2);
      const right = rest.filter((i) => !left.includes(i));
      this.symbols.push({ latex: '\\sqrt{}', alternatives: [], confidence: confidenceOf(best), box: sb });
      return `${this.parse(left)}\\sqrt{${this.parse(inside)}}${this.parse(right)}`;
    }
    return null;
  }

  private group(ids: number[], H: number): number[][] {
    const sorted = [...ids].sort((a, b) => this.boxes[a]!.minX - this.boxes[b]!.minX);
    const groups: { ids: number[]; minX: number; maxX: number }[] = [];
    for (const i of sorted) {
      const b = this.boxes[i]!;
      const g = groups[groups.length - 1];
      if (g) {
        const overlap = Math.min(g.maxX, b.maxX) - Math.max(g.minX, b.minX);
        const gw = g.maxX - g.minX;
        const gcx = (g.minX + g.maxX) / 2;
        const gap = -overlap;
        const thin = Math.min(gw, b.w) < H * 0.2;
        const merge =
          overlap > 0.35 * Math.max(1e-6, Math.min(gw, b.w)) ||
          (b.cx >= g.minX && b.cx <= g.maxX) ||
          (gcx >= b.minX && gcx <= b.maxX) ||
          (thin && gap < H * 0.06);
        if (merge) {
          g.ids.push(i);
          g.minX = Math.min(g.minX, b.minX);
          g.maxX = Math.max(g.maxX, b.maxX);
          continue;
        }
      }
      groups.push({ ids: [i], minX: b.minX, maxX: b.maxX });
    }
    return groups.map((g) => g.ids);
  }

  private classifyGroup(ids: number[], H: number): Sym {
    const box = boxOf(ids.flatMap((i) => this.strokes[i]!));
    const lines = ids.filter((i) => this.isHorizontalLine(i));
    let latex: string;
    let alternatives: string[] = [];
    let confidence = 0.9;
    if (lines.length === ids.length && ids.length <= 2) {
      latex = ids.length === 1 ? '-' : '=';
    } else if (Math.max(box.w, box.h) < H * 0.2) {
      latex = '\\cdot';
    } else {
      const cands = classify(prepare(ids.map((i) => this.strokes[i]!)), this.templates, 4).filter((c) => c.symbol !== '\\sqrt');
      disambiguate(cands, box);
      latex = cands[0]?.symbol ?? '?';
      alternatives = cands.slice(1).map((c) => c.symbol);
      confidence = confidenceOf(cands[0]);
    }
    this.symbols.push({ latex, alternatives, confidence, box });
    const kind: Kind = BASE_SYMBOLS.has(latex) ? 'base' : latex === '(' ? 'open' : 'op';
    return { ids, box, latex, kind };
  }

  private layout(ids: number[], H: number): string {
    const syms = this.group(ids, H).map((g) => this.classifyGroup(g, H));
    const out: string[] = [];
    let base: Sym | null = null;
    let i = 0;
    while (i < syms.length) {
      const s = syms[i]!;
      const pos = base ? scriptPosition(s.box, base.box) : null;
      if (base && pos) {
        const run: Sym[] = [];
        while (i < syms.length && scriptPosition(syms[i]!.box, base.box) === pos) run.push(syms[i++]!);
        const inner = this.parse(run.flatMap((r) => r.ids));
        out.push(`${pos === 'sup' ? '^' : '_'}{${inner}}`);
        base = null;
        continue;
      }
      out.push(s.latex);
      base = s.kind === 'base' ? s : null;
      i++;
    }
    return joinLatex(out);
  }
}

const CONFUSABLE: Array<[string, string]> = [
  ['(', '<'],
  [')', '>'],
];

/** Nawiasy są wąskie i wysokie, znaki nierówności – zbliżone do kwadratu. */
function disambiguate(cands: Candidate[], box: Box) {
  if (cands.length < 2) return;
  const ratio = box.w / Math.max(box.h, 1e-6);
  for (const [paren, angle] of CONFUSABLE) {
    const pair = new Set([cands[0]!.symbol, cands[1]!.symbol]);
    if (!pair.has(paren) || !pair.has(angle)) continue;
    const want = ratio < 0.45 ? paren : angle;
    if (cands[0]!.symbol !== want) [cands[0], cands[1]] = [cands[1]!, cands[0]!];
  }
}

function scriptPosition(s: Box, base: Box): 'sup' | 'sub' | null {
  if (s.minX < base.cx) return null;
  const small = s.h < base.h * 0.9 || s.h < s.w * 0.4;
  if (!small) return null;
  if (s.cy < base.minY + base.h * 0.3 && s.maxY < base.minY + base.h * 0.7) return 'sup';
  if (s.cy > base.maxY - base.h * 0.25 && s.minY > base.minY + base.h * 0.35) return 'sub';
  return null;
}

function joinLatex(tokens: string[]) {
  let out = '';
  for (const t of tokens) {
    if (/\\[a-zA-Z]+$/.test(out) && /^[a-zA-Z0-9]/.test(t)) out += ' ';
    out += t;
  }
  return out;
}

export function recognize(strokes: Pt[][], templates: Template[] = builtInTemplates()): RecognitionResult {
  return new Recognizer(strokes, templates).run();
}
