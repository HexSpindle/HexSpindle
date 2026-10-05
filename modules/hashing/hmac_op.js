import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

const ALGO = { 'SHA-1': 'SHA-1', 'SHA-256': 'SHA-256', 'SHA-384': 'SHA-384', 'SHA-512': 'SHA-512' };

module('HMAC', 'Keyed-hash message authentication code via the browser’s native Web Crypto API.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64']), A.select('Hashing function', Object.keys(ALGO))],
  async (data, key, hashName) => {
    const ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: ALGO[hashName] }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', ck, data));
    return bytesToHex(sig);
  });
