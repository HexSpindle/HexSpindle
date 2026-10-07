import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { xchacha20Poly1305Decrypt } from './_aead_core.js';
import { parseData, renderData, requireLength } from './_aead_ui.js';

module('XChaCha20-Poly1305 Decrypt',
  'XChaCha20-Poly1305 authenticated decryption (CFRG XChaCha draft; IANA AEAD ID 38). Input is ciphertext followed by the 16-byte Poly1305 tag.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Input', ['Hex', 'Raw'], 'Hex'),
    A.select('Output', ['Raw', 'Hex'], 'Raw'),
  ],
  (data, key, nonce, aad, inputMode, outputMode) => {
    requireLength(key, [32], 'XChaCha20-Poly1305 key');
    requireLength(nonce, [24], 'XChaCha20-Poly1305 nonce');
    return renderData(xchacha20Poly1305Decrypt(key, nonce, parseData(data, inputMode), aad), outputMode);
  });
