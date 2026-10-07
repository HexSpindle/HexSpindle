import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesGcmEncrypt } from './_aead_core.js';
import { parseData, renderData, requireLength } from './_aead_ui.js';

module('AES-GCM Encrypt',
  'Authenticated AES-GCM encryption (NIST SP 800-38D / RFC 5116). Covers IANA AEAD IDs 1, 2, 5, 6, 7 and 8 by selecting the matching key and tag length. Output is ciphertext with the authentication tag appended.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce / IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Tag length', ['8 bytes', '12 bytes', '16 bytes'], '16 bytes'),
    A.select('Input', ['Raw', 'Hex'], 'Raw'),
    A.select('Output', ['Hex', 'Raw'], 'Hex'),
  ],
  async (data, key, nonce, aad, tagLength, inputMode, outputMode) => {
    requireLength(key, [16, 24, 32], 'AES-GCM key');
    if (!nonce.length) throw new Error('Nonce / IV must not be empty');
    const tagLen = parseInt(tagLength, 10);
    const plain = parseData(data, inputMode);
    const out = await aesGcmEncrypt(key, nonce, plain, aad, tagLen);
    return renderData(out, outputMode);
  });
