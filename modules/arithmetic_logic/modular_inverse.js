import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function parseIntAuto(s) {
  s = s.trim();
  const neg = s[0] === '-';
  if (neg || s[0] === '+') s = s.slice(1);
  const v = BigInt(s);
  return neg ? -v : v;
}

function egcd(a, b) {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}

module('Modular Inverse', 'Computes the modular multiplicative inverse of A mod N (the X such that A*X ≡ 1 mod N) - exists only when gcd(A, N) = 1.', [A.string('A', '3'), A.string('N (modulus)', '26')],
  (t, aS, nS) => {
    const a = parseIntAuto(aS), n = parseIntAuto(nS);
    const [g, x] = egcd(a, n);
    if (g !== 1n && g !== -1n) throw new Error(`No inverse exists: gcd(${a}, ${n}) != 1`);
    return (((x % n) + n) % n).toString();
  }, { text: true });
