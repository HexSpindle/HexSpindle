import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const MASK64 = (1n << 64n) - 1n;
const k0 = 0xc3a5c85c97cb3127n, k1 = 0xb492b66fbe98f273n, k2 = 0x9ae16a3b2f90404fn;
const kMul = 0x9ddfea08eb382d69n;

function u64(x) { return x & MASK64; }
function fetch64(s, off) {
  let v = 0n;
  for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(s[off + i]);
  return v;
}
function fetch32(s, off) {
  return BigInt(s[off] | (s[off + 1] << 8) | (s[off + 2] << 16) | (s[off + 3] << 24)) & 0xffffffffn;
}
function rotate(val, shift) {
  val = u64(val);
  if (shift === 0) return val;
  return u64((val >> BigInt(shift)) | (val << BigInt(64 - shift)));
}
function bswap64(v) {
  let out = 0n;
  for (let i = 0; i < 8; i++) { out = (out << 8n) | (v & 0xffn); v >>= 8n; }
  return out;
}
function shiftMix(val) { return val ^ (val >> 47n); }
function hashLen16_2(u, v) {
  const x = u64((u ^ v) * kMul);
  const a = x ^ (x >> 47n);
  const b = u64((v ^ a) * kMul);
  const b2 = b ^ (b >> 47n);
  return u64(b2 * kMul);
}
function hashLen16_3(u, v, mul) {
  let a = u64((u ^ v) * mul);
  a ^= a >> 47n;
  let b = u64((v ^ a) * mul);
  b ^= b >> 47n;
  b = u64(b * mul);
  return b;
}
function hashLen0to16(s, off, len) {
  if (len >= 8) {
    const mul = u64(k2 + BigInt(len) * 2n);
    const a = u64(fetch64(s, off) + k2);
    const b = fetch64(s, off + len - 8);
    const c = u64(u64(rotate(b, 37) * mul) + a);
    const d = u64((rotate(a, 25) + b) * mul);
    return hashLen16_3(c, d, mul);
  }
  if (len >= 4) {
    const mul = u64(k2 + BigInt(len) * 2n);
    const a = fetch32(s, off);
    return hashLen16_3(u64(BigInt(len) + (a << 3n)), fetch32(s, off + len - 4), mul);
  }
  if (len > 0) {
    const a = BigInt(s[off]);
    const b = BigInt(s[off + (len >> 1)]);
    const c = BigInt(s[off + len - 1]);
    const y = u64(a + (b << 8n));
    const z = u64(BigInt(len) + (c << 2n));
    return u64(shiftMix(u64(y * k2) ^ u64(z * k0)) * k2);
  }
  return k2;
}
function hashLen17to32(s, off, len) {
  const mul = u64(k2 + BigInt(len) * 2n);
  const a = u64(fetch64(s, off) * k1);
  const b = fetch64(s, off + 8);
  const c = u64(fetch64(s, off + len - 8) * mul);
  const d = u64(fetch64(s, off + len - 16) * k2);
  return hashLen16_3(
    u64(u64(rotate(u64(a + b), 43) + rotate(c, 30)) + d),
    u64(u64(a + rotate(u64(b + k2), 18)) + c),
    mul);
}
function weakHashLen32WithSeeds6(w, x, y, z, a, b) {
  a = u64(a + w);
  b = rotate(u64(u64(b + a) + z), 21);
  const c = a;
  a = u64(a + x);
  a = u64(a + y);
  b = u64(b + rotate(a, 44));
  return [u64(a + z), u64(b + c)];
}
function weakHashLen32WithSeeds(s, off, a, b) {
  return weakHashLen32WithSeeds6(fetch64(s, off), fetch64(s, off + 8), fetch64(s, off + 16), fetch64(s, off + 24), a, b);
}
function hashLen33to64(s, off, len) {
  const mul = u64(k2 + BigInt(len) * 2n);
  const a = u64(fetch64(s, off) * k2);
  const b = fetch64(s, off + 8);
  const c = fetch64(s, off + len - 24);
  const d = fetch64(s, off + len - 32);
  const e = u64(fetch64(s, off + 16) * k2);
  const f = u64(fetch64(s, off + 24) * 9n);
  const g = fetch64(s, off + len - 8);
  const h = u64(fetch64(s, off + len - 16) * mul);
  const u = u64(rotate(u64(a + g), 43) + u64(u64(rotate(b, 30) + c) * 9n));
  const v = u64(u64((u64(a + g)) ^ d) + f + 1n);
  const w = u64(bswap64(u64(u64(u + v) * mul)) + h);
  const x = u64(rotate(u64(e + f), 42) + c);
  const y = u64(u64(bswap64(u64(u64(v + w) * mul)) + g) * mul);
  const z = u64(e + f + c);
  const a2 = u64(bswap64(u64(u64(x + z) * mul + y)) + b);
  const b2 = u64(shiftMix(u64(u64(z + a2) * mul + d + h)) * mul);
  return u64(b2 + x);
}
function cityHash64(s) {
  const len = s.length;
  if (len <= 32) {
    if (len <= 16) return hashLen0to16(s, 0, len);
    return hashLen17to32(s, 0, len);
  } else if (len <= 64) {
    return hashLen33to64(s, 0, len);
  }
  let x = fetch64(s, len - 40);
  let y = u64(fetch64(s, len - 16) + fetch64(s, len - 56));
  let z = hashLen16_2(u64(fetch64(s, len - 48) + BigInt(len)), fetch64(s, len - 24));
  let v = weakHashLen32WithSeeds(s, len - 64, BigInt(len), z);
  let w = weakHashLen32WithSeeds(s, len - 32, u64(y + k1), x);
  x = u64(x * k1 + fetch64(s, 0));
  let rem = (len - 1) & ~63;
  let off = 0;
  do {
    x = u64(rotate(u64(u64(u64(x + y) + v[0]) + fetch64(s, off + 8)), 37) * k1);
    y = u64(rotate(u64(u64(y + v[1]) + fetch64(s, off + 48)), 42) * k1);
    x ^= w[1];
    y = u64(y + v[0] + fetch64(s, off + 40));
    z = u64(rotate(u64(z + w[0]), 33) * k1);
    const vNew = weakHashLen32WithSeeds(s, off, u64(v[1] * k1), u64(x + w[0]));
    const wNew = weakHashLen32WithSeeds(s, off + 32, u64(z + w[1]), u64(y + fetch64(s, off + 16)));
    v = vNew; w = wNew;
    [z, x] = [x, z];
    off += 64;
    rem -= 64;
  } while (rem !== 0);
  return hashLen16_2(
    u64(hashLen16_2(v[0], w[0]) + u64(shiftMix(y) * k1) + z),
    u64(hashLen16_2(v[1], w[1]) + x));
}
function cityHash64WithSeeds(s, seed0, seed1) {
  return hashLen16_2(u64(cityHash64(s) - seed0), seed1);
}
function cityHash64WithSeed(s, seed) {
  return cityHash64WithSeeds(s, k2, seed);
}

function cityMurmur(s, off, len, seedLo, seedHi) {
  let a = seedLo, b = seedHi, c = 0n, d = 0n;
  if (len <= 16) {
    a = u64(shiftMix(u64(a * k1)) * k1);
    c = u64(b * k1 + hashLen0to16(s, off, len));
    d = shiftMix(u64(a + (len >= 8 ? fetch64(s, off) : c)));
  } else {
    c = hashLen16_2(u64(fetch64(s, off + len - 8) + k1), a);
    d = hashLen16_2(u64(b + BigInt(len)), u64(c + fetch64(s, off + len - 16)));
    a = u64(a + d);
    let rem = len;
    let p = off;
    do {
      a ^= u64(shiftMix(u64(fetch64(s, p) * k1)) * k1);
      a = u64(a * k1);
      b ^= a;
      c ^= u64(shiftMix(u64(fetch64(s, p + 8) * k1)) * k1);
      c = u64(c * k1);
      d ^= c;
      p += 16;
      rem -= 16;
    } while (rem > 16);
  }
  a = hashLen16_2(a, c);
  b = hashLen16_2(d, b);
  return [a ^ b, hashLen16_2(b, a)];
}

function cityHash128WithSeed(s, off, len, seedLo, seedHi) {
  if (len < 128) return cityMurmur(s, off, len, seedLo, seedHi);
  let v0, v1, w0, w1;
  let x = seedLo, y = seedHi;
  let z = u64(BigInt(len) * k1);
  v0 = u64(rotate(y ^ k1, 49) * k1 + fetch64(s, off));
  v1 = u64(rotate(v0, 42) * k1 + fetch64(s, off + 8));
  w0 = u64(rotate(u64(y + z), 35) * k1 + x);
  w1 = u64(rotate(u64(x + fetch64(s, off + 88)), 53) * k1);

  let rem = len;
  let p = off;
  const step = () => {
    x = u64(rotate(u64(u64(u64(x + y) + v0) + fetch64(s, p + 8)), 37) * k1);
    y = u64(rotate(u64(u64(y + v1) + fetch64(s, p + 48)), 42) * k1);
    x ^= w1;
    y = u64(y + v0 + fetch64(s, p + 40));
    z = u64(rotate(u64(z + w0), 33) * k1);
    const vNew = weakHashLen32WithSeeds(s, p, u64(v1 * k1), u64(x + w0));
    const wNew = weakHashLen32WithSeeds(s, p + 32, u64(z + w1), u64(y + fetch64(s, p + 16)));
    v0 = vNew[0]; v1 = vNew[1]; w0 = wNew[0]; w1 = wNew[1];
    [z, x] = [x, z];
    p += 64;
  };
  do {
    step();
    step();
    rem -= 128;
  } while (rem >= 128);
  x = u64(x + rotate(u64(v0 + z), 49) * k0);
  y = u64(y * k0 + rotate(w1, 37));
  z = u64(z * k0 + rotate(w0, 27));
  w0 = u64(w0 * 9n);
  v0 = u64(v0 * k0);
  for (let tailDone = 0; tailDone < rem;) {
    tailDone += 32;
    y = u64(rotate(u64(x + y), 42) * k0 + v1);
    w0 = u64(w0 + fetch64(s, p + rem - tailDone + 16));
    x = u64(x * k0 + w0);
    z = u64(z + w1 + fetch64(s, p + rem - tailDone));
    w1 = u64(w1 + v0);
    const vNew = weakHashLen32WithSeeds(s, p + rem - tailDone, u64(v0 + z), v1);
    v0 = vNew[0]; v1 = vNew[1];
    v0 = u64(v0 * k0);
  }
  x = hashLen16_2(x, v0);
  y = hashLen16_2(u64(y + z), w0);
  return [u64(hashLen16_2(u64(x + v1), w1) + y), u64(hashLen16_2(u64(x + w1), u64(y + v1)))];
}

function cityHash128(s) {
  const len = s.length;
  if (len >= 16) return cityHash128WithSeed(s, 16, len - 16, fetch64(s, 0), u64(fetch64(s, 8) + k0));
  return cityHash128WithSeed(s, 0, len, k0, k1);
}

const C1 = 0xcc9e2d51n, C2 = 0x1b873593n;
function u32(x) { return x & 0xffffffffn; }
function rotate32(val, shift) {
  val = u32(val);
  if (shift === 0) return val;
  return u32((val >> BigInt(shift)) | (val << BigInt(32 - shift)));
}
function fmix32(hh) {
  let h = u32(hh);
  h ^= h >> 16n; h = u32(h * 0x85ebca6bn);
  h ^= h >> 13n; h = u32(h * 0xc2b2ae35n);
  h ^= h >> 16n;
  return h;
}
function mur(a, h) {
  a = u32(a * C1);
  a = rotate32(a, 17);
  a = u32(a * C2);
  h = u32(h ^ a);
  h = rotate32(h, 19);
  return u32(u32(h * 5n) + 0xe6546b64n);
}
function bswap32(v) {
  v = u32(v);
  return u32(((v & 0xffn) << 24n) | ((v & 0xff00n) << 8n) | ((v >> 8n) & 0xff00n) | ((v >> 24n) & 0xffn));
}
function hash32Len0to4(s, off, len) {
  let b = 0n, c = 9n;
  for (let i = 0; i < len; i++) {
    const v = BigInt((s[off + i] << 24) >> 24);
    b = u32(u32(b * C1) + u32(v & 0xffffffffn));
    c ^= b;
  }
  return fmix32(mur(b, mur(BigInt(len), c)));
}
function hash32Len5to12(s, off, len) {
  let a = BigInt(len), b = u32(a * 5n), c = 9n, d = b;
  a = u32(a + fetch32(s, off));
  b = u32(b + fetch32(s, off + len - 4));
  c = u32(c + fetch32(s, off + ((len >> 1) & 4)));
  return fmix32(mur(c, mur(b, mur(a, d))));
}
function hash32Len13to24(s, off, len) {
  const a = fetch32(s, off - 4 + (len >> 1));
  const b = fetch32(s, off + 4);
  const c = fetch32(s, off + len - 8);
  const d = fetch32(s, off + (len >> 1));
  const e = fetch32(s, off);
  const f = fetch32(s, off + len - 4);
  const h = BigInt(len);
  return fmix32(mur(f, mur(e, mur(d, mur(c, mur(b, mur(a, h)))))));
}
function cityHash32(s) {
  const len = s.length;
  if (len <= 24) {
    if (len <= 12) return len <= 4 ? hash32Len0to4(s, 0, len) : hash32Len5to12(s, 0, len);
    return hash32Len13to24(s, 0, len);
  }
  let h = BigInt(len), g = u32(C1 * h), f = g;
  let a0 = u32(rotate32(u32(fetch32(s, len - 4) * C1), 17) * C2);
  let a2 = u32(rotate32(u32(fetch32(s, len - 16) * C1), 17) * C2);
  let a1 = u32(rotate32(u32(fetch32(s, len - 8) * C1), 17) * C2);
  let a3 = u32(rotate32(u32(fetch32(s, len - 12) * C1), 17) * C2);
  let a4 = u32(rotate32(u32(fetch32(s, len - 20) * C1), 17) * C2);
  h ^= a0; h = rotate32(h, 19); h = u32(u32(h * 5n) + 0xe6546b64n);
  h ^= a2; h = rotate32(h, 19); h = u32(u32(h * 5n) + 0xe6546b64n);
  g ^= a1; g = rotate32(g, 19); g = u32(u32(g * 5n) + 0xe6546b64n);
  g ^= a3; g = rotate32(g, 19); g = u32(u32(g * 5n) + 0xe6546b64n);
  f = u32(f + a4); f = rotate32(f, 19); f = u32(u32(f * 5n) + 0xe6546b64n);
  let iters = Math.floor((len - 1) / 20);
  let off = 0;
  do {
    let b0 = u32(rotate32(u32(fetch32(s, off) * C1), 17) * C2);
    let b1 = fetch32(s, off + 4);
    let b2 = u32(rotate32(u32(fetch32(s, off + 8) * C1), 17) * C2);
    let b3 = u32(rotate32(u32(fetch32(s, off + 12) * C1), 17) * C2);
    let b4 = fetch32(s, off + 16);
    h ^= b0; h = rotate32(h, 18); h = u32(u32(h * 5n) + 0xe6546b64n);
    f = u32(f + b1); f = rotate32(f, 19); f = u32(f * C1);
    g = u32(g + b2); g = rotate32(g, 18); g = u32(u32(g * 5n) + 0xe6546b64n);
    h ^= u32(b3 + b1); h = rotate32(h, 19); h = u32(u32(h * 5n) + 0xe6546b64n);
    g ^= b4; g = u32(bswap32(g) * 5n);
    h = u32(h + u32(b4 * 5n)); h = bswap32(h);
    f = u32(f + b0);
    [f, h, g] = [g, f, h]; // PERMUTE3(f,h,g): new_f=old_g, new_h=old_f, new_g=old_h
    off += 20;
    iters--;
  } while (iters !== 0);
  g = u32(rotate32(g, 11) * C1);
  g = u32(rotate32(g, 17) * C1);
  f = u32(rotate32(f, 11) * C1);
  f = u32(rotate32(f, 17) * C1);
  h = rotate32(u32(h + g), 19);
  h = u32(u32(h * 5n) + 0xe6546b64n);
  h = u32(rotate32(h, 17) * C1);
  h = rotate32(u32(h + f), 19);
  h = u32(u32(h * 5n) + 0xe6546b64n);
  h = u32(rotate32(h, 17) * C1);
  return h;
}

module('CityHash', 'Google CityHash (32/64/128-bit).',
  [A.select('Variant', ['32-bit', '64-bit', '128-bit']), A.number('Seed (64-bit only, 0 = unseeded)', 0, 0)],
  (data, variant, seed) => {
    if (variant === '32-bit') return cityHash32(data).toString(16).padStart(8, '0');
    if (variant === '64-bit') return (seed ? cityHash64WithSeed(data, BigInt(seed)) : cityHash64(data)).toString(16).padStart(16, '0');
    const [hi, lo] = cityHash128(data);
    return hi.toString(16).padStart(16, '0') + lo.toString(16).padStart(16, '0');
  });
