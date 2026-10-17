/**
 * Bezpieczny parser wyrażeń jednej zmiennej (bez eval) do rysowania wykresów.
 * Obsługuje: + - * / ^, nawiasy, mnożenie domyślne (2x, 3(x+1), (x+1)(x-1)),
 * funkcje: sin cos tan asin acos atan sqrt abs ln log exp floor ceil, stałe: pi, e.
 */

type Fn = (x: number) => number;

const FUNCS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  tg: Math.tan,
  ctg: (v) => 1 / Math.tan(v),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const s = src.replace(/\s+/g, '').replace(/\*\*/g, '^').replace(/·|×/g, '*').replace(/π/g, 'pi').replace(/,/g, '.');
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j]!)) j++;
      const v = Number(s.slice(i, j));
      if (Number.isNaN(v)) throw new Error(`Nieprawidłowa liczba: ${s.slice(i, j)}`);
      out.push({ t: 'num', v });
      i = j;
    } else if (/[a-z]/i.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/i.test(s[j]!)) j++;
      out.push(...splitIdent(s.slice(i, j).toLowerCase()));
      i = j;
    } else if ('+-*/^()'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else {
      throw new Error(`Nieznany znak: ${c}`);
    }
  }
  return out;
}

/** Rozbija ciąg liter na funkcje/stałe/zmienne, np. "xsin" -> x, sin; "2pix" -> pi, x. */
function splitIdent(id: string): Tok[] {
  const names = [...Object.keys(FUNCS), ...Object.keys(CONSTS), 'x'].sort((a, b) => b.length - a.length);
  const out: Tok[] = [];
  let i = 0;
  while (i < id.length) {
    const name = names.find((n) => id.startsWith(n, i));
    if (!name) throw new Error(`Nieznany symbol: ${id.slice(i)}`);
    out.push({ t: 'id', v: name });
    i += name.length;
  }
  return out;
}

export function compileExpression(src: string): Fn {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const startsPrimary = () => {
    const t = peek();
    return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '('));
  };

  function expr(): Fn {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[p++]!.v;
      const l = left, r = term();
      left = op === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return left;
  }

  function term(): Fn {
    let left = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = toks[p++]!.v;
        const l = left, r = unary();
        left = op === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      } else if (startsPrimary()) {
        const l = left, r = power();
        left = (x) => l(x) * r(x);
      } else return left;
    }
  }

  function unary(): Fn {
    if (isOp('-')) {
      p++;
      const f = unary();
      return (x) => -f(x);
    }
    if (isOp('+')) {
      p++;
      return unary();
    }
    return power();
  }

  function power(): Fn {
    const base = primary();
    if (isOp('^')) {
      p++;
      const exp = unary();
      return (x) => Math.pow(base(x), exp(x));
    }
    return base;
  }

  function primary(): Fn {
    const t = toks[p++];
    if (!t) throw new Error('Niekompletne wyrażenie');
    if (t.t === 'num') return () => t.v;
    if (t.t === 'op' && t.v === '(') {
      const e = expr();
      if (!isOp(')')) throw new Error('Brak nawiasu zamykającego');
      p++;
      return e;
    }
    if (t.t === 'id') {
      if (t.v === 'x') return (x) => x;
      if (t.v in CONSTS) {
        const c = CONSTS[t.v]!;
        return () => c;
      }
      const fn = FUNCS[t.v]!;
      const arg = isOp('(') ? primary() : power();
      return (x) => fn(arg(x));
    }
    throw new Error(`Nieoczekiwany symbol: ${t.v}`);
  }

  const f = expr();
  if (p < toks.length) throw new Error(`Nieoczekiwany symbol: ${toks[p]!.v}`);
  return f;
}

/** Próbkuje funkcję i zwraca ścieżkę SVG (przerwy przy nieciągłościach / wartościach spoza zakresu). */
export function plotPath(
  f: Fn,
  box: { x: number; y: number; w: number; h: number },
  range: { xMin: number; xMax: number; yMin: number; yMax: number },
  samples = 400,
): string {
  const { xMin, xMax, yMin, yMax } = range;
  const toX = (vx: number) => box.x + ((vx - xMin) / (xMax - xMin)) * box.w;
  const toY = (vy: number) => box.y + box.h - ((vy - yMin) / (yMax - yMin)) * box.h;
  const span = yMax - yMin;
  let d = '';
  let pen = false;
  let prev: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const vx = xMin + ((xMax - xMin) * i) / samples;
    const vy = f(vx);
    const valid = Number.isFinite(vy) && vy > yMin - span * 2 && vy < yMax + span * 2;
    const jump = prev !== null && valid && Math.abs(vy - prev) > span * 1.5;
    if (!valid || jump) {
      pen = false;
      prev = valid ? vy : null;
      if (!valid) continue;
    }
    d += `${pen ? 'L' : 'M'}${toX(vx).toFixed(2)} ${toY(vy).toFixed(2)}`;
    pen = true;
    prev = vy;
  }
  return d;
}
