import * as Y from 'yjs';
import type { Store } from '../store/types.js';

interface Entry {
  doc: Y.Doc;
  refs: number;
  dirty: boolean;
  timer: NodeJS.Timeout | null;
}

/**
 * Trzyma w pamięci dokumenty Yjs aktywnych tablic, scala nadsyłane aktualizacje
 * (CRDT – kolejność i duplikaty nie mają znaczenia) i zapisuje je do bazy z opóźnieniem.
 */
export class BoardStateManager {
  private entries = new Map<string, Entry>();
  private loading = new Map<string, Promise<Entry>>();

  constructor(
    private store: Store,
    private saveDelayMs = 2000,
  ) {}

  /** Liczba dokumentów aktualnie trzymanych w pamięci. */
  get loadedCount(): number {
    return this.entries.size;
  }

  private async load(boardId: string): Promise<Entry> {
    const existing = this.entries.get(boardId);
    if (existing) return existing;
    const pending = this.loading.get(boardId);
    if (pending) return pending;
    const p = (async () => {
      const doc = new Y.Doc();
      const data = await this.store.loadBoardState(boardId);
      if (data && data.length) Y.applyUpdate(doc, data);
      const entry: Entry = { doc, refs: 0, dirty: false, timer: null };
      this.entries.set(boardId, entry);
      this.loading.delete(boardId);
      return entry;
    })();
    this.loading.set(boardId, p);
    return p;
  }

  /** Rejestruje użytkownika tablicy i zwraca pełny stan dokumentu. */
  async acquire(boardId: string): Promise<Uint8Array> {
    const e = await this.load(boardId);
    e.refs++;
    return Y.encodeStateAsUpdate(e.doc);
  }

  async release(boardId: string) {
    const e = this.entries.get(boardId);
    if (!e) return;
    e.refs = Math.max(0, e.refs - 1);
    if (e.refs === 0) {
      await this.flush(boardId);
      if (e.refs === 0) {
        e.doc.destroy();
        this.entries.delete(boardId);
      }
    }
  }

  async getState(boardId: string): Promise<Uint8Array> {
    const live = this.entries.get(boardId);
    if (live) return Y.encodeStateAsUpdate(live.doc);
    return (await this.store.loadBoardState(boardId)) ?? Y.encodeStateAsUpdate(new Y.Doc());
  }

  async applyUpdate(boardId: string, update: Uint8Array) {
    const e = await this.load(boardId);
    Y.applyUpdate(e.doc, update);
    e.dirty = true;
    if (!e.timer) {
      e.timer = setTimeout(() => {
        e.timer = null;
        void this.flush(boardId).catch((err) => console.error('[state] zapis nieudany', boardId, err));
      }, this.saveDelayMs);
    }
  }

  async flush(boardId: string) {
    const e = this.entries.get(boardId);
    if (!e) return;
    if (e.timer) {
      clearTimeout(e.timer);
      e.timer = null;
    }
    if (!e.dirty) return;
    e.dirty = false;
    await this.store.saveBoardState(boardId, Y.encodeStateAsUpdate(e.doc));
    await this.store.touchBoard(boardId);
  }

  /** Usuwa tablicę z pamięci bez zapisu (np. po jej skasowaniu). */
  discard(boardId: string) {
    const e = this.entries.get(boardId);
    if (!e) return;
    if (e.timer) clearTimeout(e.timer);
    e.doc.destroy();
    this.entries.delete(boardId);
  }

  async flushAll() {
    await Promise.all([...this.entries.keys()].map((id) => this.flush(id)));
  }
}
