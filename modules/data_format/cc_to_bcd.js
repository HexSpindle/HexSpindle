import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ENCODING_SCHEME, ENCODING_LOOKUP, FORMAT } from './_bcd.js';

const RADIX = { x: 16, b: 2, o: 8 };

function parseBigNumber(str) {
  const numeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  let s = numeric.test(str) ? str : str.replace(/^\s*\+(?!-)|^\s+|\s+$/g, '');
  const base = /^(-?)0([xbo])(?=[^.])/i.exec(s);
  if (base) return parseRadix(s.replace(/^(-?)0[xbo]/i, '$1'), RADIX[base[2].toLowerCase()]);
  s = s.replace(/(\d)_(?=\d)/g, '$1');
  if (!numeric.test(s)) return null;
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  let exp = 0;
  const e = /e/i.exec(s);
  if (e) { exp = parseInt(s.slice(e.index + 1), 10); s = s.slice(0, e.index); }
  let [int, frac = ''] = s.split('.');
  // Shift the decimal point by the exponent, then anything left after it is fractional.
  if (exp > 0) { const take = Math.min(exp, frac.length); int += frac.slice(0, take) + '0'.repeat(exp - take); frac = frac.slice(take); }
  else if (exp < 0) { const n = Math.min(-exp, int.length); frac = int.slice(int.length - n) + frac; int = int.slice(0, int.length - n); if (-exp > n) frac = '0'.repeat(-exp - n) + frac; }
  if (/[^0]/.test(frac)) throw new Error('Fractional values are not supported by BCD');
  const v = BigInt(int === '' ? '0' : int);
  return neg ? -v : v;
}

function parseRadix(s, base) {
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  const [int, frac = ''] = s.split('.');
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base);
  if (!int.length || [...int.toLowerCase()].some(c => !digits.includes(c))) return null;
  if (frac.length) {
    if ([...frac.toLowerCase()].some(c => !digits.includes(c))) return null;
    if (/[^0]/.test(frac)) throw new Error('Fractional values are not supported by BCD');
  }
  let v = 0n;
  for (const c of int.toLowerCase()) v = v * BigInt(base) + BigInt(digits.indexOf(c));
  return neg ? -v : v;
}

module('To BCD', 'Binary-Coded Decimal (BCD) is a class of binary encodings of decimal numbers where each decimal digit is represented by a fixed number of bits, usually four or eight. Special bit patterns are sometimes used for a sign.',
  [A.select('Scheme', ENCODING_SCHEME), A.boolean('Packed', true), A.boolean('Signed', false), A.select('Output format', FORMAT)],
  (t, scheme, packed, signed, outputFormat) => {
    const input = parseBigNumber(t);
    if (input === null) throw new Error('Invalid input');

    const encoding = ENCODING_LOOKUP[scheme];
    const neg = input < 0n;
    const digits = (neg ? -input : input).toString().split('');

    let nibbles = digits.map(d => encoding[parseInt(d, 10)]);

    if (signed) {
      if (packed && digits.length % 2 === 0) nibbles.unshift(encoding[0]);
      nibbles.push(input > 0n ? 12 : 13);
    }

    let bytes = [];
    if (packed) {
      let encoded = 0, little = false;
      for (const n of nibbles) {
        encoded ^= little ? n : (n << 4);
        if (little) { bytes.push(encoded); encoded = 0; }
        little = !little;
      }
      if (little) bytes.push(encoded);
    } else {
      bytes = nibbles;
      nibbles = nibbles.flatMap(n => [0, n]);
    }

    switch (outputFormat) {
      case 'Nibbles': return nibbles.map(n => n.toString(2).padStart(4, '0')).join(' ');
      case 'Bytes': return bytes.map(b => b.toString(2).padStart(8, '0')).join(' ');
      case 'Raw':
      // Raw hands back the bytes themselves, so a byte above 0x7f stays one byte
      // instead of being re-encoded as UTF-8.
      default: return Uint8Array.from(bytes);
    }
  }, { text: true });
