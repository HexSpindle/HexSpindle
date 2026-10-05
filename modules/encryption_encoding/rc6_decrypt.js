import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { blockCipherCrypt } from './_block_modes.js';
import { RC6 } from './_rc6.js';

const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB'];

module('RC6 Decrypt', 'RC6-32/r/b block cipher decryption.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Mode', MODES), A.select('Input', ['Hex', 'Raw']), A.select('Output', ['Raw', 'Hex']), A.number('Rounds', 20, 1, 255)],
  (data, key, iv, mode, inp, out, rounds) => {
    const cipher = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = blockCipherCrypt(RC6(rounds | 0), { data: cipher, key, iv, mode, decrypt: true });
    return out === 'Hex' ? bytesToHex(res) : res;
  });
