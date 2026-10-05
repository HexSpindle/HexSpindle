import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { concatBytes, base64Decode } from '../../core/util.js';

function b64urlEncode(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_');
}

module('Fernet Encrypt', 'Encrypts with Fernet (AES-128-CBC + HMAC-SHA256). Key is a 32-byte url-safe Base64 string.', [A.string('Key (base64)', '')],
  async (data, key) => {
    const keyBytes = base64Decode(key);
    if (keyBytes.length !== 32) throw new Error('Fernet key must be 32 url-safe base64-encoded bytes.');
    const signingKey = keyBytes.slice(0, 16), encKey = keyBytes.slice(16);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const ts = Math.floor(Date.now() / 1000);
    const tsBytes = new Uint8Array(8);
    let t = BigInt(ts);
    for (let i = 7; i >= 0; i--) { tsBytes[i] = Number(t & 0xffn); t >>= 8n; }

    const ck = await crypto.subtle.importKey('raw', encKey, 'AES-CBC', false, ['encrypt']);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, ck, data));
    const basicParts = concatBytes([new Uint8Array([0x80]), tsBytes, iv, ciphertext]);

    const hk = await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', hk, basicParts));
    return b64urlEncode(concatBytes([basicParts, hmac]));
  });
