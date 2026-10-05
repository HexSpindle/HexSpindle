const isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const basePrefix = /^(-?)0([xbo])(?=[^.])/i;
const isInfinityOrNaN = /^-?(Infinity|NaN)$/;
const whitespaceOrPlus = /^\s*\+(?!-)|^\s+|\s+$/g;
const MAX_EXP = 1e7;
const DP = 20;

const NAN = { nan: true };
const inf = s => ({ inf: true, s });

function fromDecimalString(str) {
  let s = 1;
  if (str[0] === '-') { s = -1; str = str.slice(1); }
  let exp = 0;
  const ei = str.search(/e/i);
  if (ei > 0) { exp = +str.slice(ei + 1); str = str.slice(0, ei); }
  const dot = str.indexOf('.');
  let scale = 0;
  if (dot > -1) { scale = str.length - dot - 1; str = str.replace('.', ''); }
  const digits = str.replace(/^0+/, '');
  if (!digits) return { s, n: 0n, scale: 0 };
  const e = digits.length - 1 - scale + exp;
  if (e > MAX_EXP) return inf(s);
  if (e < -MAX_EXP) return { s, n: 0n, scale: 0 };
  scale -= exp;
  let n = BigInt(digits);
  if (scale < 0) { n *= 10n ** BigInt(-scale); scale = 0; }
  return { s, n, scale };
}

function roundDiv(num, den) { // |num/den| rounded half-up, both non-negative
  const q = num / den, r = num % den;
  return r * 2n >= den ? q + 1n : q;
}

function fromBaseString(str, b) {
  let s = 1;
  if (str.charCodeAt(0) === 45) { s = -1; str = str.slice(1); }
  const alphabet = '0123456789abcdef'.slice(0, b);
  let clean = '', hasDot = false, prevIsNumeral = false, caseChanged = false;
  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i);
    if (alphabet.indexOf(c) >= 0) { clean += c; prevIsNumeral = true; continue; }
    if (c === '_') {
      if (prevIsNumeral && i + 1 < str.length) { prevIsNumeral = false; continue; }
    } else if (c === '.') {
      if (i === 0 || (!hasDot && prevIsNumeral)) {
        if (i + 1 === str.length) break;
        if (i === 0) clean = '0';
        clean += c; hasDot = true; prevIsNumeral = false;
        continue;
      }
    } else if (!caseChanged && str === str.toUpperCase() && (str = str.toLowerCase())) {
      i = -1; clean = ''; caseChanged = true; hasDot = prevIsNumeral = false;
      continue;
    }
    return NAN;
  }
  const [ip, fp = ''] = clean.split('.');
  const B = BigInt(b);
  let num = 0n;
  for (const c of ip + fp) num = num * B + BigInt(parseInt(c, b));
  const den = B ** BigInt(fp.length);
  return { s, n: roundDiv(num * 10n ** BigInt(DP), den), scale: DP };
}

export function parseBigNumber(str) {
  if (isNumeric.test(str)) return fromDecimalString(str);
  str = str.replace(whitespaceOrPlus, '');
  if (isInfinityOrNaN.test(str)) return str.endsWith('NaN') ? NAN : inf(str[0] === '-' ? -1 : 1);
  let base = 0;
  str = str.replace(basePrefix, (m, p1, p2) => { p2 = p2.toLowerCase(); base = p2 === 'x' ? 16 : p2 === 'b' ? 2 : 8; return p1; });
  if (base) return fromBaseString(str, base);
  str = str.replace(/(\d)_(?=\d)/g, '$1');
  if (isNumeric.test(str)) return fromDecimalString(str);
  return NAN;
}

export function times(a, b) {
  if (a.nan || b.nan) return NAN;
  if (a.inf || b.inf) return (a.inf ? b : a).n === 0n ? NAN : inf(a.s * b.s);
  return { s: a.s * b.s, n: a.n * b.n, scale: a.scale + b.scale };
}

export function div(a, b) {
  if (a.nan || b.nan || (a.inf && b.inf)) return NAN;
  if (a.inf) return inf(a.s * b.s);
  if (b.inf) return { s: a.s * b.s, n: 0n, scale: 0 };
  if (b.n === 0n) return a.n === 0n ? NAN : inf(a.s * b.s);
  const k = b.scale - a.scale + DP;
  const num = k >= 0 ? a.n * 10n ** BigInt(k) : a.n;
  const den = k >= 0 ? b.n : b.n * 10n ** BigInt(-k);
  return { s: a.s * b.s, n: roundDiv(num, den), scale: DP };
}

export function toFixed(x) {
  if (x.nan) return 'NaN';
  if (x.inf) return x.s < 0 ? '-Infinity' : 'Infinity';
  if (x.n === 0n) return '0';
  let digits = x.n.toString(), scale = x.scale;
  while (scale > 0 && digits.endsWith('0')) { digits = digits.slice(0, -1); scale--; }
  if (scale > 0) {
    digits = digits.padStart(scale + 1, '0');
    digits = digits.slice(0, digits.length - scale) + '.' + digits.slice(digits.length - scale);
  }
  return (x.s < 0 ? '-' : '') + digits;
}

export function convertUnits(text, fromFactor, toFactor) {
  const f = v => v === undefined ? NAN : parseBigNumber(String(v));
  return toFixed(div(times(parseBigNumber(text), f(fromFactor)), f(toFactor)));
}

export function unitOptions(list) {
  const out = [];
  let group = null;
  for (const u of list) {
    if (/^\[\/.*\]$/.test(u)) { out.push(group); group = null; } else if (/^\[.*\]$/.test(u)) group = { label: u.slice(1, -1), options: [] };
    else if (group) group.options.push(u);
    else out.push(u);
  }
  return out;
}
