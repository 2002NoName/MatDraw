/**
 * Zestaw wzorów odpowiadający broszurze CKE „Wybrane wzory matematyczne” (egzamin maturalny z matematyki,
 * poziom podstawowy i rozszerzony). Wzory zapisane samodzielnie w LaTeX, pogrupowane jak w broszurze.
 * Pole `ext` oznacza wzory dotyczące tylko poziomu rozszerzonego.
 */
export interface CkeFormula {
  id: string;
  title: string;
  latex: string;
  ext?: boolean;
}

export interface CkeSection {
  id: string;
  title: string;
  items: CkeFormula[];
}

/** Wartość z dokładnością do 4 miejsc po przecinku, z przecinkiem dziesiętnym jak w tablicach CKE. */
export function fmt4(x: number): string {
  const s = (Math.abs(x) < 5e-5 ? 0 : x).toFixed(4);
  return s.replace('.', '{,}');
}

/** Tablica sin/cos/tg dla kątów całkowitych od `from`° do `to`° (jak w broszurze CKE). */
export function trigTableRows(from: number, to: number): { deg: number; sin: string; cos: string; tg: string }[] {
  const rows = [];
  for (let d = from; d <= to; d++) {
    const r = (d * Math.PI) / 180;
    rows.push({ deg: d, sin: fmt4(Math.sin(r)), cos: fmt4(Math.cos(r)), tg: d === 90 ? '\\text{—}' : fmt4(Math.tan(r)) });
  }
  return rows;
}

function trigTable(id: string, from: number, to: number): CkeFormula {
  const rows = trigTableRows(from, to)
    .map((r) => `${r.deg}^\\circ & ${r.sin} & ${r.cos} & ${r.tg}`)
    .join(' \\\\ ');
  return {
    id,
    title: `Tablica wartości sin, cos, tg: ${from}°–${to}°`,
    latex: `\\begin{array}{c|ccc} \\alpha & \\sin \\alpha & \\cos \\alpha & \\tg \\alpha \\\\ \\hline ${rows} \\end{array}`,
  };
}

export const CKE_SECTIONS: CkeSection[] = [
  {
    id: 'abs',
    title: '1. Wartość bezwzględna liczby',
    items: [
      { id: 'abs-def', title: 'Definicja wartości bezwzględnej', latex: '|x| = \\begin{cases} x & \\text{dla } x \\ge 0 \\\\ -x & \\text{dla } x < 0 \\end{cases}' },
      { id: 'abs-sqrt', title: 'Wartość bezwzględna a pierwiastek', latex: '|x| = \\sqrt{x^2}' },
      { id: 'abs-ineq1', title: 'Nierówność |x − a| ≤ r', latex: '|x - a| \\le r \\iff a - r \\le x \\le a + r' },
      { id: 'abs-ineq2', title: 'Nierówność |x − a| ≥ r', latex: '|x - a| \\ge r \\iff x \\le a - r \\ \\lor \\ x \\ge a + r' },
      { id: 'abs-prop', title: 'Własności wartości bezwzględnej', latex: '\\begin{gathered} |x \\cdot y| = |x| \\cdot |y| \\qquad \\left|\\frac{x}{y}\\right| = \\frac{|x|}{|y|} \\\\ |x + y| \\le |x| + |y| \\end{gathered}' },
    ],
  },
  {
    id: 'pow',
    title: '2. Potęgi i pierwiastki',
    items: [
      { id: 'pow-def', title: 'Potęga o wykładniku naturalnym', latex: 'a^n = \\underbrace{a \\cdot a \\cdot \\ldots \\cdot a}_{n}, \\qquad a^0 = 1 \\ (a \\ne 0)' },
      { id: 'pow-neg', title: 'Potęga o wykładniku ujemnym', latex: 'a^{-n} = \\frac{1}{a^n} \\qquad (a \\ne 0)' },
      { id: 'pow-frac', title: 'Potęga o wykładniku wymiernym', latex: 'a^{\\frac{m}{n}} = \\sqrt[n]{a^m}, \\qquad a^{-\\frac{m}{n}} = \\frac{1}{\\sqrt[n]{a^m}} \\qquad (a > 0)' },
      { id: 'pow-rules', title: 'Działania na potęgach', latex: '\\begin{gathered} a^r \\cdot a^s = a^{r+s} \\qquad \\frac{a^r}{a^s} = a^{r-s} \\qquad (a^r)^s = a^{r \\cdot s} \\\\ (a \\cdot b)^r = a^r \\cdot b^r \\qquad \\left(\\frac{a}{b}\\right)^r = \\frac{a^r}{b^r} \\end{gathered}' },
      { id: 'root-def', title: 'Pierwiastek arytmetyczny', latex: '\\sqrt[n]{a} = b \\iff b^n = a \\qquad (a \\ge 0,\\ b \\ge 0)' },
      { id: 'root-odd', title: 'Pierwiastek stopnia nieparzystego z liczby ujemnej', latex: '\\sqrt[n]{a} = -\\sqrt[n]{-a} \\qquad (a < 0,\\ n \\text{ nieparzyste})' },
      { id: 'root-rules', title: 'Działania na pierwiastkach', latex: '\\sqrt[n]{a \\cdot b} = \\sqrt[n]{a} \\cdot \\sqrt[n]{b} \\qquad \\sqrt[n]{\\frac{a}{b}} = \\frac{\\sqrt[n]{a}}{\\sqrt[n]{b}}' },
    ],
  },
  {
    id: 'log',
    title: '3. Logarytmy',
    items: [
      { id: 'log-def', title: 'Definicja logarytmu', latex: '\\log_a c = b \\iff a^b = c \\qquad (a > 0,\\ a \\ne 1,\\ c > 0)' },
      { id: 'log-basic', title: 'Podstawowe równości', latex: '\\log_a 1 = 0 \\qquad \\log_a a = 1 \\qquad a^{\\log_a c} = c' },
      { id: 'log-sum', title: 'Logarytm iloczynu i ilorazu', latex: '\\begin{gathered} \\log_a (x \\cdot y) = \\log_a x + \\log_a y \\\\ \\log_a \\frac{x}{y} = \\log_a x - \\log_a y \\end{gathered}' },
      { id: 'log-pow', title: 'Logarytm potęgi', latex: '\\log_a x^r = r \\cdot \\log_a x' },
      { id: 'log-change', title: 'Zamiana podstawy logarytmu', latex: '\\log_a c = \\frac{\\log_b c}{\\log_b a}' },
      { id: 'log-dec', title: 'Logarytm dziesiętny', latex: '\\log x = \\log_{10} x' },
    ],
  },
  {
    id: 'newton',
    title: '4. Silnia. Współczynnik dwumianowy. Dwumian Newtona',
    items: [
      { id: 'fact', title: 'Silnia', latex: '0! = 1, \\qquad n! = 1 \\cdot 2 \\cdot \\ldots \\cdot n, \\qquad (n+1)! = n! \\cdot (n+1)' },
      { id: 'binom', title: 'Współczynnik dwumianowy (symbol Newtona)', latex: '\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!} \\qquad (0 \\le k \\le n)' },
      { id: 'binom-prop', title: 'Własności symbolu Newtona', latex: '\\binom{n}{k} = \\binom{n}{n-k} \\qquad \\binom{n}{k} + \\binom{n}{k+1} = \\binom{n+1}{k+1}' },
      { id: 'binom-thm', title: 'Wzór dwumianowy Newtona', latex: '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k', ext: true },
    ],
  },
  {
    id: 'mult',
    title: '5. Wzory skróconego mnożenia',
    items: [
      { id: 'sq-sum', title: 'Kwadrat sumy i różnicy', latex: '(a \\pm b)^2 = a^2 \\pm 2ab + b^2' },
      { id: 'cube-sum', title: 'Sześcian sumy i różnicy', latex: '(a \\pm b)^3 = a^3 \\pm 3a^2b + 3ab^2 \\pm b^3' },
      { id: 'sq-diff', title: 'Różnica kwadratów', latex: 'a^2 - b^2 = (a - b)(a + b)' },
      { id: 'cube-diff', title: 'Suma i różnica sześcianów', latex: '\\begin{gathered} a^3 + b^3 = (a + b)(a^2 - ab + b^2) \\\\ a^3 - b^3 = (a - b)(a^2 + ab + b^2) \\end{gathered}' },
      { id: 'pow-diff', title: 'Różnica n-tych potęg', latex: 'a^n - b^n = (a - b)(a^{n-1} + a^{n-2}b + \\ldots + ab^{n-2} + b^{n-1})', ext: true },
    ],
  },
  {
    id: 'seq',
    title: '6. Ciągi',
    items: [
      { id: 'arith-n', title: 'Ciąg arytmetyczny – wyraz ogólny', latex: 'a_n = a_1 + (n - 1)\\,r' },
      { id: 'arith-s', title: 'Ciąg arytmetyczny – suma n wyrazów', latex: 'S_n = \\frac{a_1 + a_n}{2} \\cdot n = \\frac{2a_1 + (n-1)\\,r}{2} \\cdot n' },
      { id: 'arith-mid', title: 'Ciąg arytmetyczny – średnia sąsiednich wyrazów', latex: 'a_n = \\frac{a_{n-1} + a_{n+1}}{2} \\qquad (n \\ge 2)' },
      { id: 'geom-n', title: 'Ciąg geometryczny – wyraz ogólny', latex: 'a_n = a_1 \\cdot q^{\\,n-1}' },
      { id: 'geom-s', title: 'Ciąg geometryczny – suma n wyrazów', latex: 'S_n = \\begin{cases} a_1 \\cdot \\dfrac{1 - q^n}{1 - q} & \\text{dla } q \\ne 1 \\\\ n \\cdot a_1 & \\text{dla } q = 1 \\end{cases}' },
      { id: 'geom-mid', title: 'Ciąg geometryczny – kwadrat wyrazu', latex: 'a_n^2 = a_{n-1} \\cdot a_{n+1} \\qquad (n \\ge 2)' },
      { id: 'geom-inf', title: 'Szereg geometryczny zbieżny', latex: 'S = \\frac{a_1}{1 - q} \\qquad (|q| < 1)', ext: true },
      { id: 'interest', title: 'Procent składany', latex: 'K_n = K \\cdot \\left(1 + \\frac{p}{100}\\right)^n' },
    ],
  },
  {
    id: 'func',
    title: '7. Funkcja liniowa i kwadratowa',
    items: [
      { id: 'lin', title: 'Funkcja liniowa', latex: 'f(x) = ax + b, \\qquad a = \\tg \\alpha' },
      { id: 'quad-forms', title: 'Postać ogólna i kanoniczna', latex: 'f(x) = ax^2 + bx + c = a(x - p)^2 + q \\qquad (a \\ne 0)' },
      { id: 'quad-vertex', title: 'Wierzchołek paraboli', latex: 'W = (p, q), \\qquad p = \\frac{-b}{2a}, \\qquad q = \\frac{-\\Delta}{4a}' },
      { id: 'quad-delta', title: 'Wyróżnik trójmianu kwadratowego', latex: '\\Delta = b^2 - 4ac' },
      { id: 'quad-roots', title: 'Miejsca zerowe (Δ ≥ 0)', latex: 'x_1 = \\frac{-b - \\sqrt{\\Delta}}{2a}, \\qquad x_2 = \\frac{-b + \\sqrt{\\Delta}}{2a}' },
      { id: 'quad-fact', title: 'Postać iloczynowa', latex: 'f(x) = a(x - x_1)(x - x_2) \\qquad (\\Delta \\ge 0)' },
      { id: 'viete', title: 'Wzory Viète’a', latex: 'x_1 + x_2 = \\frac{-b}{a}, \\qquad x_1 \\cdot x_2 = \\frac{c}{a}' },
    ],
  },
  {
    id: 'trig',
    title: '8. Trygonometria',
    items: [
      { id: 'trig-def', title: 'Definicje w trójkącie prostokątnym', latex: '\\sin \\alpha = \\frac{a}{c}, \\quad \\cos \\alpha = \\frac{b}{c}, \\quad \\tg \\alpha = \\frac{a}{b}' },
      { id: 'trig-unit', title: 'Definicje w układzie współrzędnych', latex: '\\sin \\alpha = \\frac{y}{r}, \\quad \\cos \\alpha = \\frac{x}{r}, \\quad \\tg \\alpha = \\frac{y}{x}, \\qquad r = \\sqrt{x^2 + y^2}' },
      { id: 'trig-one', title: 'Jedynka trygonometryczna', latex: '\\sin^2 \\alpha + \\cos^2 \\alpha = 1' },
      { id: 'trig-tg', title: 'Tangens', latex: '\\tg \\alpha = \\frac{\\sin \\alpha}{\\cos \\alpha} \\qquad (\\cos \\alpha \\ne 0)' },
      { id: 'trig-reduce', title: 'Wzory redukcyjne (wybrane)', latex: '\\begin{gathered} \\sin(90^\\circ - \\alpha) = \\cos \\alpha \\qquad \\cos(90^\\circ - \\alpha) = \\sin \\alpha \\\\ \\sin(180^\\circ - \\alpha) = \\sin \\alpha \\qquad \\cos(180^\\circ - \\alpha) = -\\cos \\alpha \\end{gathered}' },
      { id: 'trig-values', title: 'Wartości dla kątów 0°, 30°, 45°, 60°, 90°', latex: '\\begin{array}{c|ccccc} \\alpha & 0^\\circ & 30^\\circ & 45^\\circ & 60^\\circ & 90^\\circ \\\\ \\hline \\sin \\alpha & 0 & \\frac{1}{2} & \\frac{\\sqrt{2}}{2} & \\frac{\\sqrt{3}}{2} & 1 \\\\ \\cos \\alpha & 1 & \\frac{\\sqrt{3}}{2} & \\frac{\\sqrt{2}}{2} & \\frac{1}{2} & 0 \\\\ \\tg \\alpha & 0 & \\frac{\\sqrt{3}}{3} & 1 & \\sqrt{3} & \\text{—} \\end{array}' },
      { id: 'trig-values-obtuse', title: 'Wartości dla kątów 120°, 135°, 150°, 180°', latex: '\\begin{array}{c|cccc} \\alpha & 120^\\circ & 135^\\circ & 150^\\circ & 180^\\circ \\\\ \\hline \\sin \\alpha & \\frac{\\sqrt{3}}{2} & \\frac{\\sqrt{2}}{2} & \\frac{1}{2} & 0 \\\\ \\cos \\alpha & -\\frac{1}{2} & -\\frac{\\sqrt{2}}{2} & -\\frac{\\sqrt{3}}{2} & -1 \\\\ \\tg \\alpha & -\\sqrt{3} & -1 & -\\frac{\\sqrt{3}}{3} & 0 \\end{array}' },
      { id: 'trig-sum', title: 'Sinus i cosinus sumy i różnicy kątów', latex: '\\begin{gathered} \\sin(\\alpha \\pm \\beta) = \\sin \\alpha \\cos \\beta \\pm \\cos \\alpha \\sin \\beta \\\\ \\cos(\\alpha \\pm \\beta) = \\cos \\alpha \\cos \\beta \\mp \\sin \\alpha \\sin \\beta \\end{gathered}', ext: true },
      { id: 'trig-tgsum', title: 'Tangens sumy i różnicy kątów', latex: '\\tg(\\alpha \\pm \\beta) = \\frac{\\tg \\alpha \\pm \\tg \\beta}{1 \\mp \\tg \\alpha \\tg \\beta}', ext: true },
      { id: 'trig-double', title: 'Funkcje kąta podwojonego', latex: '\\begin{gathered} \\sin 2\\alpha = 2 \\sin \\alpha \\cos \\alpha \\\\ \\cos 2\\alpha = \\cos^2 \\alpha - \\sin^2 \\alpha = 2\\cos^2 \\alpha - 1 = 1 - 2\\sin^2 \\alpha \\end{gathered}', ext: true },
      { id: 'trig-sumprod', title: 'Sumy i różnice sinusów oraz cosinusów', latex: '\\begin{gathered} \\sin \\alpha + \\sin \\beta = 2 \\sin \\frac{\\alpha + \\beta}{2} \\cos \\frac{\\alpha - \\beta}{2} \\\\ \\sin \\alpha - \\sin \\beta = 2 \\cos \\frac{\\alpha + \\beta}{2} \\sin \\frac{\\alpha - \\beta}{2} \\\\ \\cos \\alpha + \\cos \\beta = 2 \\cos \\frac{\\alpha + \\beta}{2} \\cos \\frac{\\alpha - \\beta}{2} \\\\ \\cos \\alpha - \\cos \\beta = -2 \\sin \\frac{\\alpha + \\beta}{2} \\sin \\frac{\\alpha - \\beta}{2} \\end{gathered}', ext: true },
      { id: 'trig-period', title: 'Okresowość', latex: '\\sin(\\alpha + 2k\\pi) = \\sin \\alpha, \\quad \\cos(\\alpha + 2k\\pi) = \\cos \\alpha, \\quad \\tg(\\alpha + k\\pi) = \\tg \\alpha', ext: true },
    ],
  },
  {
    id: 'plan',
    title: '9. Planimetria',
    items: [
      { id: 'tri-area', title: 'Pole trójkąta', latex: 'P = \\frac{1}{2} a \\cdot h_a = \\frac{1}{2} a b \\sin \\gamma' },
      { id: 'heron', title: 'Wzór Herona', latex: 'P = \\sqrt{p(p-a)(p-b)(p-c)}, \\qquad p = \\frac{a + b + c}{2}' },
      { id: 'tri-rR', title: 'Pole a promienie okręgów', latex: 'P = \\frac{abc}{4R} = r \\cdot p \\qquad \\left(p = \\frac{a+b+c}{2}\\right)' },
      { id: 'pyth', title: 'Twierdzenie Pitagorasa', latex: 'a^2 + b^2 = c^2' },
      { id: 'right-tri', title: 'Trójkąt prostokątny – wysokość i promienie', latex: 'h_c = \\frac{ab}{c}, \\qquad h_c^2 = |AD| \\cdot |DB|, \\qquad R = \\frac{c}{2}, \\qquad r = \\frac{a + b - c}{2}' },
      { id: 'equi', title: 'Trójkąt równoboczny', latex: 'h = \\frac{a\\sqrt{3}}{2}, \\qquad P = \\frac{a^2\\sqrt{3}}{4}, \\qquad R = \\frac{2}{3}h, \\qquad r = \\frac{1}{3}h' },
      { id: 'sines', title: 'Twierdzenie sinusów', latex: '\\frac{a}{\\sin \\alpha} = \\frac{b}{\\sin \\beta} = \\frac{c}{\\sin \\gamma} = 2R' },
      { id: 'cosines', title: 'Twierdzenie cosinusów', latex: 'c^2 = a^2 + b^2 - 2ab \\cos \\gamma' },
      { id: 'quad-areas', title: 'Pola czworokątów', latex: '\\begin{gathered} P_{\\text{równoległoboku}} = a \\cdot h = ab \\sin \\alpha = \\tfrac{1}{2} d_1 d_2 \\sin \\varphi \\\\ P_{\\text{rombu}} = \\tfrac{1}{2} d_1 d_2 \\qquad P_{\\text{trapezu}} = \\frac{a + b}{2} \\cdot h \\end{gathered}' },
      { id: 'inscribed', title: 'Czworokąt wpisany i opisany na okręgu', latex: '\\begin{gathered} \\text{wpisany w okrąg: } \\alpha + \\gamma = \\beta + \\delta = 180^\\circ \\\\ \\text{opisany na okręgu: } a + c = b + d \\end{gathered}' },
      { id: 'circle', title: 'Koło i okrąg', latex: 'P = \\pi r^2, \\qquad L = 2\\pi r' },
      { id: 'sector', title: 'Wycinek koła i długość łuku', latex: 'P = \\pi r^2 \\cdot \\frac{\\alpha}{360^\\circ}, \\qquad l = 2\\pi r \\cdot \\frac{\\alpha}{360^\\circ}' },
      { id: 'angles', title: 'Kąt środkowy i wpisany (oparte na tym samym łuku)', latex: '\\alpha_{\\text{środkowy}} = 2 \\cdot \\alpha_{\\text{wpisany}}' },
      { id: 'thales', title: 'Twierdzenie Talesa', latex: "\\frac{|OA|}{|AA'|} = \\frac{|OB|}{|BB'|} \\iff AB \\parallel A'B'" },
      { id: 'similar', title: 'Figury podobne w skali k', latex: '\\frac{L_1}{L_2} = k, \\qquad \\frac{P_1}{P_2} = k^2' },
      { id: 'polygon', title: 'Wielokąt wypukły – suma kątów i liczba przekątnych', latex: 'S = (n - 2) \\cdot 180^\\circ, \\qquad d = \\frac{n(n-3)}{2}' },
    ],
  },
  {
    id: 'anal',
    title: '10. Geometria analityczna',
    items: [
      { id: 'dist', title: 'Długość odcinka', latex: '|AB| = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}' },
      { id: 'mid', title: 'Środek odcinka', latex: 'S = \\left( \\frac{x_A + x_B}{2}, \\frac{y_A + y_B}{2} \\right)' },
      { id: 'vec', title: 'Współrzędne i długość wektora', latex: '\\overrightarrow{AB} = [x_B - x_A,\\ y_B - y_A], \\qquad |\\vec{v}| = \\sqrt{v_x^2 + v_y^2}' },
      { id: 'line-forms', title: 'Równanie prostej', latex: '\\begin{gathered} Ax + By + C = 0 \\quad (A^2 + B^2 \\ne 0) \\\\ y = ax + b \\end{gathered}' },
      { id: 'line-2pts', title: 'Prosta przez dwa punkty', latex: '(y - y_A)(x_B - x_A) - (y_B - y_A)(x - x_A) = 0' },
      { id: 'line-pt-slope', title: 'Prosta o współczynniku a przez punkt', latex: 'y = a(x - x_0) + y_0' },
      { id: 'parallel', title: 'Proste równoległe i prostopadłe', latex: 'k \\parallel l \\iff a_1 = a_2, \\qquad k \\perp l \\iff a_1 \\cdot a_2 = -1' },
      { id: 'pt-line', title: 'Odległość punktu od prostej', latex: 'd = \\frac{|Ax_0 + By_0 + C|}{\\sqrt{A^2 + B^2}}' },
      { id: 'tri-coords', title: 'Pole trójkąta o danych wierzchołkach', latex: 'P = \\frac{1}{2} \\left| (x_B - x_A)(y_C - y_A) - (y_B - y_A)(x_C - x_A) \\right|' },
      { id: 'circle-eq', title: 'Równanie okręgu', latex: '\\begin{gathered} (x - a)^2 + (y - b)^2 = r^2 \\\\ x^2 + y^2 - 2ax - 2by + c = 0, \\quad r^2 = a^2 + b^2 - c > 0 \\end{gathered}' },
      { id: 'tri-centroid', title: 'Środek ciężkości trójkąta', latex: 'S = \\left( \\frac{x_A + x_B + x_C}{3}, \\frac{y_A + y_B + y_C}{3} \\right)' },
    ],
  },
  {
    id: 'stereo',
    title: '11. Stereometria',
    items: [
      { id: 'prism', title: 'Graniastosłup', latex: 'V = P_p \\cdot H, \\qquad P_c = 2P_p + P_b' },
      { id: 'cuboid', title: 'Prostopadłościan', latex: 'V = abc, \\qquad P_c = 2(ab + bc + ac), \\qquad d = \\sqrt{a^2 + b^2 + c^2}' },
      { id: 'cube', title: 'Sześcian', latex: 'V = a^3, \\qquad P_c = 6a^2, \\qquad d = a\\sqrt{3}' },
      { id: 'pyramid', title: 'Ostrosłup', latex: 'V = \\frac{1}{3} P_p \\cdot H, \\qquad P_c = P_p + P_b' },
      { id: 'cylinder', title: 'Walec', latex: 'V = \\pi r^2 H, \\qquad P_b = 2\\pi r H, \\qquad P_c = 2\\pi r(r + H)' },
      { id: 'cone', title: 'Stożek', latex: 'V = \\frac{1}{3} \\pi r^2 H, \\qquad P_b = \\pi r l, \\qquad P_c = \\pi r(r + l)' },
      { id: 'sphere', title: 'Kula', latex: 'V = \\frac{4}{3} \\pi R^3, \\qquad P = 4\\pi R^2' },
      { id: 'tetra', title: 'Czworościan foremny', latex: 'H = \\frac{a\\sqrt{6}}{3}, \\qquad V = \\frac{a^3\\sqrt{2}}{12}, \\qquad P_c = a^2\\sqrt{3}' },
    ],
  },
  {
    id: 'comb',
    title: '12. Kombinatoryka',
    items: [
      { id: 'perm', title: 'Permutacje', latex: 'P_n = n!' },
      { id: 'var', title: 'Wariacje bez powtórzeń', latex: 'V_n^k = \\frac{n!}{(n-k)!} = n(n-1)\\ldots(n-k+1)' },
      { id: 'var-rep', title: 'Wariacje z powtórzeniami', latex: 'W_n^k = n^k' },
      { id: 'comb-k', title: 'Kombinacje', latex: 'C_n^k = \\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}' },
      { id: 'rule-mult', title: 'Reguła mnożenia (k kolejnych wyborów)', latex: 'n_1 \\cdot n_2 \\cdot \\ldots \\cdot n_k' },
    ],
  },
  {
    id: 'prob',
    title: '13. Rachunek prawdopodobieństwa',
    items: [
      { id: 'classic', title: 'Klasyczna definicja prawdopodobieństwa', latex: 'P(A) = \\frac{|A|}{|\\Omega|}' },
      { id: 'prob-prop', title: 'Własności prawdopodobieństwa', latex: "\\begin{gathered} 0 \\le P(A) \\le 1, \\qquad P(\\Omega) = 1, \\qquad P(\\varnothing) = 0 \\\\ P(A') = 1 - P(A) \\\\ P(A \\cup B) = P(A) + P(B) - P(A \\cap B) \\end{gathered}" },
      { id: 'cond', title: 'Prawdopodobieństwo warunkowe', latex: 'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} \\qquad (P(B) > 0)', ext: true },
      { id: 'total', title: 'Prawdopodobieństwo całkowite', latex: 'P(A) = P(A \\mid B_1)P(B_1) + \\ldots + P(A \\mid B_n)P(B_n)', ext: true },
      { id: 'bernoulli', title: 'Schemat Bernoulliego', latex: 'P_n(k) = \\binom{n}{k} p^k (1 - p)^{n-k}', ext: true },
    ],
  },
  {
    id: 'stat',
    title: '14. Parametry danych statystycznych',
    items: [
      { id: 'mean', title: 'Średnia arytmetyczna', latex: '\\bar{x} = \\frac{x_1 + x_2 + \\ldots + x_n}{n}' },
      { id: 'wmean', title: 'Średnia ważona', latex: '\\bar{x} = \\frac{w_1 x_1 + w_2 x_2 + \\ldots + w_n x_n}{w_1 + w_2 + \\ldots + w_n}' },
      { id: 'gmean', title: 'Średnia geometryczna', latex: '\\sqrt[n]{x_1 \\cdot x_2 \\cdot \\ldots \\cdot x_n} \\qquad (x_i \\ge 0)' },
      { id: 'median', title: 'Mediana (dane uporządkowane niemalejąco)', latex: 'M = \\begin{cases} x_{\\frac{n+1}{2}} & \\text{dla } n \\text{ nieparzystego} \\\\ \\dfrac{x_{\\frac{n}{2}} + x_{\\frac{n}{2}+1}}{2} & \\text{dla } n \\text{ parzystego} \\end{cases}' },
      { id: 'variance', title: 'Wariancja', latex: '\\sigma^2 = \\frac{(x_1 - \\bar{x})^2 + \\ldots + (x_n - \\bar{x})^2}{n} = \\frac{x_1^2 + \\ldots + x_n^2}{n} - \\bar{x}^2' },
      { id: 'stddev', title: 'Odchylenie standardowe', latex: '\\sigma = \\sqrt{\\sigma^2}' },
    ],
  },
  {
    id: 'calc',
    title: '15. Granice i pochodne',
    items: [
      { id: 'lim-ops', title: 'Działania na granicach ciągów', latex: '\\begin{gathered} \\lim (a_n \\pm b_n) = a \\pm b, \\qquad \\lim (a_n \\cdot b_n) = a \\cdot b \\\\ \\lim \\frac{a_n}{b_n} = \\frac{a}{b} \\quad (b_n \\ne 0,\\ b \\ne 0) \\end{gathered}', ext: true },
      { id: 'lim-e', title: 'Liczba e', latex: '\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e \\approx 2{,}718', ext: true },
      { id: 'deriv-def', title: 'Definicja pochodnej', latex: "f'(x_0) = \\lim_{h \\to 0} \\frac{f(x_0 + h) - f(x_0)}{h}", ext: true },
      { id: 'deriv-ops', title: 'Pochodne sumy, iloczynu i ilorazu', latex: "\\begin{gathered} (f \\pm g)' = f' \\pm g', \\qquad (c \\cdot f)' = c \\cdot f' \\\\ (f \\cdot g)' = f'g + fg', \\qquad \\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2} \\end{gathered}", ext: true },
      { id: 'deriv-chain', title: 'Pochodna funkcji złożonej', latex: "\\big(g(f(x))\\big)' = g'(f(x)) \\cdot f'(x)", ext: true },
      { id: 'deriv-basic', title: 'Pochodne funkcji elementarnych', latex: "\\begin{gathered} (x^a)' = a x^{a-1}, \\qquad (\\sqrt{x})' = \\frac{1}{2\\sqrt{x}} \\\\ (\\sin x)' = \\cos x, \\qquad (\\cos x)' = -\\sin x, \\qquad (\\tg x)' = \\frac{1}{\\cos^2 x} \\end{gathered}", ext: true },
      { id: 'tangent', title: 'Równanie stycznej do wykresu', latex: "y = f'(x_0)(x - x_0) + f(x_0)", ext: true },
    ],
  },
  {
    id: 'trig-table',
    title: '16. Tablica wartości funkcji trygonometrycznych',
    items: [
      trigTable('trig-table-1', 0, 30),
      trigTable('trig-table-2', 31, 60),
      trigTable('trig-table-3', 61, 90),
    ],
  },
];

/** Polskie oznaczenia funkcji (tg) – wspólne dla KaTeX i MathJax. */
export const CKE_MACROS: Record<string, string> = { '\\tg': '\\operatorname{tg}', '\\ctg': '\\operatorname{ctg}' };

export const CKE_SOURCE_NOTE =
  'Zestaw opracowany na podstawie zakresu broszury CKE „Wybrane wzory matematyczne”. Na egzaminie obowiązuje oficjalna broszura CKE.';

export function findFormula(id: string): CkeFormula | undefined {
  for (const s of CKE_SECTIONS) for (const f of s.items) if (f.id === id) return f;
  return undefined;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Wyszukiwanie po tytule, nazwie działu i treści LaTeX (bez polskich znaków i wielkości liter). */
export function searchFormulas(query: string, sections: CkeSection[] = CKE_SECTIONS): CkeSection[] {
  const q = norm(query.trim());
  if (!q) return sections;
  return sections
    .map((s) => ({ ...s, items: norm(s.title).includes(q) ? s.items : s.items.filter((f) => norm(`${f.title} ${f.latex}`).includes(q)) }))
    .filter((s) => s.items.length > 0);
}
