import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { secureRandBits, secureRandBelow } from './_cat.js';

function modPow(base, exp, mod) {
  base %= mod;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

function isProbablePrime(n, k = 20) {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n]) {
    if (n % p === 0n) return n === p;
  }
  let d = n - 1n, r = 0n;
  while (d % 2n === 0n) { d /= 2n; r += 1n; }
  for (let i = 0; i < k; i++) {
    const a = 2n + secureRandBelow(n - 3n);
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let j = 1n; j < r; j++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

module('Pseudo-Random Prime Generator', 'Generates a random probable prime of the given bit length (Miller-Rabin tested). The input is ignored.',
  [A.number('Bit length', 128, 8, 4096)],
  (data, bits) => {
    bits = Math.trunc(bits);
    for (;;) {
      const n = secureRandBits(bits) | (1n << BigInt(bits - 1)) | 1n;
      if (isProbablePrime(n)) return n.toString();
    }
  }, { nondeterministic: true });
