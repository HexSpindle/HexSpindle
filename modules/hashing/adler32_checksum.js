import { module } from './_cat.js';

export function adler32(u8) {
  const MOD = 65521;
  let a = 1, b = 0;
  for (const byte of u8) {
    a = (a + byte) % MOD;
    b = (b + a) % MOD;
  }
  return ((b << 16) | a) >>> 0;
}

module('Adler-32 Checksum', 'Adler-32 checksum as used by zlib.', [],
  (data) => adler32(data).toString(16).padStart(8, '0'));
