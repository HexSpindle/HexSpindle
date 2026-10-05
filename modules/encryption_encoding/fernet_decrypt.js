import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Decode, bytesEqual } from '../../core/util.js';

function decodeToken(tokenStr) {
  let data;
  try { data = base64Decode(tokenStr); } catch { throw new Error('InvalidToken'); }
  if (!data.length || data[0] !== 0x80) throw new Error('InvalidToken');
  if (data.length < 9) throw new Error('InvalidToken');
  return data;
}

module('Fernet Decrypt', 'Decrypts a Fernet token.', [A.string('Key (base64)', '')],
  async (data, key) => {
    const keyBytes = base64Decode(key);
    if (keyBytes.length !== 32) throw new Error('Fernet key must be 32 url-safe base64-encoded bytes.');
    const signingKey = keyBytes.slice(0, 16), encKey = keyBytes.slice(16);
    const td = new TextDecoder('utf-8', { fatal: false });
    const tokenStr = td.decode(data).trim();
    const tok = decodeToken(tokenStr);

    const hk = await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expectedHmac = new Uint8Array(await crypto.subtle.sign('HMAC', hk, tok.slice(0, -32)));
    if (!bytesEqual(expectedHmac, tok.slice(-32))) throw new Error('InvalidToken');

    const iv = tok.slice(9, 25);
    const ciphertext = tok.slice(25, -32);
    const ck = await crypto.subtle.importKey('raw', encKey, 'AES-CBC', false, ['decrypt']);
    try {
      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, ck, ciphertext));
    } catch {
      throw new Error('InvalidToken');
    }
  });
