import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function parseBig(s, name) {
  const v = (s ?? '').trim();
  if (/^0x[0-9a-f]+$/i.test(v) || /^[+-]?[0-9]+$/.test(v)) return BigInt(v);
  throw new Error(`${name} must be decimal or hex (0x...)`);
}

function egcd(a, b) {
  let [oldR, r, oldS, s, oldT, t] = [a, b, 1n, 0n, 0n, 1n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  return [oldR, oldS, oldT];
}

module('Extended GCD', 'Computes gcd(A, B) and the Bézout coefficients x, y such that A*x + B*y = gcd(A, B). An empty A or B is taken from the input.', [A.string('A', ''), A.string('B', '')],
  (t, aS, bS) => {
    const aP = (aS ?? '').trim(), bP = (bS ?? '').trim(), inp = (t ?? '').trim();
    if (!aP && !bP) throw new Error('Values a and b must be defined');
    if (!aP && !inp) throw new Error('Value a must be defined');
    if (!bP && !inp) throw new Error('Value b must be defined');
    const a = parseBig(aP || inp, 'Value a'), b = parseBig(bP || inp, 'Value b');
    const [g, x, y] = egcd(a, b);
    return `gcd: ${g < 0n ? -g : g}\n\nBezout coefficients:\nx = ${x}\ny = ${y}\n\n`;
  }, { text: true });
