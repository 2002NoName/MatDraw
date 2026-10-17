import { describe, expect, it } from 'vitest';
import { DEFAULT_ROT_X, DEFAULT_ROT_Y, projectSolid } from './solids';

describe('projectSolid', () => {
  it('sześcian widziany na wprost: 4 krawędzie widoczne, 4 ukryte z tyłu, 4 boczne zdegenerowane', () => {
    const edges = projectSolid('cube', 0, 0, 100, 100, 0, 0);
    expect(edges).toHaveLength(12);
  });

  it('sześcian w rzucie ukośnym: 9 widocznych i 3 niewidoczne krawędzie', () => {
    const edges = projectSolid('cube', 0, 0, 100, 100, 0.4, -0.6);
    expect(edges.filter((e) => !e.hidden)).toHaveLength(9);
    expect(edges.filter((e) => e.hidden)).toHaveLength(3);
  });

  it('domyślny widok z góry: górna podstawa widoczna, krawędzie przerywane z tyłu i u dołu', () => {
    const edges = projectSolid('cube', 0, 0, 200, 200, DEFAULT_ROT_X, DEFAULT_ROT_Y);
    const hidden = edges.filter((e) => e.hidden);
    expect(hidden).toHaveLength(3);
    // Wszystkie ukryte krawędzie wychodzą z jednego wierzchołka – tylnego, dolnego (dolna połowa nie jest „z przodu”).
    const pts = hidden.flatMap((e) => [e.a, e.b].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`));
    const shared = pts.find((p) => pts.filter((q) => q === p).length === 3);
    expect(shared).toBeDefined();
    // Widok z góry: niewidoczny jest tylny DOLNY wierzchołek, więc na rzucie leży poniżej środka bryły (y > 100).
    const [, sy] = shared!.split(',').map(Number) as [number, number];
    expect(sy).toBeGreaterThan(100);
  });

  it('walec: tworzące tylko na konturze', () => {
    const edges = projectSolid('cylinder', 0, 0, 100, 100, 0.4, 0);
    // 48 + 48 krawędzi podstaw + 2 tworzące konturowe
    expect(edges.length).toBe(98);
  });

  it('mieści się w prostokącie', () => {
    for (const e of projectSolid('sphere', 10, 20, 100, 80, 0.3, 0.7)) {
      for (const [x, y] of [e.a, e.b]) {
        expect(x).toBeGreaterThanOrEqual(10 - 1e-6);
        expect(x).toBeLessThanOrEqual(110 + 1e-6);
        expect(y).toBeGreaterThanOrEqual(20 - 1e-6);
        expect(y).toBeLessThanOrEqual(100 + 1e-6);
      }
    }
  });
});
