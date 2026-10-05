import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { blockCipherCrypt } from './_block_modes.js';
import { TWOFISH } from './_twofish.js';

const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB'];

module('Twofish Encrypt', 'Twofish block cipher (AES finalist) - 128-bit blocks, 128/192/256-bit keys, 16-round Feistel network.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Mode', MODES), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw'])],
  (data, key, iv, mode, inp, out) => {
    const plain = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = blockCipherCrypt(TWOFISH, { data: plain, key, iv, mode, decrypt: false });
    return out === 'Hex' ? bytesToHex(res) : res;
  });
