import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { asconDecrypt } from './_ascon.js';

module('Ascon Decrypt', 'Ascon-AEAD128 authenticated decryption (NIST SP 800-232). Key and nonce must each be exactly 16 bytes; input is ciphertext followed by its 16-byte tag. Throws if authentication fails.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.toggle('Associated Data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.select('Input', ['Hex', 'Raw']), A.select('Output', ['Raw', 'Hex'])],
  (data, key, nonce, ad, inp, out) => {
    const cipher = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = asconDecrypt(key, nonce, ad, cipher);
    return out === 'Hex' ? bytesToHex(res) : res;
  });
