import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function shingles(t, n) {
  const words = t.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || [];
  if (words.length < n) return words.length ? [words.join(' ')] : [];
  const out = [];
  for (let i = 0; i <= words.length - n; i++) out.push(words.slice(i, i + n).join(' '));
  return out;
}

module('SimHash', "Charikar's SimHash: a locality-sensitive hash where similar documents produce hashes with a small Hamming distance. Good for near-duplicate text detection.",
  [A.number('Hash bits', 64, 32, 256), A.number('Shingle size (words)', 3, 1, 10)],
  async (t, bits, shingleN) => {
    const v = new Array(bits).fill(0);
    for (const sh of shingles(t, shingleN)) {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sh)));
      let h = 0n;
      for (const b of digest) h = (h << 8n) | BigInt(b);
      for (let i = 0; i < bits; i++) v[i] += ((h >> BigInt(i)) & 1n) ? 1 : -1;
    }
    let out = 0n;
    for (let i = 0; i < bits; i++) if (v[i] > 0) out |= 1n << BigInt(i);
    return out.toString(16).padStart(Math.ceil(bits / 4), '0');
  }, { text: true });
