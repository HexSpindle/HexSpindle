import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { pbkdf2Generic } from './_hashes.js';

const HASHES = ['SHA1', 'SHA256', 'SHA384', 'SHA512', 'SHA224', 'MD5'];
const WEBCRYPTO_HASH = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512' };

module('Derive PBKDF2 key', 'PBKDF2 key derivation; outputs the key as hex.',
  [A.toggle('Passphrase', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'), A.number('Key size (bits)', 128, 8),
    A.number('Iterations', 1, 1), A.select('Hashing function', HASHES), A.toggle('Salt', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex')],
  async (data, pw, bits, iters, h, salt) => {
    if (!pw || !pw.length) pw = data;
    const dkLen = Math.floor(bits / 8);
    if (h === 'MD5' || h === 'SHA224') {
      return bytesToHex(pbkdf2Generic(h.toLowerCase(), pw, salt, iters, dkLen));
    }
    const key = await crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits']);
    const bitsOut = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iters, hash: WEBCRYPTO_HASH[h] }, key, dkLen * 8);
    return bytesToHex(new Uint8Array(bitsOut));
  });
