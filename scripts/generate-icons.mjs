// Generuje ikonę PNG (apple-touch-icon – skrót na ekranie iPada) bez zewnętrznych zależności.
// Użycie: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const segDist = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const polyDist = (px, py, pts) => Math.min(...pts.slice(1).map((p, i) => segDist(px, py, pts[i], p)));

// Układ 64×64 jak w icon.svg
const root2 = [[12, 36], [18, 32], [25, 48], [34, 16], [52, 16]];
const x1 = [[36, 30], [46, 42]];
const x2 = [[46, 30], [36, 42]];

function icon(size, rounded) {
  const s = size / 64;
  return png(size, (x, y) => {
    const u = x / s, v = y / s;
    if (rounded) {
      const r = 14, cx = Math.min(Math.max(u, r), 64 - r), cy = Math.min(Math.max(v, r), 64 - r);
      if (Math.hypot(u - cx, v - cy) > r) return [0, 0, 0, 0];
    }
    if (polyDist(u, v, root2) < 2.5) return [255, 255, 255, 255];
    if (polyDist(u, v, x1) < 2 || polyDist(u, v, x2) < 2) return [255, 212, 59, 255];
    return [28, 126, 214, 255];
  });
}

const pub = join(root, 'apps', 'client', 'public');
mkdirSync(pub, { recursive: true });
writeFileSync(join(pub, 'apple-touch-icon.png'), icon(180, false));
console.log('Ikona wygenerowana.');
