import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function popcount(n) {
  let c = 0;
  while (n > 0n) { c += Number(n & 1n); n >>= 1n; }
  return c;
}

module('Compare SimHashes', 'Compares two SimHash values (hex) and reports Hamming distance / similarity. Input: HASH1<separator>HASH2.',
  [A.string('Separator', ' ')],
  (t, sep) => {
    const parts = t.trim().split(sep);
    if (parts.length !== 2) throw new Error(`Expected exactly two hashes separated by ${JSON.stringify(sep)}`);
    const [a, b] = parts;
    const dist = popcount(BigInt('0x' + a) ^ BigInt('0x' + b));
    const bits = a.length * 4;
    const sim = 100 * (1 - dist / bits);
    return `Hamming distance: ${dist} / ${bits} bits\nSimilarity: ${sim.toFixed(1)}%`;
  }, { text: true });
