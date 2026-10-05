import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco '
  + 'laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident '
  + 'sunt culpa qui officia deserunt mollit anim id est laborum').split(' ');

class PyRandom {
  constructor(seed) { this.mt = new Uint32Array(624); this.mti = 625; this.initByArray([seed >>> 0]); }
  initGenrand(s) {
    this.mt[0] = s >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.mti = 624;
  }
  initByArray(key) {
    this.initGenrand(19650218);
    let i = 1, j = 0;
    let k = Math.max(624, key.length);
    for (; k; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      const t = (this.mt[i] ^ Math.imul(prev, 1664525)) >>> 0;
      this.mt[i] = (t + key[j] + j) >>> 0;
      i++; j++;
      if (i >= 624) { this.mt[0] = this.mt[623]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (k = 623; k; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      const t = (this.mt[i] ^ Math.imul(prev, 1566083941)) >>> 0;
      this.mt[i] = (t - i) >>> 0;
      i++;
      if (i >= 624) { this.mt[0] = this.mt[623]; i = 1; }
    }
    this.mt[0] = 0x80000000;
  }
  genrandUint32() {
    const N = 624, M = 397, MATRIX_A = 0x9908b0df, UPPER = 0x80000000, LOWER = 0x7fffffff;
    if (this.mti >= N) {
      let kk;
      for (kk = 0; kk < N - M; kk++) {
        const y = (this.mt[kk] & UPPER) | (this.mt[kk + 1] & LOWER);
        this.mt[kk] = this.mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      for (; kk < N - 1; kk++) {
        const y = (this.mt[kk] & UPPER) | (this.mt[kk + 1] & LOWER);
        this.mt[kk] = this.mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      const y = (this.mt[N - 1] & UPPER) | (this.mt[0] & LOWER);
      this.mt[N - 1] = this.mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      this.mti = 0;
    }
    let y = this.mt[this.mti++];
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);
    return y >>> 0;
  }
  getrandbits(k) { return this.genrandUint32() >>> (32 - k); }
  randbelow(n) {
    if (n <= 0) return 0;
    const k = n.toString(2).length;
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }
  randint(a, b) { return a + this.randbelow(b - a + 1); }
  choice(seq) { return seq[this.randbelow(seq.length)]; }
}

module('Generate Lorem Ipsum', 'Generates placeholder text (the input is ignored).',
  [A.number('Length', 3, 1, 1000), A.select('Length in', ['Paragraphs', 'Sentences', 'Words', 'Bytes'])],
  (data, n, unit) => {
    n = Math.trunc(n);
    const rnd = new PyRandom(42);
    const sent = () => {
      const len = rnd.randint(6, 14);
      const words = [];
      for (let i = 0; i < len; i++) words.push(rnd.choice(WORDS));
      const s = words.join(' ');
      return s.charAt(0).toUpperCase() + s.slice(1) + '.';
    };
    if (unit === 'Words') return Array.from({ length: n }, (_, i) => WORDS[i % WORDS.length]).join(' ');
    if (unit === 'Sentences') return Array.from({ length: n }, () => sent()).join(' ');
    if (unit === 'Bytes') {
      let s = '';
      while (s.length < n) s += sent() + ' ';
      return s.slice(0, n);
    }
    return Array.from({ length: n }, () => {
      const cnt = rnd.randint(3, 6);
      return Array.from({ length: cnt }, () => sent()).join(' ');
    }).join('\n\n');
  });
