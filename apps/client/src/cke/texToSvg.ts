import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import 'mathjax-full/js/input/tex/base/BaseConfiguration.js';
import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';
import 'mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js';
import 'mathjax-full/js/input/tex/configmacros/ConfigMacrosConfiguration.js';
import { CKE_MACROS } from './formulas';

/**
 * Zamiana LaTeX → samodzielny obraz SVG (ścieżki glifów, bez zależności od fontów),
 * używany przy przeciąganiu wzorów CKE na tablicę. Moduł ładowany leniwie (import()).
 */

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const macros = Object.fromEntries(Object.entries(CKE_MACROS).map(([k, v]) => [k.replace(/^\\/, ''), v]));
const doc = mathjax.document('', {
  InputJax: new TeX({ packages: ['base', 'ams', 'newcommand', 'configmacros'], macros }),
  OutputJax: new SVG({ fontCache: 'none' }),
});

/** Piksele na jednostkę ex przy fontSize 20 px (MathJax: 1ex ≈ 0.431em). */
const EX = 8.6;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface FormulaSvg {
  svg: string;
  width: number;
  height: number;
}

/** Sam wzór jako SVG (wymiary w px). */
export function texToSvg(latex: string, color = '#212529'): FormulaSvg {
  const node = doc.convert(latex, { display: true, em: 20, ex: EX, containerWidth: 1600 });
  const svg = adaptor.firstChild(node) as ReturnType<typeof adaptor.firstChild>;
  const el = svg as Parameters<typeof adaptor.getAttribute>[0];
  const err = /data-mjx-error="([^"]*)"/.exec(adaptor.outerHTML(el));
  if (err) throw new Error(`Błąd LaTeX: ${err[1]}`);
  const width = parseFloat(adaptor.getAttribute(el, 'width')) * EX;
  const height = parseFloat(adaptor.getAttribute(el, 'height')) * EX;
  adaptor.setAttribute(el, 'width', width.toFixed(2));
  adaptor.setAttribute(el, 'height', height.toFixed(2));
  adaptor.removeAttribute(el, 'style');
  adaptor.setAttribute(el, 'color', color);
  return { svg: adaptor.outerHTML(el), width, height };
}

/** Karta wzoru: tytuł + wzór na białym tle z ramką – czytelna na każdym tle tablicy. */
export function formulaCardSvg(title: string, latex: string): FormulaSvg {
  const f = texToSvg(latex);
  const pad = 18;
  const titleH = title ? 30 : 0;
  const width = Math.ceil(Math.max(f.width, title.length * 8.2) + pad * 2);
  const height = Math.ceil(f.height + titleH + pad * 2);
  const fx = (width - f.width) / 2;
  const inner = f.svg.replace(/^<svg/, `<svg x="${fx.toFixed(2)}" y="${pad + titleH}"`);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="10" fill="#fffdf4" stroke="#f0c36d" stroke-width="2"/>` +
    (title
      ? `<text x="${pad}" y="${pad + 14}" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" font-size="15" font-weight="600" fill="#7a5b00">${esc(title)}</text>`
      : '') +
    inner +
    `</svg>`;
  return { svg, width, height };
}

/** SVG → data URL (base64, UTF-8). */
export function svgToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}
