import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const MASK = (1n << 64n) - 1n;
const rotl = (x, b) => ((x << BigInt(b)) | (x >> BigInt(64 - b))) & MASK;

export function siphash(key, data, cRounds = 2, dRounds = 4, outBits = 64) {
  if (key.length !== 16) throw new Error('Key must be 16 bytes');
  const dv = new DataView(key.buffer, key.byteOffset, key.byteLength);
  const k0 = dv.getBigUint64(0, true), k1 = dv.getBigUint64(8, true);
  let v0 = k0 ^ 0x736f6d6570736575n, v1 = k1 ^ 0x646f72616e646f6dn, v2 = k0 ^ 0x6c7967656e657261n, v3 = k1 ^ 0x7465646279746573n;
  if (outBits === 128) v1 ^= 0xeen;

  function sipround() {
    v0 = (v0 + v1) & MASK; v1 = rotl(v1, 13); v1 ^= v0; v0 = rotl(v0, 32);
    v2 = (v2 + v3) & MASK; v3 = rotl(v3, 16); v3 ^= v2;
    v0 = (v0 + v3) & MASK; v3 = rotl(v3, 21); v3 ^= v0;
    v2 = (v2 + v1) & MASK; v1 = rotl(v1, 17); v1 ^= v2; v2 = rotl(v2, 32);
  }

  const n = data.length;
  let i = 0;
  while (i + 8 <= n) {
    const m = new DataView(data.buffer, data.byteOffset + i, 8).getBigUint64(0, true);
    v3 ^= m;
    for (let r = 0; r < cRounds; r++) sipround();
    v0 ^= m;
    i += 8;
  }
  const tail = new Uint8Array(8);
  tail.set(data.subarray(i));
  tail[7] = n & 0xff;
  const m = new DataView(tail.buffer).getBigUint64(0, true);
  v3 ^= m;
  for (let r = 0; r < cRounds; r++) sipround();
  v0 ^= m;
  v2 ^= outBits === 128 ? 0xeen : 0xffn;
  for (let r = 0; r < dRounds; r++) sipround();
  const h0 = (v0 ^ v1 ^ v2 ^ v3) & MASK;
  if (outBits === 64) return h0;
  v1 ^= 0xddn;
  for (let r = 0; r < dRounds; r++) sipround();
  const h1 = (v0 ^ v1 ^ v2 ^ v3) & MASK;
  return (h0 << 64n) | h1;
}

module('SipHash', 'SipHash-c-d: a fast, keyed pseudorandom function designed to resist hash-flooding DoS attacks on hash tables. 16-byte key.',
  [A.toggle('Key (16 bytes)', '000102030405060708090a0b0c0d0e0f', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Variant', ['SipHash-2-4', 'SipHash-1-3', 'SipHash-4-8']), A.select('Output size', ['64-bit', '128-bit (SipHash128)'])],
  (data, key, variant, outsize) => {
    const [c, d] = { 'SipHash-2-4': [2, 4], 'SipHash-1-3': [1, 3], 'SipHash-4-8': [4, 8] }[variant];
    const bits = outsize.startsWith('128') ? 128 : 64;
    return siphash(key, data, c, d, bits).toString(16).padStart(bits / 4, '0');
  });
