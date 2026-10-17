import { describe, expect, it } from 'vitest';
import { compileExpression, plotPath } from './expr';

describe('compileExpression', () => {
  const cases: Array<[string, number, number]> = [
    ['x^2', 3, 9],
    ['2x+1', 2, 5],
    ['-x^2', 2, -4],
    ['2^-1', 0, 0.5],
    ['sin(pi/2)', 0, 1],
    ['3(x+1)(x-1)', 2, 9],
    ['sqrt x', 16, 4],
    ['abs(x) + ln(e)', -2, 3],
    ['x sin x', 0, 0],
    ['1,5x', 2, 3],
    ['2pix', 1, 2 * Math.PI],
  ];
  for (const [src, x, y] of cases) {
    it(`${src} @ x=${x}`, () => expect(compileExpression(src)(x)).toBeCloseTo(y, 9));
  }

  it('zgłasza błędy składni', () => {
    expect(() => compileExpression('2+')).toThrow();
    expect(() => compileExpression('(x')).toThrow();
    expect(() => compileExpression('alert(1)')).toThrow();
    expect(() => compileExpression('x;y')).toThrow();
  });
});

describe('plotPath', () => {
  it('przerywa wykres na asymptocie', () => {
    const d = plotPath(compileExpression('1/x'), { x: 0, y: 0, w: 100, h: 100 }, { xMin: -1, xMax: 1, yMin: -5, yMax: 5 }, 100);
    expect(d.match(/M/g)!.length).toBeGreaterThanOrEqual(2);
  });
});
