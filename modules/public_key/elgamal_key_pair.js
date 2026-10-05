import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { modExp, randomBigInt, randomBelow, isProbablePrime } from './_bignum.js';

function generateSafePrime(bits) {
  while (true) {
    let q = randomBigInt(bits - 1) | 1n;
    if (!isProbablePrime(q)) continue;
    const p = 2n * q + 1n;
    if (isProbablePrime(p)) return { p, q };
  }
}
function findGenerator(p, q) {
  for (let cand = 2n; ; cand++) {
    if (modExp(cand, 2n, p) === 1n) continue;
    if (modExp(cand, q, p) === 1n) continue;
    return cand;
  }
}

module('Generate ElGamal Key Pair', 'Generates an ElGamal key pair (textbook ElGamal, as used for signatures/encryption in older PGP and in cryptography courses). The input is ignored.',
  [A.number('Key size (bits)', 256, 128, 2048)],
  (data, bits) => {
    const { p, q } = generateSafePrime(bits);
    const g = findGenerator(p, q);
    const x = randomBelow(p - 3n) + 2n;
    const y = modExp(g, x, p);
    return `p (modulus): ${p.toString(16)}\ng (generator): ${g.toString(16)}\ny (public): ${y.toString(16)}\nx (PRIVATE - keep secret): ${x.toString(16)}`;
  }, { nondeterministic: true });
