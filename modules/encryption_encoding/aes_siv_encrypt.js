import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { aesSivEncrypt } from './_aead_core.js';
import { parseData, renderData, requireLength, parseSivAad } from './_aead_ui.js';

module('AES-SIV Encrypt',
  'RFC 5297 AES-SIV-CMAC misuse-resistant authenticated encryption. Supports IANA AEAD_AES_SIV_CMAC_256/384/512 (IDs 15-17). The total SIV key is 32, 48 or 64 bytes. Associated-data components are hex strings separated by new lines or semicolons.',
  [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.area('Associated data components (hex)', '', 'One component per line or separated with semicolons. Leave blank for none.'),
    A.select('Input', ['Raw', 'Hex'], 'Raw'),
    A.select('Output', ['Hex', 'Raw'], 'Hex'),
  ],
  (data, key, aadText, inputMode, outputMode) => {
    requireLength(key, [32, 48, 64], 'AES-SIV total key');
    const out = aesSivEncrypt(key, parseData(data, inputMode), parseSivAad(aadText));
    return renderData(out, outputMode);
  });
