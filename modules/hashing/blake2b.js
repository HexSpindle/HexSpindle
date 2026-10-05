import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, concatBytes } from '../../core/util.js';

const MASK64 = (1n << 64n) - 1n;
const IV = [
  0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
];
const SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
];
const rotr = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & MASK64;

function g(v, a, b, c, d, x, y) {
  v[a] = (v[a] + v[b] + x) & MASK64;
  v[d] = rotr(v[d] ^ v[a], 32);
  v[c] = (v[c] + v[d]) & MASK64;
  v[b] = rotr(v[b] ^ v[c], 24);
  v[a] = (v[a] + v[b] + y) & MASK64;
  v[d] = rotr(v[d] ^ v[a], 16);
  v[c] = (v[c] + v[d]) & MASK64;
  v[b] = rotr(v[b] ^ v[c], 63);
}

function compress(h, block, tLow, tHigh, final) {
  const m = new Array(16);
  const dv = new DataView(block.buffer, block.byteOffset, block.byteLength);
  for (let i = 0; i < 16; i++) m[i] = dv.getBigUint64(i * 8, true);
  const v = h.concat(IV);
  v[12] ^= tLow;
  v[13] ^= tHigh;
  if (final) v[14] = v[14] ^ MASK64;
  for (let round = 0; round < 12; round++) {
    const s = SIGMA[round % 10];
    g(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
    g(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
    g(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
    g(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
    g(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
    g(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
    g(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
    g(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
  }
  for (let i = 0; i < 8; i++) h[i] = h[i] ^ v[i] ^ v[i + 8];
}

export function blake2b(data, digestBytes = 64, key = new Uint8Array(0)) {
  if (digestBytes < 1 || digestBytes > 64) throw new Error('BLAKE2b digest size must be 1-64 bytes');
  if (key.length > 64) throw new Error('BLAKE2b key must be at most 64 bytes');
  const h = IV.slice();
  h[0] ^= 0x01010000n ^ (BigInt(key.length) << 8n) ^ BigInt(digestBytes);

  const blocks = [];
  if (key.length) blocks.push({ bytes: concatBytes([key, new Uint8Array(128 - key.length)]), len: 128 });
  if (data.length || !key.length) {
    for (let off = 0; off < data.length; off += 128) {
      const chunk = data.subarray(off, off + 128);
      blocks.push({ bytes: chunk.length === 128 ? chunk : concatBytes([chunk, new Uint8Array(128 - chunk.length)]), len: chunk.length });
    }
    if (!data.length) blocks.push({ bytes: new Uint8Array(128), len: 0 });
  }

  let counter = 0n;
  const MASK64B = (1n << 64n) - 1n;
  for (let i = 0; i < blocks.length; i++) {
    const isLast = i === blocks.length - 1;
    counter += BigInt(blocks[i].len);
    const tLow = counter & MASK64B;
    const tHigh = (counter >> 64n) & MASK64B;
    compress(h, blocks[i].bytes, tLow, tHigh, isLast);
  }
  return finish(h, digestBytes);
}

function finish(h, digestBytes) {
  const out = new Uint8Array(64);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) dv.setBigUint64(i * 8, h[i], true);
  return out.subarray(0, digestBytes);
}

module('BLAKE2b', 'BLAKE2b hash with optional key.', [A.number('Size (bits)', 512, 8, 512), A.toggle('Key', '', ['UTF8', 'Hex', 'Latin1', 'Base64'])],
  (data, bits, key) => bytesToHex(blake2b(data, Math.floor(bits / 8), key)));
