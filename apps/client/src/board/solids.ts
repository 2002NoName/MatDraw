import type { Solid3DKind } from '@matdraw/shared';

type V3 = [number, number, number];

interface Mesh {
  vertices: V3[];
  faces: number[][];
  /** Krawędzie "ostre" (zawsze rysowane, ukryte – przerywane); pozostałe rysowane tylko jako kontur. */
  hardEdges: Set<string>;
}

export interface ProjectedEdge {
  a: [number, number];
  b: [number, number];
  hidden: boolean;
}

const ek = (i: number, j: number) => (i < j ? `${i}-${j}` : `${j}-${i}`);

function box(sx: number, sy: number, sz: number): Mesh {
  const v: V3[] = [];
  for (const x of [-sx, sx]) for (const y of [-sy, sy]) for (const z of [-sz, sz]) v.push([x, y, z]);
  // indeksy: (x,y,z) -> x*4 + y*2 + z
  const faces = [
    [0, 1, 3, 2],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 3, 7, 5],
  ];
  return withAllHard({ vertices: v, faces, hardEdges: new Set() });
}

function withAllHard(m: Mesh): Mesh {
  for (const f of m.faces) for (let i = 0; i < f.length; i++) m.hardEdges.add(ek(f[i]!, f[(i + 1) % f.length]!));
  return m;
}

function ring(n: number, y: number, r: number, offset = 0): V3[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + offset;
    return [Math.cos(a) * r, y, Math.sin(a) * r] as V3;
  });
}

function pyramid(sides: number): Mesh {
  const base = ring(sides, -1, 1, Math.PI / sides);
  const vertices: V3[] = [...base, [0, 1, 0]];
  const apex = sides;
  const faces = [Array.from({ length: sides }, (_, i) => i)];
  for (let i = 0; i < sides; i++) faces.push([i, (i + 1) % sides, apex]);
  return withAllHard({ vertices, faces, hardEdges: new Set() });
}

function prism(sides: number, smooth: boolean): Mesh {
  const bottom = ring(sides, -1, 1, smooth ? 0 : Math.PI / 2);
  const top = ring(sides, 1, 1, smooth ? 0 : Math.PI / 2);
  const vertices = [...bottom, ...top];
  const faces = [Array.from({ length: sides }, (_, i) => i), Array.from({ length: sides }, (_, i) => sides + i)];
  const hardEdges = new Set<string>();
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push([i, j, sides + j, sides + i]);
    hardEdges.add(ek(i, j));
    hardEdges.add(ek(sides + i, sides + j));
    if (!smooth) hardEdges.add(ek(i, sides + i));
  }
  return { vertices, faces, hardEdges };
}

function cone(sides: number): Mesh {
  const base = ring(sides, -1, 1);
  const vertices: V3[] = [...base, [0, 1, 0]];
  const faces = [Array.from({ length: sides }, (_, i) => i)];
  const hardEdges = new Set<string>();
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push([i, j, sides]);
    hardEdges.add(ek(i, j));
  }
  return { vertices, faces, hardEdges };
}

function sphere(lat: number, lon: number): Mesh {
  const vertices: V3[] = [[0, 1, 0]];
  for (let i = 1; i < lat; i++) {
    const phi = (i / lat) * Math.PI;
    vertices.push(...ring(lon, Math.cos(phi), Math.sin(phi)));
  }
  vertices.push([0, -1, 0]);
  const south = vertices.length - 1;
  const idx = (i: number, j: number) => 1 + (i - 1) * lon + (j % lon);
  const faces: number[][] = [];
  for (let j = 0; j < lon; j++) faces.push([0, idx(1, j), idx(1, j + 1)]);
  for (let i = 1; i < lat - 1; i++) {
    for (let j = 0; j < lon; j++) faces.push([idx(i, j), idx(i, j + 1), idx(i + 1, j + 1), idx(i + 1, j)]);
  }
  for (let j = 0; j < lon; j++) faces.push([idx(lat - 1, j), idx(lat - 1, j + 1), south]);
  const hardEdges = new Set<string>();
  const eq = lat / 2;
  if (Number.isInteger(eq)) for (let j = 0; j < lon; j++) hardEdges.add(ek(idx(eq, j), idx(eq, j + 1)));
  return { vertices, faces, hardEdges };
}

const meshCache = new Map<Solid3DKind, Mesh>();

export function solidMesh(kind: Solid3DKind): Mesh {
  let m = meshCache.get(kind);
  if (m) return m;
  switch (kind) {
    case 'cube':
      m = box(1, 1, 1);
      break;
    case 'cuboid':
      m = box(1, 0.6, 0.55);
      break;
    case 'pyramid':
      m = pyramid(4);
      break;
    case 'tetrahedron':
      m = pyramid(3);
      break;
    case 'prism':
      m = prism(3, false);
      break;
    case 'cylinder':
      m = prism(48, true);
      break;
    case 'cone':
      m = cone(48);
      break;
    case 'sphere':
      m = sphere(16, 48);
      break;
  }
  meshCache.set(kind, m);
  return m;
}

/**
 * Układ: x w prawo, y w górę, z do obserwatora. Dodatnie `rotX` pochyla górę bryły ku obserwatorowi
 * (widok z góry – jak w podręcznikach), dodatnie `rotY` obraca przednią ścianę w prawo.
 */
export const DEFAULT_ROT_X = 0.35;
export const DEFAULT_ROT_Y = -0.6;
export const clampTilt = (rx: number) => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rx));

function rotate([x, y, z]: V3, rotX: number, rotY: number): V3 {
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const y2 = y * cx - z1 * sx;
  const z2 = y * sx + z1 * cx;
  return [x1, y2, z2];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Rzutuje bryłę (rzut prostokątny) do prostokąta (x, y, w, h).
 * Wszystkie bryły są wypukłe, więc normalną ściany orientujemy "od środka" bryły,
 * a ścianę uznajemy za widoczną, gdy jej normalna jest skierowana do obserwatora (z > 0).
 */
export function projectSolid(kind: Solid3DKind, x: number, y: number, w: number, h: number, rotX: number, rotY: number): ProjectedEdge[] {
  const mesh = solidMesh(kind);
  const rv = mesh.vertices.map((v) => rotate(v, rotX, rotY));
  const centroid = rv.reduce<V3>((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]).map((c) => c / rv.length) as V3;

  const faceFront = mesh.faces.map((f) => {
    const a = rv[f[0]!]!, b = rv[f[1]!]!, c = rv[f[2]!]!;
    let n = cross(sub(b, a), sub(c, a));
    const center = f.reduce<V3>((acc, i) => [acc[0] + rv[i]![0], acc[1] + rv[i]![1], acc[2] + rv[i]![2]], [0, 0, 0]).map((v) => v / f.length) as V3;
    if (dot(n, sub(center, centroid)) < 0) n = [-n[0], -n[1], -n[2]];
    return n[2] > 1e-9;
  });

  const edgeFaces = new Map<string, number[]>();
  mesh.faces.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const k = ek(f[i]!, f[(i + 1) % f.length]!);
      const list = edgeFaces.get(k);
      if (list) list.push(fi);
      else edgeFaces.set(k, [fi]);
    }
  });

  // Dopasowanie rzutu do prostokąta: skala wg promienia otaczającego (stabilna przy obrocie).
  const radius = Math.max(...mesh.vertices.map((v) => Math.hypot(v[0], v[1], v[2])));
  const s = Math.min(Math.abs(w), Math.abs(h)) / 2 / radius;
  const cx = x + w / 2, cy = y + h / 2;
  const proj = (v: V3): [number, number] => [cx + v[0] * s, cy - v[1] * s];

  const edges: ProjectedEdge[] = [];
  for (const [k, faces] of edgeFaces) {
    const fronts = faces.filter((fi) => faceFront[fi]).length;
    const hard = mesh.hardEdges.has(k);
    const silhouette = fronts > 0 && fronts < faces.length;
    if (!hard && !silhouette) continue;
    const [i, j] = k.split('-').map(Number) as [number, number];
    edges.push({ a: proj(rv[i]!), b: proj(rv[j]!), hidden: fronts === 0 });
  }
  return edges;
}

export const SOLID_LABELS: Record<Solid3DKind, string> = {
  cube: 'Sześcian',
  cuboid: 'Prostopadłościan',
  pyramid: 'Ostrosłup',
  tetrahedron: 'Czworościan',
  prism: 'Graniastosłup',
  cylinder: 'Walec',
  cone: 'Stożek',
  sphere: 'Kula',
};
