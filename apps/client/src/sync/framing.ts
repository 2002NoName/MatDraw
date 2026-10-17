/**
 * Ramkowanie binarnych wiadomości kanału danych WebRTC.
 * Bajt 0 = typ wiadomości. Wiadomości większe niż MAX_MESSAGE są dzielone na fragmenty
 * (typ CHUNK: [3, id:u32, index:u16, total:u16, ...dane]), bo przeglądarki ograniczają
 * rozmiar pojedynczej wiadomości SCTP (bezpiecznie: 16 KiB).
 */

export const MsgType = {
  SyncStep1: 0,
  SyncStep2: 1,
  Update: 2,
  Chunk: 3,
} as const;

export const MAX_MESSAGE = 16 * 1024;
const HEADER = 9;

let nextId = 1;

export function frame(type: number, payload: Uint8Array, max = MAX_MESSAGE): Uint8Array[] {
  const full = new Uint8Array(payload.length + 1);
  full[0] = type;
  full.set(payload, 1);
  if (full.length <= max) return [full];
  const body = max - HEADER;
  const total = Math.ceil(full.length / body);
  if (total > 0xffff) throw new Error('Wiadomość zbyt duża');
  const id = nextId++ >>> 0;
  const out: Uint8Array[] = [];
  for (let i = 0; i < total; i++) {
    const part = full.subarray(i * body, (i + 1) * body);
    const msg = new Uint8Array(HEADER + part.length);
    const dv = new DataView(msg.buffer);
    msg[0] = MsgType.Chunk;
    dv.setUint32(1, id);
    dv.setUint16(5, i);
    dv.setUint16(7, total);
    msg.set(part, HEADER);
    out.push(msg);
  }
  return out;
}

/** Składa fragmenty z powrotem w pełne wiadomości (kanał jest uporządkowany i niezawodny). */
export class Reassembler {
  private pending = new Map<number, { parts: Uint8Array[]; received: number }>();

  /** Zwraca pełną wiadomość (z bajtem typu) lub null, jeśli czeka na kolejne fragmenty. */
  push(msg: Uint8Array): Uint8Array | null {
    if (msg[0] !== MsgType.Chunk) return msg;
    const dv = new DataView(msg.buffer, msg.byteOffset, msg.byteLength);
    const id = dv.getUint32(1), idx = dv.getUint16(5), total = dv.getUint16(7);
    let entry = this.pending.get(id);
    if (!entry) this.pending.set(id, (entry = { parts: new Array(total), received: 0 }));
    if (!entry.parts[idx]) entry.received++;
    entry.parts[idx] = msg.slice(HEADER);
    if (entry.received < total) return null;
    this.pending.delete(id);
    const size = entry.parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(size);
    let o = 0;
    for (const p of entry.parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  }
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
