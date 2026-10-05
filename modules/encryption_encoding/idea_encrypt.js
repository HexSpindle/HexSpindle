import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { blockCipherCrypt } from './_block_modes.js';
import { IDEA } from './_idea.js';

const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB'];

module('IDEA Encrypt', 'IDEA block cipher (used in the original PGP 2.x).',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Mode', MODES), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw'])],
  (data, key, iv, mode, inp, out) => {
    const plain = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = blockCipherCrypt(IDEA, { data: plain, key, iv, mode, decrypt: false });
    return out === 'Hex' ? bytesToHex(res) : res;
  });
