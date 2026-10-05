import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, concatBytes } from '../../core/util.js';

const IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
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
const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;

function g(v, a, b, c, d, x, y) {
  v[a] = (v[a] + v[b] + x) >>> 0;
  v[d] = rotr(v[d] ^ v[a], 16);
  v[c] = (v[c] + v[d]) >>> 0;
  v[b] = rotr(v[b] ^ v[c], 12);
  v[a] = (v[a] + v[b] + y) >>> 0;
  v[d] = rotr(v[d] ^ v[a], 8);
  v[c] = (v[c] + v[d]) >>> 0;
  v[b] = rotr(v[b] ^ v[c], 7);
}

function compress(h, block, tLow, tHigh, final) {
  const m = new Array(16);
  const dv = new DataView(block.buffer, block.byteOffset, block.byteLength);
  for (let i = 0; i < 16; i++) m[i] = dv.getUint32(i * 4, true);
  const v = h.concat(IV);
  v[12] = (v[12] ^ tLow) >>> 0;
  v[13] = (v[13] ^ tHigh) >>> 0;
  if (final) v[14] = (~v[14]) >>> 0;
  for (let round = 0; round < 10; round++) {
    const s = SIGMA[round];
    g(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
    g(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
    g(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
    g(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
    g(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
    g(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
    g(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
    g(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
  }
  for (let i = 0; i < 8; i++) h[i] = (h[i] ^ v[i] ^ v[i + 8]) >>> 0;
}

export function blake2s(data, digestBytes = 32, key = new Uint8Array(0)) {
  if (digestBytes < 1 || digestBytes > 32) throw new Error('BLAKE2s digest size must be 1-32 bytes');
  if (key.length > 32) throw new Error('BLAKE2s key must be at most 32 bytes');
  const h = IV.slice();
  h[0] = (h[0] ^ 0x01010000 ^ (key.length << 8) ^ digestBytes) >>> 0;

  const blocks = [];
  if (key.length) blocks.push({ bytes: concatBytes([key, new Uint8Array(64 - key.length)]), len: 64 });
  if (data.length || !key.length) {
    for (let off = 0; off < data.length; off += 64) {
      const chunk = data.subarray(off, off + 64);
      blocks.push({ bytes: chunk.length === 64 ? chunk : concatBytes([chunk, new Uint8Array(64 - chunk.length)]), len: chunk.length });
    }
    if (!data.length) blocks.push({ bytes: new Uint8Array(64), len: 0 });
  }

  let counter = 0n;
  for (let i = 0; i < blocks.length; i++) {
    const isLast = i === blocks.length - 1;
    counter += BigInt(blocks[i].len);
    const tLow = Number(counter & 0xffffffffn);
    const tHigh = Number((counter >> 32n) & 0xffffffffn);
    compress(h, blocks[i].bytes, tLow, tHigh, isLast);
  }
  const out = new Uint8Array(32);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) dv.setUint32(i * 4, h[i], true);
  return out.subarray(0, digestBytes);
}

module('BLAKE2s', 'BLAKE2s hash with optional key.', [A.number('Size (bits)', 256, 8, 256), A.toggle('Key', '', ['UTF8', 'Hex', 'Latin1', 'Base64'])],
  (data, bits, key) => bytesToHex(blake2s(data, Math.floor(bits / 8), key)));
