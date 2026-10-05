import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { blockCipherCrypt } from './_block_modes.js';
import { PRESENT } from './_present.js';

const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB'];

module('PRESENT Decrypt', 'PRESENT ultra-lightweight block cipher decryption.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Mode', MODES), A.select('Input', ['Hex', 'Raw']), A.select('Output', ['Raw', 'Hex'])],
  (data, key, iv, mode, inp, out) => {
    const cipher = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = blockCipherCrypt(PRESENT, { data: cipher, key, iv, mode, decrypt: true });
    return out === 'Hex' ? bytesToHex(res) : res;
  });
