import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { blockCipherCrypt } from './_block_modes.js';
import { RC2 } from './_rc2.js';

const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB', 'GCM'];

module('RC2 Encrypt', 'RC2 (5-128 byte key).',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV / Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Mode', MODES), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw'])],
  (data, key, iv, modeSel, inp, out) => {
    const mode = modeSel === 'GCM' ? 'CBC' : modeSel;
    const plain = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = blockCipherCrypt(RC2, { data: plain, key, iv, mode, decrypt: false, strictCtr: false });
    return out === 'Hex' ? bytesToHex(res) : res;
  });
