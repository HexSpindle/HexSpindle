import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { toPem } from './_pem.js';
import { buildDsaSpkiDer, buildDsaPkcs8Der } from './_pki.js';
import { modExp, randomBigInt, randomBelow, isProbablePrime } from './_bignum.js';

const N_FOR_L = { 1024: 160, 2048: 224, 3072: 256 };

function generateParams(L) {
  const N = N_FOR_L[L];
  while (true) {
    const q = randomBigInt(N) | 1n;
    if (!isProbablePrime(q)) continue;
    for (let tries = 0; tries < 4096; tries++) {
      const x = randomBigInt(L);
      let k = x / q;
      if (k * q < x) k += 1n;
      if (k % 2n === 1n) k += 1n;
      const p = k * q + 1n;
      if (p.toString(2).length !== L) continue;
      if (isProbablePrime(p)) return { p, q };
    }
  }
}
function findGenerator(p, q) {
  const e = (p - 1n) / q;
  for (let h = 2n; ; h++) {
    const g = modExp(h, e, p);
    if (g !== 1n) return g;
  }
}

module('Generate DSA Key Pair', 'Generates a DSA key pair (the classic Digital Signature Algorithm). The input is ignored.',
  [A.select('Key size (bits)', ['2048', '1024', '3072'])],
  (data, bits) => {
    const L = +bits;
    const { p, q } = generateParams(L);
    const g = findGenerator(p, q);
    const x = randomBelow(q - 1n) + 1n;
    const y = modExp(g, x, p);
    return toPem(buildDsaSpkiDer(p, q, g, y), 'PUBLIC KEY') + toPem(buildDsaPkcs8Der(p, q, g, x), 'PRIVATE KEY');
  }, { nondeterministic: true });
