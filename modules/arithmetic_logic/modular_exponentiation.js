import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function modPow(base, exp, mod) {
  base %= mod; if (base < 0n) base += mod;
  let result = 1n;
  while (exp > 0n) { if (exp & 1n) result = (result * base) % mod; exp >>= 1n; base = (base * base) % mod; }
  return result;
}

module('Modular Exponentiation', 'Computes base^exponent mod modulus using BigInt (arbitrary precision, native to JS).', [A.string('Base', '4'), A.string('Exponent', '13'), A.string('Modulus', '497')],
  (t, base, exp, mod) => modPow(BigInt(base.trim()), BigInt(exp.trim()), BigInt(mod.trim())).toString(), { text: true });
