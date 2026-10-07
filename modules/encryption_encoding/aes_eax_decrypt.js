import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesEaxDecrypt } from './_aead_core.js';
import { parseData, renderData, requireLength } from './_aead_ui.js';

module('AES-EAX Decrypt',
  'AES-EAX authenticated decryption. Input must contain ciphertext followed by the EAX authentication tag.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Tag length', ['4 bytes', '8 bytes', '12 bytes', '16 bytes'], '16 bytes'),
    A.select('Input', ['Hex', 'Raw'], 'Hex'),
    A.select('Output', ['Raw', 'Hex'], 'Raw'),
  ],
  (data, key, nonce, aad, tagLength, inputMode, outputMode) => {
    requireLength(key, [16, 24, 32], 'AES-EAX key');
    if (!nonce.length) throw new Error('Nonce must not be empty');
    const out = aesEaxDecrypt(key, nonce, parseData(data, inputMode), aad, parseInt(tagLength, 10));
    return renderData(out, outputMode);
  });
