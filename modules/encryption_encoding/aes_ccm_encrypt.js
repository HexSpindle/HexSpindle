import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesCcmEncrypt } from './_aead_core.js';
import { parseData, renderData, requireLength, requireNonce } from './_aead_ui.js';

module('AES-CCM Encrypt',
  'AES-CCM authenticated encryption (NIST SP 800-38C / RFC 5116). Supports 128/192/256-bit AES keys, 7-13 byte nonces and valid CCM tag lengths. IANA IDs 3, 4, 9-14, 18 and 19 are covered by their specified key/nonce/tag parameter choices.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Tag length', ['4 bytes', '6 bytes', '8 bytes', '10 bytes', '12 bytes', '14 bytes', '16 bytes'], '16 bytes'),
    A.select('Input', ['Raw', 'Hex'], 'Raw'),
    A.select('Output', ['Hex', 'Raw'], 'Hex'),
  ],
  (data, key, nonce, aad, tagLength, inputMode, outputMode) => {
    requireLength(key, [16, 24, 32], 'AES-CCM key');
    requireNonce(nonce, 7, 13);
    const tagLen = parseInt(tagLength, 10);
    const out = aesCcmEncrypt(key, nonce, parseData(data, inputMode), aad, tagLen);
    return renderData(out, outputMode);
  });
