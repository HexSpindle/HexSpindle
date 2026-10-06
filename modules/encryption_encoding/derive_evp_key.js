import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, concatBytes } from '../../core/util.js';
import { md5 } from './_hashes.js';

const HASHES = ['SHA1', 'SHA256', 'SHA384', 'SHA512', 'MD5'];
const WEBCRYPTO_HASH = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512' };

async function hashOnce(h, data) {
  if (h === 'MD5') return md5(data);
  return new Uint8Array(await crypto.subtle.digest(WEBCRYPTO_HASH[h], data));
}

module('Derive EVP key', 'OpenSSL EVP_BytesToKey key derivation from the Passphrase argument (the input is ignored); outputs the key as hex.',
  [A.toggle('Passphrase', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'), A.number('Key size (bits)', 128, 8),
    A.number('Iterations', 1, 1), A.select('Hashing function', HASHES), A.toggle('Salt', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex')],
  async (data, pw, bits, iters, h, salt) => {
    iters = Math.floor(iters);
    const need = Math.floor(bits / 8);
    let out = new Uint8Array(0);
    let prev = new Uint8Array(0);
    while (out.length < need) {
      prev = await hashOnce(h, concatBytes([prev, pw, salt]));
      for (let i = 0; i < iters - 1; i++) prev = await hashOnce(h, prev);
      out = concatBytes([out, prev]);
    }
    return bytesToHex(out.slice(0, need));
  });
