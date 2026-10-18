import * as Y from 'yjs';
import { YDOC_ELEMENTS_KEY, YDOC_META_KEY, type BoardBackground, type BoardElement } from '@matdraw/shared';

/** Origin transakcji wykonywanych lokalnie przez użytkownika (śledzone przez UndoManager). */
export const LOCAL_ORIGIN = Symbol('local');

export function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Opakowanie dokumentu Yjs tablicy: dodawanie/edycja/usuwanie elementów, cofanie/ponawianie.
 * Element jest niemutowalnym obiektem JSON w Y.Map – edycja zapisuje nową wersję obiektu.
 */
export class BoardModel {
  readonly elements: Y.Map<BoardElement>;
  readonly meta: Y.Map<unknown>;
  readonly undoManager: Y.UndoManager;

  constructor(readonly doc: Y.Doc) {
    this.elements = doc.getMap<BoardElement>(YDOC_ELEMENTS_KEY);
    this.meta = doc.getMap(YDOC_META_KEY);
    this.undoManager = new Y.UndoManager([this.elements, this.meta], {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 400,
    });
  }

  transact(fn: () => void) {
    this.doc.transact(fn, LOCAL_ORIGIN);
  }

  get(id: string) {
    return this.elements.get(id);
  }

  /** Elementy posortowane wg kolejności rysowania. */
  list(): BoardElement[] {
    return [...this.elements.values()].sort((a, b) => a.z - b.z || (a.id < b.id ? -1 : 1));
  }

  nextZ() {
    let max = 0;
    for (const e of this.elements.values()) if (e.z > max) max = e.z;
    return max + 1;
  }

  add(el: BoardElement) {
    this.transact(() => this.elements.set(el.id, el));
  }

  update(id: string, patch: Partial<BoardElement>) {
    const cur = this.elements.get(id);
    if (!cur) return;
    this.transact(() => this.elements.set(id, { ...cur, ...patch } as BoardElement));
  }

  replaceMany(els: BoardElement[]) {
    this.transact(() => {
      for (const el of els) if (this.elements.has(el.id)) this.elements.set(el.id, el);
    });
  }

  remove(ids: Iterable<string>) {
    this.transact(() => {
      for (const id of ids) this.elements.delete(id);
    });
  }

  clear() {
    this.transact(() => this.elements.clear());
  }

  bringToFront(ids: string[]) {
    let z = this.nextZ();
    this.transact(() => {
      for (const id of ids) {
        const el = this.elements.get(id);
        if (el) this.elements.set(id, { ...el, z: z++ });
      }
    });
  }

  get background(): BoardBackground {
    const background = this.meta.get('background');
    return background === 'blank' || background === 'dots' ? background : 'grid';
  }

  setBackground(bg: BoardBackground) {
    this.transact(() => this.meta.set('background', bg));
  }

  /** Zatrzymuje scalanie kolejnych zmian w jeden krok cofania (np. na początku gestu). */
  stopCapturing() {
    this.undoManager.stopCapturing();
  }

  undo() {
    this.undoManager.undo();
  }

  redo() {
    this.undoManager.redo();
  }

  destroy() {
    this.undoManager.destroy();
  }
}
