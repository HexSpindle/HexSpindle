import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const DIG = '0123456789abcdefghijklmnopqrstuvwxyz';

function bigIntFromBase(str, base) {
  let n = 0n;
  const b = BigInt(base);
  for (const ch of str.toLowerCase()) {
    const d = DIG.indexOf(ch);
    if (d < 0 || d >= base) throw new Error(`invalid literal for int() with base ${base}: '${str}'`);
    n = n * b + BigInt(d);
  }
  return n;
}

function bigIntToBase(n, digits) {
  if (n === 0n) return digits[0];
  const base = BigInt(digits.length);
  let out = '';
  while (n > 0n) { out = digits[Number(n % base)] + out; n /= base; }
  return out;
}

module('Convert Base', 'Converts an integer between any two bases (2-36).', [A.number('From base', 10, 2, 36), A.number('To base', 16, 2, 36)],
  (t, fb, tb) => {
    fb = Math.trunc(fb); tb = Math.trunc(tb);
    const out = [];
    for (const tok of t.match(/-?[0-9a-zA-Z]+/g) || []) {
      const neg = tok[0] === '-';
      const body = neg ? tok.slice(1) : tok;
      const n = bigIntFromBase(body, fb);
      out.push((neg && n !== 0n ? '-' : '') + bigIntToBase(n, DIG.slice(0, tb)));
    }
    return out.join('\n');
  }, { text: true });
