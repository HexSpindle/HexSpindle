import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const M = 0x5bd1e995n, R = 24n;
const M32 = 0xffffffffn, M64 = (1n << 64n) - 1n;

function read32(u8, i) { return BigInt(u8[i] | (u8[i+1]<<8) | (u8[i+2]<<16) | (u8[i+3]<<24)) & M32; }
function read64(u8, i) { let v = 0n; for (let k = 7; k >= 0; k--) v = (v << 8n) | BigInt(u8[i+k]); return v; }

function murmur2_32(data, seed) {
  let h = (BigInt(seed) ^ BigInt(data.length)) & M32;
  const n = Math.floor(data.length / 4) * 4;
  for (let i = 0; i < n; i += 4) {
    let k = read32(data, i);
    k = (k * M) & M32;
    k ^= k >> R;
    k = (k * M) & M32;
    h = (h * M) & M32;
    h ^= k;
  }
  const tail = data.subarray(n);
  if (tail.length === 3) h ^= BigInt(tail[2]) << 16n;
  if (tail.length >= 2) h ^= BigInt(tail[1]) << 8n;
  if (tail.length >= 1) { h ^= BigInt(tail[0]); h = (h * M) & M32; }
  h ^= h >> 13n;
  h = (h * M) & M32;
  h ^= h >> 15n;
  return h;
}

function murmur2_64a(data, seed) {
  const M64C = 0xc6a4a7935bd1e995n;
  let h = (BigInt(seed) ^ ((BigInt(data.length) * M64C) & M64)) & M64;
  const n = Math.floor(data.length / 8) * 8;
  for (let i = 0; i < n; i += 8) {
    let k = read64(data, i);
    k = (k * M64C) & M64;
    k ^= k >> 47n;
    k = (k * M64C) & M64;
    h ^= k;
    h = (h * M64C) & M64;
  }
  const tail = data.subarray(n);
  for (let i = 0; i < tail.length; i++) h ^= BigInt(tail[i]) << BigInt(8 * i);
  if (tail.length) h = (h * M64C) & M64;
  h ^= h >> 47n;
  h = (h * M64C) & M64;
  h ^= h >> 47n;
  return h;
}

function murmur2_64b(data, seed) {
  let h1 = (BigInt(seed) ^ BigInt(data.length)) & M32, h2 = 0n;
  const n = Math.floor(data.length / 8) * 8;
  for (let i = 0; i < n; i += 8) {
    let k1 = read32(data, i);
    k1 = (k1 * M) & M32; k1 ^= k1 >> R; k1 = (k1 * M) & M32;
    h1 = (h1 * M) & M32; h1 ^= k1;
    let k2 = read32(data, i + 4);
    k2 = (k2 * M) & M32; k2 ^= k2 >> R; k2 = (k2 * M) & M32;
    h2 = (h2 * M) & M32; h2 ^= k2;
  }
  let tail = data.subarray(n);
  if (tail.length >= 4) {
    let k1 = read32(tail, 0);
    k1 = (k1 * M) & M32; k1 ^= k1 >> R; k1 = (k1 * M) & M32;
    h1 = (h1 * M) & M32; h1 ^= k1;
    tail = tail.subarray(4);
  }
  if (tail.length === 3) h2 ^= BigInt(tail[2]) << 16n;
  if (tail.length >= 2) h2 ^= BigInt(tail[1]) << 8n;
  if (tail.length >= 1) { h2 ^= BigInt(tail[0]); h2 = (h2 * M) & M32; }
  h1 ^= h2 >> 18n; h1 = (h1 * M) & M32;
  h2 ^= h1 >> 22n; h2 = (h2 * M) & M32;
  h1 ^= h2 >> 17n; h1 = (h1 * M) & M32;
  h2 ^= h1 >> 19n; h2 = (h2 * M) & M32;
  return ((h1 << 32n) | h2) & M64;
}

module('MurmurHash2', 'MurmurHash2 (32-bit and 64-bit A variants).',
  [A.number('Seed', 0, 0), A.select('Variant', ['32-bit', '64-bit (x64)', '64-bit (x86)'])],
  (data, seed, variant) => {
    if (variant === '32-bit') return murmur2_32(data, seed).toString(16).padStart(8, '0');
    if (variant === '64-bit (x64)') return murmur2_64a(data, seed).toString(16).padStart(16, '0');
    return murmur2_64b(data, seed).toString(16).padStart(16, '0');
  });
