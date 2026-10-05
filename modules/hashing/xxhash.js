import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const M32 = 0xffffffffn;
const P32_1 = 0x9E3779B1n, P32_2 = 0x85EBCA77n, P32_3 = 0xC2B2AE3Dn, P32_4 = 0x27D4EB2Fn, P32_5 = 0x165667B1n;
const M64 = (1n << 64n) - 1n;
const P64_1 = 0x9E3779B185EBCA87n, P64_2 = 0xC2B2AE3D27D4EB4Fn, P64_3 = 0x165667B19E3779F9n, P64_4 = 0x85EBCA77C2B2AE63n, P64_5 = 0x27D4EB2F165667C5n;

function rotl32(x, r) { x &= M32; return ((x << BigInt(r)) | (x >> BigInt(32 - r))) & M32; }
function rotl64(x, r) { x &= M64; return ((x << BigInt(r)) | (x >> BigInt(64 - r))) & M64; }
function read32(buf, i) { return BigInt(buf[i] | (buf[i+1]<<8) | (buf[i+2]<<16) | (buf[i+3]<<24)) & M32; }
function read64(buf, i) {
  let v = 0n;
  for (let k = 7; k >= 0; k--) v = (v << 8n) | BigInt(buf[i+k]);
  return v;
}

function xxh32round(acc, input) {
  acc = (acc + ((input * P32_2) & M32)) & M32;
  acc = rotl32(acc, 13);
  return (acc * P32_1) & M32;
}
function xxh32avalanche(h) {
  h &= M32;
  h ^= h >> 15n; h = (h * P32_2) & M32;
  h ^= h >> 13n; h = (h * P32_3) & M32;
  h ^= h >> 16n;
  return h;
}
function xxh32(buf, seed = 0n) {
  seed &= M32;
  const len = buf.length;
  let i = 0;
  let h32;
  if (len >= 16) {
    let acc0 = (seed + P32_1 + P32_2) & M32;
    let acc1 = (seed + P32_2) & M32;
    let acc2 = seed;
    let acc3 = (seed - P32_1) & M32;
    const limit = len - 16;
    while (i <= limit) {
      acc0 = xxh32round(acc0, read32(buf, i)); i += 4;
      acc1 = xxh32round(acc1, read32(buf, i)); i += 4;
      acc2 = xxh32round(acc2, read32(buf, i)); i += 4;
      acc3 = xxh32round(acc3, read32(buf, i)); i += 4;
    }
    h32 = (rotl32(acc0,1) + rotl32(acc1,7) + rotl32(acc2,12) + rotl32(acc3,18)) & M32;
  } else {
    h32 = (seed + P32_5) & M32;
  }
  h32 = (h32 + BigInt(len)) & M32;
  let rem = len - i;
  while (rem >= 4) {
    h32 = (h32 + ((read32(buf, i) * P32_3) & M32)) & M32;
    i += 4; rem -= 4;
    h32 = (rotl32(h32, 17) * P32_4) & M32;
  }
  while (rem > 0) {
    h32 = (h32 + ((BigInt(buf[i]) * P32_5) & M32)) & M32;
    i += 1; rem -= 1;
    h32 = (rotl32(h32, 11) * P32_1) & M32;
  }
  return xxh32avalanche(h32);
}

function xxh64round(acc, input) {
  acc = (acc + ((input * P64_2) & M64)) & M64;
  acc = rotl64(acc, 31);
  return (acc * P64_1) & M64;
}
function xxh64mergeround(acc, val) {
  val = xxh64round(0n, val);
  acc ^= val;
  acc = ((acc * P64_1) & M64) + P64_4;
  return acc & M64;
}
function xxh64avalanche(h) {
  h &= M64;
  h ^= h >> 33n; h = (h * P64_2) & M64;
  h ^= h >> 29n; h = (h * P64_3) & M64;
  h ^= h >> 32n;
  return h;
}
function xxh64(buf, seed = 0n) {
  seed &= M64;
  const len = buf.length;
  let i = 0;
  let h64;
  if (len >= 32) {
    let acc0 = (seed + P64_1 + P64_2) & M64;
    let acc1 = (seed + P64_2) & M64;
    let acc2 = seed;
    let acc3 = (seed - P64_1) & M64;
    const limit = len - 32;
    while (i <= limit) {
      acc0 = xxh64round(acc0, read64(buf, i)); i += 8;
      acc1 = xxh64round(acc1, read64(buf, i)); i += 8;
      acc2 = xxh64round(acc2, read64(buf, i)); i += 8;
      acc3 = xxh64round(acc3, read64(buf, i)); i += 8;
    }
    h64 = (rotl64(acc0,1) + rotl64(acc1,7) + rotl64(acc2,12) + rotl64(acc3,18)) & M64;
    h64 = xxh64mergeround(h64, acc0);
    h64 = xxh64mergeround(h64, acc1);
    h64 = xxh64mergeround(h64, acc2);
    h64 = xxh64mergeround(h64, acc3);
  } else {
    h64 = (seed + P64_5) & M64;
  }
  h64 = (h64 + BigInt(len)) & M64;
  let rem = len - i;
  while (rem >= 8) {
    const k1 = xxh64round(0n, read64(buf, i));
    i += 8; rem -= 8;
    h64 ^= k1;
    h64 = (((rotl64(h64, 27) * P64_1) & M64) + P64_4) & M64;
  }
  if (rem >= 4) {
    h64 ^= (read32(buf, i) * P64_1) & M64;
    i += 4; rem -= 4;
    h64 = (((rotl64(h64, 23) * P64_2) & M64) + P64_3) & M64;
  }
  while (rem > 0) {
    h64 ^= (BigInt(buf[i]) * P64_5) & M64;
    i += 1; rem -= 1;
    h64 = (rotl64(h64, 11) * P64_1) & M64;
  }
  return xxh64avalanche(h64);
}

const PRIME_MX1 = 0x165667919E3779F9n, PRIME_MX2 = 0x9FB21C651E98DF25n;

const KSECRET_HEX = (
  'b8fe6c3923a44bbe7c01812cf721ad1c' +
  'ded46de9839097db7240a4a4b7b3671f' +
  'cb79e64eccc0e578825ad07dccff7221' +
  'b8084674f743248ee03590e6813a264c' +
  '3c2852bb91c300cb88d0658b1b532ea3' +
  '71644897a20df94e3819ef46a9deacd8' +
  'a8fa763fe39c343ff9dcbbc7c70b4f1d' +
  '8a51e04bcdb45931c89f7ec9d9787364' +
  'eac5ac8334d3ebc3c581a0fffa1363eb' +
  '170ddd51b7f0da49d3165526 29d4689e'.replace(/\s/g, '') +
  '2b16be587d47a1fc8ff8b8d17ad031ce' +
  '45cb3a8f95160428afd7fbcabb4b407e'
);
const XXH3_kSecret = new Uint8Array(192);
for (let i = 0; i < 192; i++) XXH3_kSecret[i] = parseInt(KSECRET_HEX.substr(i * 2, 2), 16);

function u32(x) { return x & M32; }
function u64(x) { return x & M64; }
function swap32(x) { x = u32(x); return u32(((x & 0xffn) << 24n) | ((x & 0xff00n) << 8n) | ((x >> 8n) & 0xff00n) | ((x >> 24n) & 0xffn)); }
function swap64(x) {
  x = u64(x);
  let out = 0n;
  for (let i = 0; i < 8; i++) { out = (out << 8n) | (x & 0xffn); x >>= 8n; }
  return out;
}
function readLE32(buf, off) { return BigInt(buf[off] | (buf[off+1]<<8) | (buf[off+2]<<16) | (buf[off+3]<<24)) & M32; }
function readLE64(buf, off) {
  let v = 0n;
  for (let k = 7; k >= 0; k--) v = (v << 8n) | BigInt(buf[off + k]);
  return v;
}
function writeLE64(buf, off, v) {
  v = u64(v);
  for (let k = 0; k < 8; k++) { buf[off + k] = Number(v & 0xffn); v >>= 8n; }
}
function xorshift64(v, shift) { v = u64(v); return v ^ (v >> BigInt(shift)); }

function mult64to128(lhs, rhs) {
  lhs = u64(lhs); rhs = u64(rhs);
  const p = lhs * rhs;
  return { lo: u64(p), hi: u64(p >> 64n) };
}
function mul128_fold64(lhs, rhs) {
  const p = mult64to128(lhs, rhs);
  return p.lo ^ p.hi;
}
function mult32to64(lhs, rhs) { return (lhs & M32) * (rhs & M32); }

function XXH3_avalanche(h) {
  h = xorshift64(h, 37);
  h = u64(h * PRIME_MX1);
  h = xorshift64(h, 32);
  return h;
}
function XXH3_rrmxmx(h, len) {
  h = u64(h);
  h ^= rotl64(h, 49) ^ rotl64(h, 24);
  h = u64(h * PRIME_MX2);
  h ^= u64((h >> 35n) + BigInt(len));
  h = u64(h * PRIME_MX2);
  return xorshift64(h, 28);
}
function XXH64_avalanche(h) {
  h = u64(h);
  h ^= h >> 33n; h = u64(h * P64_2);
  h ^= h >> 29n; h = u64(h * P64_3);
  h ^= h >> 32n;
  return h;
}

function len_1to3_64b(input, off, len, secret, secOff, seed) {
  const c1 = BigInt(input[off]), c2 = BigInt(input[off + (len >> 1)]), c3 = BigInt(input[off + len - 1]);
  const combined = u32((c1 << 16n) | (c2 << 24n) | (c3 << 0n) | (BigInt(len) << 8n));
  const bitflip = u64(u64(readLE32(secret, secOff) ^ readLE32(secret, secOff + 4)) + seed);
  const keyed = u64(combined ^ bitflip);
  return XXH64_avalanche(keyed);
}
function len_4to8_64b(input, off, len, secret, secOff, seed) {
  seed = u64(seed ^ (swap32(u32(seed)) << 32n));
  const input1 = readLE32(input, off), input2 = readLE32(input, off + len - 4);
  const bitflip = u64(u64(readLE64(secret, secOff + 8) ^ readLE64(secret, secOff + 16)) - seed);
  const input64 = u64(input2 + (input1 << 32n));
  const keyed = u64(input64 ^ bitflip);
  return XXH3_rrmxmx(keyed, len);
}
function len_9to16_64b(input, off, len, secret, secOff, seed) {
  const bitflip1 = u64(u64(readLE64(secret, secOff + 24) ^ readLE64(secret, secOff + 32)) + seed);
  const bitflip2 = u64(u64(readLE64(secret, secOff + 40) ^ readLE64(secret, secOff + 48)) - seed);
  const inputLo = u64(readLE64(input, off) ^ bitflip1);
  const inputHi = u64(readLE64(input, off + len - 8) ^ bitflip2);
  const acc = u64(u64(u64(BigInt(len) + swap64(inputLo)) + inputHi) + mul128_fold64(inputLo, inputHi));
  return XXH3_avalanche(acc);
}
function len_0to16_64b(input, off, len, secret, seed) {
  if (len > 8) return len_9to16_64b(input, off, len, secret, 0, seed);
  if (len >= 4) return len_4to8_64b(input, off, len, secret, 0, seed);
  if (len > 0) return len_1to3_64b(input, off, len, secret, 0, seed);
  return XXH64_avalanche(u64(seed ^ u64(readLE64(secret, 56) ^ readLE64(secret, 64))));
}
function mix16B(input, iOff, secret, sOff, seed) {
  const inputLo = readLE64(input, iOff), inputHi = readLE64(input, iOff + 8);
  return mul128_fold64(
    u64(inputLo ^ u64(readLE64(secret, sOff) + seed)),
    u64(inputHi ^ u64(readLE64(secret, sOff + 8) - seed))
  );
}
function len_17to128_64b(input, off, len, secret, seed) {
  let acc = u64(BigInt(len) * P64_1);
  let i = Math.floor((len - 1) / 32);
  do {
    acc = u64(acc + mix16B(input, off + 16 * i, secret, 32 * i, seed));
    acc = u64(acc + mix16B(input, off + len - 16 * (i + 1), secret, 32 * i + 16, seed));
  } while (i-- !== 0);
  return XXH3_avalanche(acc);
}
function len_129to240_64b(input, off, len, secret, seed) {
  const MIDSIZE_STARTOFFSET = 3, MIDSIZE_LASTOFFSET = 17, SECRET_SIZE_MIN = 136;
  let acc = u64(BigInt(len) * P64_1);
  const nbRounds = Math.floor(len / 16);
  for (let i = 0; i < 8; i++) acc = u64(acc + mix16B(input, off + 16 * i, secret, 16 * i, seed));
  let accEnd = mix16B(input, off + len - 16, secret, SECRET_SIZE_MIN - MIDSIZE_LASTOFFSET, seed);
  acc = XXH3_avalanche(acc);
  for (let i = 8; i < nbRounds; i++) accEnd = u64(accEnd + mix16B(input, off + 16 * i, secret, 16 * (i - 8) + MIDSIZE_STARTOFFSET, seed));
  return XXH3_avalanche(u64(acc + accEnd));
}

function len_1to3_128b(input, off, len, secret, seed) {
  const c1 = BigInt(input[off]), c2 = BigInt(input[off + (len >> 1)]), c3 = BigInt(input[off + len - 1]);
  const combinedl = u32((c1 << 16n) | (c2 << 24n) | (c3 << 0n) | (BigInt(len) << 8n));
  const combinedh = rotl32(swap32(combinedl), 13);
  const bitflipl = u64(u64(readLE32(secret, 0) ^ readLE32(secret, 4)) + seed);
  const bitfliph = u64(u64(readLE32(secret, 8) ^ readLE32(secret, 12)) - seed);
  const keyedLo = u64(combinedl ^ bitflipl), keyedHi = u64(combinedh ^ bitfliph);
  return { lo: XXH64_avalanche(keyedLo), hi: XXH64_avalanche(keyedHi) };
}
function len_4to8_128b(input, off, len, secret, seed) {
  seed = u64(seed ^ (swap32(u32(seed)) << 32n));
  const inputLo = readLE32(input, off), inputHi = readLE32(input, off + len - 4);
  const input64 = u64(inputLo + (inputHi << 32n));
  const bitflip = u64(u64(readLE64(secret, 16) ^ readLE64(secret, 24)) + seed);
  const keyed = u64(input64 ^ bitflip);
  let m = mult64to128(keyed, u64(P64_1 + (BigInt(len) << 2n)));
  m.hi = u64(m.hi + (m.lo << 1n));
  m.lo = u64(m.lo ^ (m.hi >> 3n));
  m.lo = xorshift64(m.lo, 35);
  m.lo = u64(m.lo * PRIME_MX2);
  m.lo = xorshift64(m.lo, 28);
  m.hi = XXH3_avalanche(m.hi);
  return { lo: m.lo, hi: m.hi };
}
function len_9to16_128b(input, off, len, secret, seed) {
  const bitflipl = u64(u64(readLE64(secret, 32) ^ readLE64(secret, 40)) - seed);
  const bitfliph = u64(u64(readLE64(secret, 48) ^ readLE64(secret, 56)) + seed);
  const inputLo = readLE64(input, off);
  let inputHi = readLE64(input, off + len - 8);
  let m = mult64to128(u64(inputLo ^ inputHi ^ bitflipl), P64_1);
  m.lo = u64(m.lo + (BigInt(len - 1) << 54n));
  inputHi = u64(inputHi ^ bitfliph);
  m.hi = u64(m.hi + inputHi + mult32to64(u64(inputHi) & M32, u64(P32_2 - 1n)));
  m.lo = u64(m.lo ^ swap64(m.hi));
  let h = mult64to128(m.lo, P64_2);
  h.hi = u64(h.hi + u64(m.hi * P64_2));
  return { lo: XXH3_avalanche(h.lo), hi: XXH3_avalanche(h.hi) };
}
function len_0to16_128b(input, off, len, secret, seed) {
  if (len > 8) return len_9to16_128b(input, off, len, secret, seed);
  if (len >= 4) return len_4to8_128b(input, off, len, secret, seed);
  if (len > 0) return len_1to3_128b(input, off, len, secret, seed);
  const bitflipl = u64(readLE64(secret, 64) ^ readLE64(secret, 72));
  const bitfliph = u64(readLE64(secret, 80) ^ readLE64(secret, 88));
  return { lo: XXH64_avalanche(u64(seed ^ bitflipl)), hi: XXH64_avalanche(u64(seed ^ bitfliph)) };
}
function mix32B(accLo, accHi, input, i1Off, i2Off, secret, sOff, seed) {
  accLo = u64(accLo + mix16B(input, i1Off, secret, sOff, seed));
  accLo = u64(accLo ^ u64(readLE64(input, i2Off) + readLE64(input, i2Off + 8)));
  accHi = u64(accHi + mix16B(input, i2Off, secret, sOff + 16, seed));
  accHi = u64(accHi ^ u64(readLE64(input, i1Off) + readLE64(input, i1Off + 8)));
  return { lo: accLo, hi: accHi };
}
function len_17to128_128b(input, off, len, secret, seed) {
  let accLo = u64(BigInt(len) * P64_1), accHi = 0n;
  let i = Math.floor((len - 1) / 32);
  do {
    const r = mix32B(accLo, accHi, input, off + 16 * i, off + len - 16 * (i + 1), secret, 32 * i, seed);
    accLo = r.lo; accHi = r.hi;
  } while (i-- !== 0);
  const lo = XXH3_avalanche(u64(accLo + accHi));
  const hiRaw = u64(u64(accLo * P64_1) + u64(accHi * P64_4) + u64(BigInt(len - 0) * P64_2) - u64(seed * P64_2));
  const hi = u64(0n - XXH3_avalanche(hiRaw));
  return { lo, hi };
}
function len_129to240_128b(input, off, len, secret, seed) {
  const MIDSIZE_STARTOFFSET = 3, MIDSIZE_LASTOFFSET = 17, SECRET_SIZE_MIN = 136;
  let accLo = u64(BigInt(len) * P64_1), accHi = 0n;
  for (let i = 32; i < 160; i += 32) {
    const r = mix32B(accLo, accHi, input, off + i - 32, off + i - 16, secret, i - 32, seed);
    accLo = r.lo; accHi = r.hi;
  }
  accLo = XXH3_avalanche(accLo); accHi = XXH3_avalanche(accHi);
  for (let i = 160; i <= len; i += 32) {
    const r = mix32B(accLo, accHi, input, off + i - 32, off + i - 16, secret, MIDSIZE_STARTOFFSET + i - 160, seed);
    accLo = r.lo; accHi = r.hi;
  }
  const negSeed = u64(0n - seed);
  const r = mix32B(accLo, accHi, input, off + len - 16, off + len - 32, secret, SECRET_SIZE_MIN - MIDSIZE_LASTOFFSET - 16, negSeed);
  accLo = r.lo; accHi = r.hi;
  const lo = XXH3_avalanche(u64(accLo + accHi));
  const hiRaw = u64(u64(accLo * P64_1) + u64(accHi * P64_4) + u64(BigInt(len) * P64_2) - u64(seed * P64_2));
  const hi = u64(0n - XXH3_avalanche(hiRaw));
  return { lo, hi };
}

const INIT_ACC = [0xC2B2AE3Dn, P64_1, P64_2, P64_3, P64_4, 0x85EBCA77n, P64_5, 0x9E3779B1n];

function scalarRound(acc, input, iOff, secret, sOff, lane) {
  const dataVal = readLE64(input, iOff + lane * 8);
  const dataKey = u64(dataVal ^ readLE64(secret, sOff + lane * 8));
  acc[lane ^ 1] = u64(acc[lane ^ 1] + dataVal);
  acc[lane] = u64(mult32to64(dataKey & M32, (dataKey >> 32n) & M32) + acc[lane]);
}
function accumulate512(acc, input, iOff, secret, sOff) {
  for (let lane = 0; lane < 8; lane++) scalarRound(acc, input, iOff, secret, sOff, lane);
}
function accumulate(acc, input, iOff, secret, nbStripes) {
  for (let n = 0; n < nbStripes; n++) accumulate512(acc, input, iOff + n * 64, secret, n * 8);
}
function scrambleAcc(acc, secret, sOff) {
  for (let lane = 0; lane < 8; lane++) {
    const key64 = readLE64(secret, sOff + lane * 8);
    let acc64 = xorshift64(acc[lane], 47);
    acc64 ^= key64;
    acc64 = u64(acc64 * P32_1);
    acc[lane] = acc64;
  }
}
function initCustomSecret(seed64) {
  const secret = new Uint8Array(192);
  const nbRounds = 192 / 16;
  for (let i = 0; i < nbRounds; i++) {
    const lo = u64(readLE64(XXH3_kSecret, 16 * i) + seed64);
    const hi = u64(readLE64(XXH3_kSecret, 16 * i + 8) - seed64);
    writeLE64(secret, 16 * i, lo);
    writeLE64(secret, 16 * i + 8, hi);
  }
  return secret;
}
function hashLongInternalLoop(acc, input, len, secret) {
  const secretSize = secret.length;
  const nbStripesPerBlock = Math.floor((secretSize - 64) / 8);
  const blockLen = 64 * nbStripesPerBlock;
  const nbBlocks = Math.floor((len - 1) / blockLen);
  for (let n = 0; n < nbBlocks; n++) {
    accumulate(acc, input, n * blockLen, secret, nbStripesPerBlock);
    scrambleAcc(acc, secret, secretSize - 64);
  }
  const nbStripes = Math.floor(((len - 1) - blockLen * nbBlocks) / 64);
  accumulate(acc, input, nbBlocks * blockLen, secret, nbStripes);
  const p = len - 64;
  accumulate512(acc, input, p, secret, secretSize - 64 - 7);
}
function mix2Accs(acc, i, secret, sOff) {
  return mul128_fold64(u64(acc[i] ^ readLE64(secret, sOff)), u64(acc[i + 1] ^ readLE64(secret, sOff + 8)));
}
function mergeAccs(acc, secret, sOff, start) {
  let result = start;
  for (let i = 0; i < 4; i++) result = u64(result + mix2Accs(acc, 2 * i, secret, sOff + 16 * i));
  return XXH3_avalanche(result);
}
function finalizeLong64b(acc, secret, len) {
  return mergeAccs(acc, secret, 11, u64(BigInt(len) * P64_1));
}
function finalizeLong128b(acc, secret, len) {
  const lo = finalizeLong64b(acc, secret, len);
  const hi = mergeAccs(acc, secret, secret.length - 64 - 11, u64(~u64(BigInt(len) * P64_2)));
  return { lo, hi };
}
function hashLong64b(input, len, secret) {
  const acc = INIT_ACC.slice();
  hashLongInternalLoop(acc, input, len, secret);
  return finalizeLong64b(acc, secret, len);
}
function hashLong128b(input, len, secret) {
  const acc = INIT_ACC.slice();
  hashLongInternalLoop(acc, input, len, secret);
  return finalizeLong128b(acc, secret, len);
}

function secretFor(seed) { return seed === 0n ? XXH3_kSecret : initCustomSecret(seed); }

function xxh3_64(input, seed = 0n) {
  seed = u64(seed);
  const len = input.length;
  if (len <= 16) return len_0to16_64b(input, 0, len, XXH3_kSecret, seed);
  if (len <= 128) return len_17to128_64b(input, 0, len, XXH3_kSecret, seed);
  if (len <= 240) return len_129to240_64b(input, 0, len, XXH3_kSecret, seed);
  return hashLong64b(input, len, secretFor(seed));
}
function xxh3_128(input, seed = 0n) {
  seed = u64(seed);
  const len = input.length;
  let r;
  if (len <= 16) r = len_0to16_128b(input, 0, len, XXH3_kSecret, seed);
  else if (len <= 128) r = len_17to128_128b(input, 0, len, XXH3_kSecret, seed);
  else if (len <= 240) r = len_129to240_128b(input, 0, len, XXH3_kSecret, seed);
  else r = hashLong128b(input, len, secretFor(seed));
  return (r.hi << 64n) | r.lo;
}

module('xxHash', 'xxHash: a very fast non-cryptographic hash (XXH32, XXH64, XXH3-64, XXH3-128).',
  [A.select('Variant', ['XXH32', 'XXH64', 'XXH3-64', 'XXH3-128']), A.number('Seed', 0, 0)],
  (data, variant, seed) => {
    if (variant === 'XXH32') return xxh32(data, BigInt(seed) & 0xffffffffn).toString(16).padStart(8, '0');
    if (variant === 'XXH64') return xxh64(data, BigInt(seed) & ((1n << 64n) - 1n)).toString(16).padStart(16, '0');
    if (variant === 'XXH3-64') return xxh3_64(data, BigInt(seed) & ((1n << 64n) - 1n)).toString(16).padStart(16, '0');
    return xxh3_128(data, BigInt(seed) & ((1n << 64n) - 1n)).toString(16).padStart(32, '0');
  });
