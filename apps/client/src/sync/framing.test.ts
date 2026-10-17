import { describe, expect, it } from 'vitest';
import { Reassembler, frame, fromBase64, toBase64, MsgType } from './framing';

describe('framing', () => {
  it('małe wiadomości nie są dzielone', () => {
    const parts = frame(MsgType.Update, new Uint8Array([1, 2, 3]));
    expect(parts).toHaveLength(1);
    expect([...new Reassembler().push(parts[0]!)!]).toEqual([MsgType.Update, 1, 2, 3]);
  });

  it('dzieli i składa duże wiadomości', () => {
    const payload = new Uint8Array(100_000).map((_, i) => i % 251);
    const parts = frame(MsgType.SyncStep2, payload, 1000);
    expect(parts.length).toBeGreaterThan(100);
    expect(parts.every((p) => p.length <= 1000)).toBe(true);
    const r = new Reassembler();
    let out: Uint8Array | null = null;
    for (const p of parts) out = r.push(p) ?? out;
    expect(out![0]).toBe(MsgType.SyncStep2);
    expect(out!.subarray(1)).toEqual(payload);
  });

  it('base64 w obie strony', () => {
    const b = new Uint8Array(70_000).map((_, i) => (i * 7) % 256);
    expect(fromBase64(toBase64(b))).toEqual(b);
  });
});
