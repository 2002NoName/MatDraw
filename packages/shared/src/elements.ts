/**
 * Model elementów tablicy. Elementy są przechowywane w dokumencie Yjs
 * (Y.Map<string, BoardElement>) pod kluczem `elements`, a każdy element
 * jest niemutowalnym obiektem JSON – modyfikacja = zapis nowej wersji obiektu.
 */

export interface ElementBase {
  id: string;
  /** Kolejność rysowania (większe = wyżej). */
  z: number;
  /** id użytkownika, który utworzył element. */
  author: string;
  createdAt: number;
}

export type StrokeTool = 'pen' | 'highlighter';

export interface StrokeElement extends ElementBase {
  type: 'stroke';
  tool: StrokeTool;
  /** Spłaszczona lista punktów [x, y, nacisk, x, y, nacisk, ...] w układzie świata. */
  points: number[];
  color: string;
  size: number;
}

export type Shape2DKind =
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'rightTriangle'
  | 'rhombus'
  | 'hexagon'
  | 'axes';

export interface ShapeElement extends ElementBase {
  type: 'shape';
  kind: Shape2DKind;
  /** Dla linii/strzałki: początek (x,y), koniec (x+w, y+h). Dla pozostałych: prostokąt otaczający. */
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill: string | null;
  strokeWidth: number;
}

export type Solid3DKind = 'cube' | 'cuboid' | 'pyramid' | 'prism' | 'cylinder' | 'cone' | 'sphere' | 'tetrahedron';

export interface SolidElement extends ElementBase {
  type: 'solid';
  kind: Solid3DKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Obrót wokół osi X i Y w radianach. */
  rotX: number;
  rotY: number;
  stroke: string;
  strokeWidth: number;
  /** Rysuj krawędzie niewidoczne linią przerywaną. */
  showHidden: boolean;
}

export interface FormulaElement extends ElementBase {
  type: 'formula';
  latex: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface TextElement extends ElementBase {
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface PlotElement extends ElementBase {
  type: 'plot';
  /** Wyrażenie w zmiennej x, np. "sin(x) + x^2/4". */
  expr: string;
  x: number;
  y: number;
  w: number;
  h: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  color: string;
}

/** Obraz (zdjęcie, zrzut ekranu, wzór z tablic CKE) zapisany jako data URL. */
export interface ImageElement extends ElementBase {
  type: 'image';
  /** data:image/jpeg|png|webp|svg+xml;base64,... */
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Opis (np. nazwa wzoru CKE) – podpowiedź i dostępność. */
  title?: string;
}

/** Maksymalny rozmiar pojedynczego obrazu (długość data URL, znaki). */
export const MAX_IMAGE_DATA_URL = 3_000_000;

export type BoardElement =
  | StrokeElement
  | ShapeElement
  | SolidElement
  | FormulaElement
  | TextElement
  | PlotElement
  | ImageElement;

export type BoardElementType = BoardElement['type'];

/** Nazwa mapy Yjs z elementami tablicy. */
export const YDOC_ELEMENTS_KEY = 'elements';
/** Nazwa mapy Yjs z metadanymi tablicy (np. tło). */
export const YDOC_META_KEY = 'meta';

export type BoardBackground = 'blank' | 'grid' | 'dots';
