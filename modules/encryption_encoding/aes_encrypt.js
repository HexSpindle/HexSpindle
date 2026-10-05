import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';

module('AES Encrypt', 'AES-CBC encryption via the browser’s native Web Crypto API (PKCS#7 padding).',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64']), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64']), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw'])],
  async (data, key, iv, inp, out) => {
    if (![16, 24, 32].includes(key.length)) throw new Error(`AES key must be 16, 24 or 32 bytes (got ${key.length})`);
    if (iv.length !== 16) throw new Error(`IV must be 16 bytes (got ${iv.length})`);
    const plain = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const ck = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, ck, plain));
    return out === 'Hex' ? bytesToHex(ct) : ct;
  });
