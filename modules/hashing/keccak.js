import { module } from './_cat.js';
import { A } from '../../core/registry.js';


const MASK64 = (1n << 64n) - 1n;
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const RHO = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

function rotl64(x, n) {
  if (n === 0) return x;
  return ((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK64;
}

export function keccakF1600(state, rounds = 24) {
  const start = 24 - rounds;
  const C = new BigUint64Array(5);
  const D = new BigUint64Array(5);
  const B = new BigUint64Array(25);
  for (let round = start; round < 24; round++) {
    for (let x = 0; x < 5; x++) C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) state[x + 5 * y] ^= D[x];
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
      const nx = y, ny = (2 * x + 3 * y) % 5;
      B[nx + 5 * ny] = rotl64(state[x + 5 * y], RHO[x + 5 * y]);
    }
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
      state[x + 5 * y] = B[x + 5 * y] ^ (~B[(x + 1) % 5 + 5 * y] & B[(x + 2) % 5 + 5 * y]);
    }
    state[0] ^= RC[round];
  }
}

function absorbBlock(state, block) {
  const dv = new DataView(block.buffer, block.byteOffset, block.byteLength);
  for (let i = 0; i < block.length / 8; i++) state[i] ^= dv.getBigUint64(i * 8, true);
}

function squeezeBlock(state, rateBytes) {
  const out = new Uint8Array(rateBytes);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < rateBytes / 8; i++) dv.setBigUint64(i * 8, state[i], true);
  return out;
}

export function keccakSponge(data, rateBytes, domainByte, outputBytes, rounds = 24) {
  const state = new BigUint64Array(25);
  let offset = 0;
  while (data.length - offset >= rateBytes) {
    absorbBlock(state, data.subarray(offset, offset + rateBytes));
    keccakF1600(state, rounds);
    offset += rateBytes;
  }
  const last = new Uint8Array(rateBytes);
  last.set(data.subarray(offset));
  const partial = data.length - offset;
  last[partial] ^= domainByte;
  last[rateBytes - 1] ^= 0x80;
  absorbBlock(state, last);
  keccakF1600(state, rounds);

  const out = new Uint8Array(outputBytes);
  let outOff = 0;
  while (outOff < outputBytes) {
    const chunk = squeezeBlock(state, rateBytes);
    const n = Math.min(rateBytes, outputBytes - outOff);
    out.set(chunk.subarray(0, n), outOff);
    outOff += n;
    if (outOff < outputBytes) keccakF1600(state, rounds);
  }
  return out;
}

export function keccak(data, digestBits) {
  const digestBytes = digestBits / 8;
  const rate = 200 - 2 * digestBytes;
  return keccakSponge(data, rate, 0x01, digestBytes);
}

module('Keccak', 'Original Keccak (pre-FIPS padding, as used by Ethereum).', [A.select('Size', ['512', '384', '256', '224'], '256')],
  (data, size) => [...keccak(data, parseInt(size, 10))].map(b => b.toString(16).padStart(2, '0')).join(''));
