import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const FUNCS = ['DJB2', 'DJB2a (xor variant)', 'SDBM', 'PJW / ELF hash', 'FNV-0 (32-bit)', 'FNV-1 (32-bit)', 'FNV-1a (32-bit)',
  'FNV-1 (64-bit)', 'FNV-1a (64-bit)', 'Jenkins one-at-a-time', 'Pearson (8-bit)', 'AP hash', 'BKDR hash'];

const PEARSON_T = Array.from({ length: 256 }, (_, i) => i);
{
  let seed = 1;
  for (let i = 1; i < 256; i++) {
    seed = (seed * 181 + 1) % 256;
    const j = seed % 256;
    [PEARSON_T[i], PEARSON_T[j]] = [PEARSON_T[j], PEARSON_T[i]];
  }
}

export function simpleHash(fn, data) {
  if (fn === 'DJB2') {
    let h = 5381n;
    for (const b of data) h = (h * 33n + BigInt(b)) & 0xffffffffffffffffn;
    return h & 0xffffffffn;
  }
  if (fn === 'DJB2a (xor variant)') {
    let h = 5381;
    for (const b of data) h = ((h * 33) ^ b) >>> 0;
    return h >>> 0;
  }
  if (fn === 'SDBM') {
    let h = 0;
    for (const b of data) h = (b + (h << 6) + (h << 16) - h) >>> 0;
    return h >>> 0;
  }
  if (fn === 'PJW / ELF hash') {
    let h = 0;
    for (const b of data) {
      h = ((h << 4) + b) >>> 0;
      const high = h & 0xf0000000;
      if (high) h ^= high >>> 24;
      h = (h & ~high) >>> 0;
    }
    return h >>> 0;
  }
  if (fn.startsWith('FNV')) {
    const bits64 = fn.includes('64');
    const prime = bits64 ? 0x100000001b3n : 0x01000193n;
    const offset = fn.startsWith('FNV-0') ? 0n : (bits64 ? 0xcbf29ce484222325n : 0x811c9dc5n);
    const mask = bits64 ? 0xffffffffffffffffn : 0xffffffffn;
    let h = offset;
    for (const byte of data) {
      const b = BigInt(byte);
      if (fn.includes('1a')) { h = (h ^ b) & mask; h = (h * prime) & mask; }
      else if (fn.startsWith('FNV-1 ')) { h = (h * prime) & mask; h = (h ^ b) & mask; }
      else { h = (h * prime) & mask; h ^= b; h &= mask; }
    }
    return h;
  }
  if (fn === 'Jenkins one-at-a-time') {
    let h = 0;
    for (const b of data) {
      h = (h + b) >>> 0;
      h = (h + (h << 10)) >>> 0;
      h ^= h >>> 6;
    }
    h = (h + (h << 3)) >>> 0;
    h ^= h >>> 11;
    h = (h + (h << 15)) >>> 0;
    return h >>> 0;
  }
  if (fn === 'Pearson (8-bit)') {
    let h = 0;
    for (const b of data) h = PEARSON_T[h ^ b];
    return h;
  }
  if (fn === 'AP hash') {
    let h = 0xaaaaaaaa;
    data.forEach((b, i) => {
      h = (i & 1) === 0
        ? (h ^ ((h << 7) ^ Math.imul(b, h >>> 3)))
        : (h ^ ~(((h << 11) + (b ^ (h >>> 5))) | 0));
      h = h >>> 0;
    });
    return h >>> 0;
  }
  if (fn === 'BKDR hash') {
    const seed = 131;
    let h = 0;
    for (const b of data) h = (h * seed + b) >>> 0;
    return h >>> 0;
  }
  throw new Error(fn);
}

module('Simple Hash Functions', 'A collection of small, classic non-cryptographic hash functions used in hash tables and old checksumming code (DJB2, SDBM, FNV, Jenkins, Pearson, ...).',
  [A.select('Function', FUNCS)],
  (data, fn) => {
    const v = simpleHash(fn, data);
    const width = fn === 'Pearson (8-bit)' ? 2 : (fn.includes('64') ? 16 : 8);
    return v.toString(16).padStart(width, '0');
  });
