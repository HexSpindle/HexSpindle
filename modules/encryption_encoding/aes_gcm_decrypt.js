import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesGcmDecrypt } from './_aead_core.js';
import { parseData, renderData, requireLength } from './_aead_ui.js';

module('AES-GCM Decrypt',
  'Authenticated AES-GCM decryption (NIST SP 800-38D / RFC 5116). Input must contain ciphertext followed by the authentication tag.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce / IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Tag length', ['8 bytes', '12 bytes', '16 bytes'], '16 bytes'),
    A.select('Input', ['Hex', 'Raw'], 'Hex'),
    A.select('Output', ['Raw', 'Hex'], 'Raw'),
  ],
  async (data, key, nonce, aad, tagLength, inputMode, outputMode) => {
    requireLength(key, [16, 24, 32], 'AES-GCM key');
    if (!nonce.length) throw new Error('Nonce / IV must not be empty');
    const tagLen = parseInt(tagLength, 10);
    const input = parseData(data, inputMode);
    const out = await aesGcmDecrypt(key, nonce, input, aad, tagLen);
    return renderData(out, outputMode);
  });
