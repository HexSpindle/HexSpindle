import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesEaxEncrypt } from './_aead_core.js';
import { parseData, renderData, requireLength } from './_aead_ui.js';

module('AES-EAX Encrypt',
  'AES-EAX authenticated encryption (Bellare, Rogaway and Wagner). AES-EAX is not an IANA AEAD registry entry, but is included as a widely used AEAD construction. Output is ciphertext with the EAX tag appended.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Tag length', ['4 bytes', '8 bytes', '12 bytes', '16 bytes'], '16 bytes'),
    A.select('Input', ['Raw', 'Hex'], 'Raw'),
    A.select('Output', ['Hex', 'Raw'], 'Hex'),
  ],
  (data, key, nonce, aad, tagLength, inputMode, outputMode) => {
    requireLength(key, [16, 24, 32], 'AES-EAX key');
    if (!nonce.length) throw new Error('Nonce must not be empty');
    const out = aesEaxEncrypt(key, nonce, parseData(data, inputMode), aad, parseInt(tagLength, 10));
    return renderData(out, outputMode);
  });
