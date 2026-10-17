import { describe, expect, it } from 'vitest';
import { hexToHsv, hexToRgb, hsvToHex, normalizeHex, pushRecentColor, RECENT_MAX } from './color';

describe('kolory', () => {
  it('normalizuje zapis szesnastkowy', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex(' 1971c2 ')).toBe('#1971c2');
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
  });

  it('przelicza HEX ↔ RGB ↔ HSV bez strat', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00');
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000');
    for (const c of ['#1971c2', '#e03131', '#f08c00', '#2f9e44', '#ffffff', '#7a5b00', '#862e9c']) {
      expect(hsvToHex(hexToHsv(c))).toBe(c);
    }
  });

  it('pamięta ostatnie kolory bez duplikatów', () => {
    let list: string[] = [];
    for (let i = 0; i < 15; i++) list = pushRecentColor(`#0000${i.toString(16).padStart(2, '0')}`, list);
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0]).toBe('#00000e');
    list = pushRecentColor('#00000A', list);
    expect(list[0]).toBe('#00000a');
    expect(list.filter((c) => c === '#00000a')).toHaveLength(1);
    expect(pushRecentColor('zły', list)).toBe(list);
  });
});
