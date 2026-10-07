import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { chacha20Poly1305Decrypt } from './_aead_core.js';
import { parseData, renderData, requireLength } from './_aead_ui.js';

module('ChaCha20-Poly1305 Decrypt',
  'IETF ChaCha20-Poly1305 authenticated decryption (RFC 8439; IANA AEAD ID 29). Input is ciphertext followed by the 16-byte Poly1305 tag.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Input', ['Hex', 'Raw'], 'Hex'),
    A.select('Output', ['Raw', 'Hex'], 'Raw'),
  ],
  (data, key, nonce, aad, inputMode, outputMode) => {
    requireLength(key, [32], 'ChaCha20-Poly1305 key');
    requireLength(nonce, [12], 'ChaCha20-Poly1305 nonce');
    return renderData(chacha20Poly1305Decrypt(key, nonce, parseData(data, inputMode), aad), outputMode);
  });
