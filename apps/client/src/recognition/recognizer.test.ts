import { describe, expect, it } from 'vitest';
import { GLYPHS, distort } from './glyphs';
import { recognize } from './recognizer';
import type { Pt } from './pdollar';

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const random = rng(99);

/** "Pisze" znak w prostokącie (x, y, h) – wysokość h, szerokość proporcjonalna. */
function write(symbol: string, x: number, y: number, h: number, variant = 0): Pt[][] {
  const glyph = distort(GLYPHS[symbol]![variant]!, random, 0.8);
  const w = h * 0.7;
  return glyph.map((s) => s.map((p) => ({ x: x + p.x * w, y: y + p.y * h })));
}

const hline = (x1: number, x2: number, y: number): Pt[] => [
  { x: x1, y },
  { x: (x1 + x2) / 2, y: y + 1 },
  { x: x2, y },
];

describe('rozpoznawanie pojedynczych znaków', () => {
  for (const sym of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', 'x', 'y', 'a', 'b', 'c', 'n', '(', ')', '<', '>', '\\pi']) {
    it(`rozpoznaje "${sym}" (≥80% z 10 próbek)`, () => {
      let ok = 0;
      for (let k = 0; k < 10; k++) if (recognize(write(sym, 0, 0, 60)).latex === sym) ok++;
      expect(ok).toBeGreaterThanOrEqual(8);
    });
  }
});

describe('analiza układu', () => {
  it('wyrażenie liniowe: 2x+1=7', () => {
    const strokes = [
      ...write('2', 0, 0, 60),
      ...write('x', 55, 15, 45),
      ...write('+', 110, 10, 40),
      ...write('1', 165, 0, 60),
      hline(210, 250, 25),
      hline(210, 250, 40),
      ...write('7', 270, 0, 60),
    ];
    expect(recognize(strokes).latex).toBe('2x+1=7');
  });

  it('potęga: x²', () => {
    const strokes = [...write('x', 0, 20, 50), ...write('2', 42, 0, 24)];
    expect(recognize(strokes).latex).toBe('x^{2}');
  });

  it('indeks dolny: a₁', () => {
    const strokes = [...write('a', 0, 0, 50), ...write('1', 40, 38, 24)];
    expect(recognize(strokes).latex).toBe('a_{1}');
  });

  it('ułamek: 1/2 zapisany pionowo', () => {
    const strokes = [...write('1', 20, 0, 50), hline(0, 80, 60), ...write('2', 20, 70, 50)];
    expect(recognize(strokes).latex).toBe('\\frac{1}{2}');
  });

  it('ułamek z wyrażeniem obok: 3 + 1/4', () => {
    const strokes = [
      ...write('3', 0, 40, 50),
      ...write('+', 50, 50, 35),
      ...write('1', 120, 0, 50),
      hline(100, 170, 60),
      ...write('4', 115, 70, 50),
    ];
    expect(recognize(strokes).latex).toBe('3+\\frac{1}{4}');
  });

  it('pierwiastek: √9', () => {
    const sqrt = GLYPHS['\\sqrt']![0]![0]!.map((p) => ({ x: p.x * 60, y: p.y * 70 }));
    const strokes = [sqrt, ...write('9', 40, 10, 55)];
    expect(recognize(strokes).latex).toBe('\\sqrt{9}');
  });
});
