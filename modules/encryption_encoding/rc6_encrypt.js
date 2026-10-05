import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { blockCipherCrypt } from './_block_modes.js';
import { RC6 } from './_rc6.js';

const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB'];

module('RC6 Encrypt', 'RC6-32/r/b block cipher (AES finalist, derived from RC5) - 32-bit words, 128-bit blocks, variable-length key, default 20 rounds.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Mode', MODES), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw']), A.number('Rounds', 20, 1, 255)],
  (data, key, iv, mode, inp, out, rounds) => {
    const plain = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = blockCipherCrypt(RC6(rounds | 0), { data: plain, key, iv, mode, decrypt: false });
    return out === 'Hex' ? bytesToHex(res) : res;
  });
