const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const DP = 20;

const roundHalfUp = (n, d) => (2n * n + d) / (2n * d);

function checkRadix(radix) {
  if (!(radix >= 2 && radix <= 36)) throw new Error('Error: Radix argument must be between 2 and 36');
}

function parseBaseString(str, b, v) {
  const alphabet = DIGITS.slice(0, b);
  let neg = false;
  if (str.charCodeAt(0) === 45) { neg = true; str = str.slice(1); }
  let caseChanged = false;
  for (;;) {
    let clean = '', hasDot = false, prev = false, ok = true;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (alphabet.includes(c)) { clean += c; prev = true; continue; }
      if (c === '_' && prev && i + 1 < str.length) { prev = false; continue; }
      if (c === '.' && (i === 0 || (!hasDot && prev))) {
        if (i + 1 === str.length) break;
        if (i === 0) clean = '0';
        clean += c; hasDot = true; prev = false; continue;
      }
      ok = false; break;
    }
    if (ok) return { neg, digits: clean };
    if (!caseChanged && str === str.toUpperCase() && str !== str.toLowerCase()) {
      str = str.toLowerCase(); caseChanged = true; continue;
    }
    throw new Error(`[BigNumber Error] Not a base ${b} number: ${v}`);
  }
}

function digitsToRational(digits, b) {
  const [ip, fp = ''] = digits.split('.');
  const B = BigInt(b);
  let n = 0n;
  for (const c of ip + fp) n = n * B + BigInt(DIGITS.indexOf(c));
  if (!fp) return { n, d: 1n };
  const scale = 10n ** BigInt(DP);
  return { n: roundHalfUp(n * scale, B ** BigInt(fp.length)), d: scale };
}

function parseBigNumber(str) {
  const isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const decimal = s => {
    const neg = s[0] === '-';
    if (neg) s = s.slice(1);
    let [m, e = '0'] = s.toLowerCase().split('e');
    const [ip, fp = ''] = m.split('.');
    let exp = BigInt(e) - BigInt(fp.length);
    let n = BigInt((ip + fp) || '0'), d = 1n;
    if (exp >= 0n) n *= 10n ** exp; else d = 10n ** -exp;
    return { neg, n, d };
  };
  if (isNumeric.test(str)) return decimal(str);
  str = str.replace(/^\s*\+(?!-)|^\s+|\s+$/g, '');
  if (/^-?(Infinity|NaN)$/.test(str)) return str.endsWith('NaN') ? { nan: true } : { inf: true, neg: str[0] === '-' };
  let b = 0;
  str = str.replace(/^(-?)0([xbo])(?=[^.])/i, (m, p1, p2) => { p2 = p2.toLowerCase(); b = p2 === 'x' ? 16 : p2 === 'b' ? 2 : 8; return p1; });
  if (b) {
    try {
      const { neg, digits } = parseBaseString(str, b, str);
      return { neg, ...digitsToRational(digits, b) };
    } catch (e) { return { nan: true }; }
  }
  str = str.replace(/(\d)_(?=\d)/g, '$1');
  if (isNumeric.test(str)) return decimal(str);
  return { nan: true };
}

export function toRadix(text, radix) {
  const v = parseBigNumber(text);
  if (v.nan) return 'NaN';
  checkRadix(radix);
  if (v.inf) return (v.neg ? '-' : '') + 'Infinity';
  const B = BigInt(radix), scale = B ** BigInt(DP);
  const q = roundHalfUp(v.n * scale, v.d);
  let ip = q / scale, fp = q % scale;
  let frac = '';
  if (fp) {
    frac = fp.toString(radix).padStart(DP, '0').replace(/0+$/, '');
  }
  const s = ip.toString(radix) + (frac ? '.' + frac : '');
  return (v.neg && v.n !== 0n ? '-' : '') + s;
}

export function fromRadix(text, radix) {
  checkRadix(radix);
  const parts = text.replace(/\s/g, '').split('.');
  const scale = 10n ** BigInt(DP);
  const R = BigInt(radix);
  const intPart = s => {
    const p = parseBaseString(s.replace(/^\s*\+(?!-)|^\s+|\s+$/g, ''), radix, s);
    const r = digitsToRational(p.digits, radix);
    return (p.neg ? -1n : 1n) * r.n;
  };
  let total = intPart(parts[0]) * scale;
  if (parts.length > 1) {
    for (let i = 0; i < parts[1].length; i++) {
      const digit = intPart(parts[1][i]);
      const mag = roundHalfUp((digit < 0n ? -digit : digit) * scale, R ** BigInt(i + 1));
      total += digit < 0n ? -mag : mag;
    }
  }
  const neg = total < 0n;
  const a = neg ? -total : total;
  const frac = (a % scale).toString().padStart(DP, '0').replace(/0+$/, '');
  return (neg ? '-' : '') + (a / scale).toString() + (frac ? '.' + frac : '');
}
