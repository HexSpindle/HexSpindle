import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { modExp, bigIntToBytes } from './_bignum.js';

module('ElGamal Decrypt', 'Decrypts ElGamal ciphertext (c1, c2 as hex) with the private key.',
  [A.string('p (hex)', ''), A.string('x (private, hex)', ''), A.string('c1 (hex)', ''), A.string('c2 (hex)', '')],
  (data, pHex, xHex, c1Hex, c2Hex) => {
    const p = BigInt('0x' + pHex), x = BigInt('0x' + xHex);
    const c1 = BigInt('0x' + c1Hex), c2 = BigInt('0x' + c2Hex);
    const s = modExp(c1, x, p);
    const m = (c2 * modExp(s, p - 2n, p)) % p;
    return bigIntToBytes(m);
  });
