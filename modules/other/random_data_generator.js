import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const FIRST = 'James Mary John Patricia Robert Jennifer Michael Linda William Elizabeth David Barbara Richard Susan Joseph Jessica Thomas Sarah Charles Karen Ava Noah Olivia Liam Emma Lucas Mia Ethan Sofia'.split(' ');
const LAST = 'Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez Hernandez Lopez Gonzalez Wilson Anderson Thomas Taylor Moore Jackson Martin'.split(' ');
const DOMAINS = 'example.com example.org example.net test.io mail.test'.split(' ');
const CITIES = 'Springfield Fairview Madison Georgetown Franklin Clinton Greenville Salem Riverside Arlington'.split(' ');
const STREETS = 'Main Oak Maple Cedar Elm Washington Lake Hill Park Church'.split(' ');
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

class MT19937 {
  constructor(seed) {
    this.mt = new Uint32Array(624);
    this.mti = 625;
    this.initByArray(MT19937.seedKey(seed));
  }

  static seedKey(seed) {
    let n = BigInt(Math.trunc(Math.abs(seed)));
    if (n === 0n) return Uint32Array.of(0);
    const words = [];
    while (n > 0n) { words.push(Number(n & 0xffffffffn)); n >>= 32n; }
    return Uint32Array.from(words);
  }

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
    for (let k = Math.max(624, key.length); k; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = ((this.mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
      i++; j++;
      if (i >= 624) { this.mt[0] = this.mt[623]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (let k = 623; k; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = ((this.mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= 624) { this.mt[0] = this.mt[623]; i = 1; }
    }
    this.mt[0] = 0x80000000;
  }

  genrandUint32() {
    const UPPER_MASK = 0x80000000, LOWER_MASK = 0x7fffffff, MAG01 = [0, 0x9908b0df];
    if (this.mti >= 624) {
      let kk;
      for (kk = 0; kk < 624 - 397; kk++) {
        const y = (this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK);
        this.mt[kk] = (this.mt[kk + 397] ^ (y >>> 1) ^ MAG01[y & 1]) >>> 0;
      }
      for (; kk < 623; kk++) {
        const y = (this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK);
        this.mt[kk] = (this.mt[kk + 397 - 624] ^ (y >>> 1) ^ MAG01[y & 1]) >>> 0;
      }
      const y = (this.mt[623] & UPPER_MASK) | (this.mt[0] & LOWER_MASK);
      this.mt[623] = (this.mt[396] ^ (y >>> 1) ^ MAG01[y & 1]) >>> 0;
      this.mti = 0;
    }
    let y = this.mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  getrandbits(k) {
    if (k <= 32) return this.genrandUint32() >>> (32 - k);
    let result = 0n, shift = 0n, bits = k;
    while (bits > 0) {
      const take = Math.min(32, bits);
      result |= BigInt(this.genrandUint32() >>> (32 - take)) << shift;
      shift += 32n;
      bits -= 32;
    }
    return result;
  }

  randbelow(n) {
    if (n <= 0) return 0;
    const k = n.toString(2).length;
    let r = this.getrandbits(k);
    if (typeof r === 'bigint') { const nb = BigInt(n); while (r >= nb) r = this.getrandbits(k); return Number(r); }
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  randint(a, b) { return a + this.randbelow(b - a + 1); }
  choice(arr) { return arr[this.randbelow(arr.length)]; }
}

function secureRandbelow(n) {
  if (n <= 0) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  let x;
  do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
  return x % n;
}

function makeRng(seed) {
  if (seed) {
    const mt = new MT19937(seed);
    return { randint: (a, b) => mt.randint(a, b), choice: arr => mt.choice(arr) };
  }
  return {
    randint: (a, b) => a + secureRandbelow(b - a + 1),
    choice: arr => arr[secureRandbelow(arr.length)],
  };
}

module('Generate Random Test Data', 'Generates fake-but-plausible test data (names, emails, addresses) for filling out forms/fixtures in development. Not sourced from real people.',
  [A.select('Kind', ['Full name', 'Email', 'Street address', 'Phone number (US-style)', 'Username', 'Row (name,email,phone)']),
   A.number('Count', 10, 1, 10000), A.number('Seed (0 = random)', 0, 0)],
  (data, kind, count, seed) => {
    count = Math.trunc(count);
    const rnd = makeRng(seed);
    const out = [];
    for (let i = 0; i < count; i++) {
      const first = rnd.choice(FIRST), last = rnd.choice(LAST);
      if (kind === 'Full name') {
        out.push(`${first} ${last}`);
      } else if (kind === 'Email') {
        out.push(`${first.toLowerCase()}.${last.toLowerCase()}${rnd.randint(1, 999)}@${rnd.choice(DOMAINS)}`);
      } else if (kind === 'Street address') {
        out.push(`${rnd.randint(1, 9999)} ${rnd.choice(STREETS)} St, ${rnd.choice(CITIES)}, ${rnd.choice(UPPER)}${rnd.choice(UPPER)} ${rnd.randint(10000, 99999)}`);
      } else if (kind === 'Phone number (US-style)') {
        out.push(`(${rnd.randint(200, 999)}) ${rnd.randint(200, 999)}-${rnd.randint(1000, 9999)}`);
      } else if (kind === 'Username') {
        out.push(`${first.toLowerCase()}${last.toLowerCase()}${rnd.randint(1, 9999)}`);
      } else {
        out.push(`${first} ${last},${first.toLowerCase()}.${last.toLowerCase()}@${rnd.choice(DOMAINS)},(${rnd.randint(200, 999)}) ${rnd.randint(200, 999)}-${rnd.randint(1000, 9999)}`);
      }
    }
    return out.join('\n');
  }, { nondeterministic: true });
