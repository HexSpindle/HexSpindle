import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesCcmDecrypt } from './_aead_core.js';
import { parseData, renderData, requireLength, requireNonce } from './_aead_ui.js';

module('AES-CCM Decrypt',
  'AES-CCM authenticated decryption (NIST SP 800-38C / RFC 5116). Input must contain ciphertext followed by the CCM authentication tag.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Tag length', ['4 bytes', '6 bytes', '8 bytes', '10 bytes', '12 bytes', '14 bytes', '16 bytes'], '16 bytes'),
    A.select('Input', ['Hex', 'Raw'], 'Hex'),
    A.select('Output', ['Raw', 'Hex'], 'Raw'),
  ],
  (data, key, nonce, aad, tagLength, inputMode, outputMode) => {
    requireLength(key, [16, 24, 32], 'AES-CCM key');
    requireNonce(nonce, 7, 13);
    const tagLen = parseInt(tagLength, 10);
    const out = aesCcmDecrypt(key, nonce, parseData(data, inputMode), aad, tagLen);
    return renderData(out, outputMode);
  });
