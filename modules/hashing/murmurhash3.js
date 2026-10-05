import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function murmur3_32(data, seed) {
  const c1 = 0xcc9e2d51n, c2 = 0x1b873593n, M32 = 0xffffffffn;
  let h = BigInt(seed) & M32;
  const rot = (x, r) => ((x << BigInt(r)) | (x >> BigInt(32 - r))) & M32;
  const n = Math.floor(data.length / 4) * 4;
  for (let i = 0; i < n; i += 4) {
    let k = BigInt(data[i] | (data[i+1]<<8) | (data[i+2]<<16) | (data[i+3]<<24)) & M32;
    k = (rot((k * c1) & M32, 15) * c2) & M32;
    h = ((rot(h ^ k, 13) * 5n + 0xe6546b64n) & M32);
  }
  const tail = data.subarray(n);
  let k = 0n;
  for (let i = tail.length - 1; i >= 0; i--) k = (k << 8n) | BigInt(tail[i]);
  if (tail.length) {
    k = (rot((k * c1) & M32, 15) * c2) & M32;
    h ^= k;
  }
  h ^= BigInt(data.length);
  h ^= h >> 16n;
  h = (h * 0x85ebca6bn) & M32;
  h ^= h >> 13n;
  h = (h * 0xc2b2ae35n) & M32;
  h ^= h >> 16n;
  return h;
}

module('MurmurHash3', 'MurmurHash3 x86 32-bit.', [A.number('Seed', 0, 0), A.select('Output', ['Hex', 'Decimal'])],
  (data, seed, out) => {
    const h = murmur3_32(data, seed);
    return out === 'Hex' ? h.toString(16).padStart(8, '0') : h.toString();
  });
