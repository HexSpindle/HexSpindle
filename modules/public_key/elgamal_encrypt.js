import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { modExp, randomBelow, bytesToBigInt } from './_bignum.js';

module('ElGamal Encrypt', 'Encrypts the input with an ElGamal public key (p, g, y as hex - from Generate ElGamal Key Pair). Textbook ElGamal: no padding scheme, for education/CTF use.',
  [A.string('p (hex)', ''), A.string('g (hex)', ''), A.string('y (hex)', '')],
  (data, pHex, gHex, yHex) => {
    const p = BigInt('0x' + pHex), g = BigInt('0x' + gHex), y = BigInt('0x' + yHex);
    const m = bytesToBigInt(data);
    if (m >= p) throw new Error('Message (as a number) must be smaller than p - encrypt shorter input or use a bigger key');
    const k = randomBelow(p - 3n) + 2n;
    const c1 = modExp(g, k, p);
    const c2 = (m * modExp(y, k, p)) % p;
    return `c1: ${c1.toString(16)}\nc2: ${c2.toString(16)}`;
  }, { nondeterministic: true });
