export interface Hsv {
  /** Odcień 0–360. */
  h: number;
  /** Nasycenie 0–1. */
  s: number;
  /** Jasność 0–1. */
  v: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** `#abc`, `abc`, `#AABBCC` → `#aabbcc`; `null`, gdy to nie jest kolor szesnastkowy. */
export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex) ?? '#000000';
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex).map((x) => x / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  s = clamp01(s);
  v = clamp01(v);
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const [r, g, b] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  const m = v - c;
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

const RECENT_KEY = 'matdraw.recentColors';
export const RECENT_MAX = 10;

export function loadRecentColors(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.map((c) => normalizeHex(String(c))).filter((c): c is string => !!c).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/** Dopisuje kolor na początek listy ostatnio używanych (bez duplikatów). */
export function pushRecentColor(color: string, list = loadRecentColors()): string[] {
  const c = normalizeHex(color);
  if (!c) return list;
  const next = [c, ...list.filter((x) => x !== c)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* tryb prywatny – lista tylko w pamięci */
  }
  return next;
}
