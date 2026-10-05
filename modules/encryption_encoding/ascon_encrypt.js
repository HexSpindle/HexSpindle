import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { asconEncrypt } from './_ascon.js';

module('Ascon Encrypt', 'Ascon-AEAD128 authenticated encryption (NIST SP 800-232). Key and nonce must each be exactly 16 bytes. Output is ciphertext followed by a 16-byte authentication tag.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.toggle('Associated Data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw'])],
  (data, key, nonce, ad, inp, out) => {
    const plain = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = asconEncrypt(key, nonce, ad, plain);
    return out === 'Hex' ? bytesToHex(res) : res;
  });
