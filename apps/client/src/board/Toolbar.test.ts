import { describe, expect, it } from 'vitest';
import { cycleValue, SHAPE_LABELS } from './Toolbar';
import { SOLID_LABELS } from './solids';

describe('cykliczny wybór kształtów', () => {
  it('przechodzi do kolejnej figury i wraca po ostatniej', () => {
    const shapes = Object.keys(SHAPE_LABELS);
    expect(cycleValue(shapes, 'rect')).toBe('ellipse');
    expect(cycleValue(shapes, shapes.at(-1)!)).toBe(shapes[0]);
  });

  it('przechodzi do kolejnej bryły i wraca po ostatniej', () => {
    const solids = Object.keys(SOLID_LABELS);
    expect(cycleValue(solids, 'cube')).toBe('cuboid');
    expect(cycleValue(solids, solids.at(-1)!)).toBe(solids[0]);
  });

  it('zwraca bieżącą wartość dla pustej listy', () => {
    expect(cycleValue([], 'cube')).toBe('cube');
  });
});
