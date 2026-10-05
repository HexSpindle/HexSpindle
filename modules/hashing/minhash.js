import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const PRIME = (1n << 61n) - 1n;

const N = 624, M = 397, MATRIX_A = 0x9908b0df, UPPER_MASK = 0x80000000, LOWER_MASK = 0x7fffffff;
class MT19937 {
  constructor() { this.mt = new Uint32Array(N); this.mti = N + 1; }
  initGenrand(s) {
    this.mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = Number((1812433253n * BigInt(prev >>> 0) + BigInt(i)) & 0xffffffffn);
    }
    this.mti = N;
  }
  initByArray(key) {
    this.initGenrand(19650218);
    let i = 1, j = 0, k = Math.max(N, key.length);
    for (; k; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = Number(((BigInt(this.mt[i]) ^ ((BigInt(prev >>> 0) * 1664525n) & 0xffffffffn)) + BigInt(key[j]) + BigInt(j)) & 0xffffffffn);
      i++; j++;
      if (i >= N) { this.mt[0] = this.mt[N - 1]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (k = N - 1; k; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = Number(((BigInt(this.mt[i]) ^ ((BigInt(prev >>> 0) * 1566083941n) & 0xffffffffn)) - BigInt(i)) & 0xffffffffn);
      i++;
      if (i >= N) { this.mt[0] = this.mt[N - 1]; i = 1; }
    }
    this.mt[0] = 0x80000000;
  }
  genrandUint32() {
    if (this.mti >= N) {
      const mag01 = [0, MATRIX_A];
      let kk;
      for (kk = 0; kk < N - M; kk++) {
        const y = (this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK);
        this.mt[kk] = (this.mt[kk + M] ^ (y >>> 1) ^ mag01[y & 1]) >>> 0;
      }
      for (; kk < N - 1; kk++) {
        const y = (this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK);
        this.mt[kk] = (this.mt[kk + (M - N)] ^ (y >>> 1) ^ mag01[y & 1]) >>> 0;
      }
      const y = (this.mt[N - 1] & UPPER_MASK) | (this.mt[0] & LOWER_MASK);
      this.mt[N - 1] = (this.mt[M - 1] ^ (y >>> 1) ^ mag01[y & 1]) >>> 0;
      this.mti = 0;
    }
    let y = this.mt[this.mti++];
    y ^= (y >>> 11);
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
    y ^= (y >>> 18);
    return y >>> 0;
  }
}
function seedToKey(seedBig) {
  if (seedBig < 0n) seedBig = -seedBig;
  if (seedBig === 0n) return [0];
  const words = [];
  let v = seedBig;
  while (v > 0n) { words.push(Number(v & 0xffffffffn)); v >>= 32n; }
  return words;
}
class PyRandom {
  constructor(seed) { this.mt = new MT19937(); this.mt.initByArray(seedToKey(BigInt(seed))); }
  getrandbits(k) {
    if (k <= 32) return BigInt(this.mt.genrandUint32() >>> (32 - k));
    const words = Math.floor((k - 1) / 32) + 1;
    let result = 0n, kk = k;
    for (let i = 0; i < words; i++, kk -= 32) {
      let r = this.mt.genrandUint32();
      if (kk < 32) r = r >>> (32 - kk);
      result |= BigInt(r >>> 0) << BigInt(32 * i);
    }
    return result;
  }
  randrange(start, stop) {
    start = BigInt(start); stop = BigInt(stop);
    const width = stop - start;
    const k = width.toString(2).length;
    let r = this.getrandbits(k);
    while (r >= width) r = this.getrandbits(k);
    return start + r;
  }
}

function shingles(t, n) {
  const words = t.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || [];
  const out = new Set();
  for (let i = 0; i <= Math.max(words.length - n, 0); i++) out.add(words.slice(i, i + n).join(' '));
  if (out.size === 0 && words.length) out.add(words.join(' '));
  return out;
}

async function stableHash64(s) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  let v = 0n;
  for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(digest[i]);
  return v;
}

module('MinHash Signature', 'Computes a MinHash signature (a compact sketch for estimating Jaccard similarity between sets of word shingles) - pair with Compare MinHash Signatures.',
  [A.number('Number of hash functions', 64, 8, 512), A.number('Shingle size (words)', 3, 1, 10), A.number('Seed', 42, 0)],
  async (t, numHashes, shingleN, seed) => {
    const rnd = new PyRandom(seed);
    const coeffs = [];
    for (let i = 0; i < numHashes; i++) coeffs.push([rnd.randrange(1, PRIME), rnd.randrange(0, PRIME)]);
    const sh = shingles(t, shingleN);
    if (sh.size === 0) throw new Error('No shingles found in the input');
    const hashed = [];
    for (const s of sh) hashed.push(await stableHash64(s));
    const sig = coeffs.map(([a, b]) => {
      let min = null;
      for (const h of hashed) {
        const v = (a * h + b) % PRIME;
        if (min === null || v < min) min = v;
      }
      return min;
    });
    return sig.map(String).join(' ');
  }, { text: true });
