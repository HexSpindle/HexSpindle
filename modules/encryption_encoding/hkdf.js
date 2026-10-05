import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { hmacGeneric, DIGESTS } from './_hashes.js';

const WEBCRYPTO_HASH = { SHA256: 'SHA-256', SHA1: 'SHA-1', SHA384: 'SHA-384', SHA512: 'SHA-512' };

module('HKDF', 'HMAC-based key derivation (RFC 5869); outputs the key as hex. Input is the input keying material.',
  [A.toggle('Salt', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('Info', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'),
    A.number('Output length (bytes)', 32, 1), A.select('Hashing function', ['SHA256', 'SHA1', 'SHA384', 'SHA512', 'MD5'])],
  async (ikm, salt, info, length, h) => {
    length = Math.floor(length);
    if (h === 'MD5') {
      const size = DIGESTS.md5.size;
      const saltKey = salt && salt.length ? salt : new Uint8Array(size);
      const prk = hmacGeneric('md5', saltKey, ikm);
      let okm = new Uint8Array(0), t = new Uint8Array(0);
      for (let i = 1; okm.length < length; i++) {
        const input = new Uint8Array(t.length + info.length + 1);
        input.set(t, 0); input.set(info, t.length); input[t.length + info.length] = i;
        t = hmacGeneric('md5', prk, input);
        const next = new Uint8Array(okm.length + t.length);
        next.set(okm, 0); next.set(t, okm.length);
        okm = next;
      }
      return bytesToHex(okm.slice(0, length));
    }
    const hash = WEBCRYPTO_HASH[h];
    const saltBytes = salt && salt.length ? salt : new Uint8Array(0);
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash, salt: saltBytes, info }, key, length * 8);
    return bytesToHex(new Uint8Array(bits));
  });
