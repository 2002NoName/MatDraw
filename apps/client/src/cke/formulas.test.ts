import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { CKE_MACROS, CKE_SECTIONS, findFormula, searchFormulas } from './formulas';
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
