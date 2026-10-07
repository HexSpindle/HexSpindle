import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesSivDecrypt } from './_aead_core.js';
import { parseData, renderData, requireLength, parseSivAad } from './_aead_ui.js';

module('AES-SIV Decrypt',
  'RFC 5297 AES-SIV-CMAC authenticated decryption. Input is the 16-byte synthetic IV followed by ciphertext. Supports IANA IDs 15-17.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.area('Associated data components (hex)', '', 'One component per line or separated with semicolons. Leave blank for none.'),
    A.select('Input', ['Hex', 'Raw'], 'Hex'),
    A.select('Output', ['Raw', 'Hex'], 'Raw'),
  ],
  (data, key, aadText, inputMode, outputMode) => {
    requireLength(key, [32, 48, 64], 'AES-SIV total key');
    const out = aesSivDecrypt(key, parseData(data, inputMode), parseSivAad(aadText));
    return renderData(out, outputMode);
  });
