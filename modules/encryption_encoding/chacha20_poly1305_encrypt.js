import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { chacha20Poly1305Encrypt } from './_aead_core.js';
import { parseData, renderData, requireLength } from './_aead_ui.js';

module('ChaCha20-Poly1305 Encrypt',
  'IETF ChaCha20-Poly1305 authenticated encryption (RFC 8439; IANA AEAD ID 29). Requires a 32-byte key and 12-byte nonce. Output is ciphertext followed by the 16-byte Poly1305 tag.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('Associated data', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Input', ['Raw', 'Hex'], 'Raw'),
    A.select('Output', ['Hex', 'Raw'], 'Hex'),
  ],
  (data, key, nonce, aad, inputMode, outputMode) => {
    requireLength(key, [32], 'ChaCha20-Poly1305 key');
    requireLength(nonce, [12], 'ChaCha20-Poly1305 nonce');
    return renderData(chacha20Poly1305Encrypt(key, nonce, parseData(data, inputMode), aad), outputMode);
  });
