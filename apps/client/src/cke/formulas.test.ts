import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { CKE_MACROS, CKE_SECTIONS, findFormula, fmt4, searchFormulas, trigTableRows } from './formulas';
import { CKE_INFO } from './formulaInfo';
import { formulaCardSvg, svgToDataUrl, texToSvg } from './texToSvg';

const all = CKE_SECTIONS.flatMap((s) => s.items);

describe('wzory CKE', () => {
  it('mają unikalne identyfikatory', () => {
    expect(new Set(all.map((f) => f.id)).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(80);
  });

  it.each(all.map((f) => [f.id, f.latex]))('KaTeX renderuje %s', (_id, latex) => {
    expect(() => katex.renderToString(latex, { displayMode: true, throwOnError: true, macros: { ...CKE_MACROS } })).not.toThrow();
  });

  it.each(all.map((f) => [f.id, f.latex]))('MathJax tworzy SVG dla %s', (_id, latex) => {
    const r = texToSvg(latex);
    expect(r.width).toBeGreaterThan(5);
    expect(r.height).toBeGreaterThan(5);
    expect(r.svg).toMatch(/^<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(r.svg).toContain('<path');
    expect(r.svg).not.toContain('data-mjx-error');
  });

  it('karta wzoru to samodzielny obraz SVG', () => {
    const f = findFormula('quad-delta')!;
    const card = formulaCardSvg(f.title, f.latex);
    expect(card.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(card.svg).toContain('Wyróżnik');
    const url = svgToDataUrl(card.svg);
    expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(Buffer.from(url.split(',')[1]!, 'base64').toString('utf8')).toBe(card.svg);
  });

  it('wyszukiwanie ignoruje polskie znaki', () => {
    const r = searchFormulas('wyroznik');
    expect(r.flatMap((s) => s.items).some((f) => f.id === 'quad-delta')).toBe(true);
    expect(searchFormulas('stozek').flatMap((s) => s.items).map((f) => f.id)).toContain('cone');
  });

  it('błędny LaTeX zgłasza wyjątek', () => {
    expect(() => texToSvg('\\frac{1}{')).toThrow();
  });
});

describe('tablica wartości funkcji trygonometrycznych', () => {
  it('zawiera wiersze dla 0°–90° z wartościami do 4 miejsc', () => {
    const rows = trigTableRows(0, 90);
    expect(rows).toHaveLength(91);
    const at = (d: number) => rows.find((r) => r.deg === d)!;
    expect(at(30).sin).toBe('0{,}5000');
    expect(at(60).cos).toBe('0{,}5000');
    expect(at(45).tg).toBe('1{,}0000');
    expect(at(12).sin).toBe('0{,}2079');
    expect(at(0).tg).toBe('0{,}0000');
    expect(at(90).tg).toBe('\\text{—}');
    expect(fmt4(-0.30901)).toBe('-0{,}3090');
  });
});

describe('opisy wzorów', () => {
  it('każdy wzór ma opis, zastosowanie i przykład', () => {
    const missing = all.filter((f) => !CKE_INFO[f.id]).map((f) => f.id);
    expect(missing).toEqual([]);
    for (const f of all) {
      const i = CKE_INFO[f.id]!;
      expect(i.about.length, f.id).toBeGreaterThan(20);
      expect(i.use.length, f.id).toBeGreaterThan(20);
      expect(i.example.length, f.id).toBeGreaterThan(5);
    }
    const ids = new Set(all.map((f) => f.id));
    expect(Object.keys(CKE_INFO).filter((id) => !ids.has(id))).toEqual([]);
  });

  it.each(Object.entries(CKE_INFO))('wstawki matematyczne w opisie %s są poprawne', (_id, info) => {
    for (const text of [info.about, info.use, info.example]) {
      const parts = text.split('$');
      expect(parts.length % 2, 'niesparowany $').toBe(1);
      parts.forEach((p, i) => {
        if (i % 2) expect(() => katex.renderToString(p, { throwOnError: true, macros: { ...CKE_MACROS } }), p).not.toThrow();
      });
    }
  });
});
