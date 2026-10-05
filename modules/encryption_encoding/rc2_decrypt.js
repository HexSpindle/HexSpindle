import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { blockCipherCrypt } from './_block_modes.js';
import { RC2 } from './_rc2.js';

const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB', 'GCM'];

module('RC2 Decrypt', 'RC2 decryption.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV / Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Mode', MODES), A.select('Input', ['Hex', 'Raw']), A.select('Output', ['Raw', 'Hex'])],
  (data, key, iv, modeSel, inp, out) => {
    const mode = modeSel === 'GCM' ? 'CBC' : modeSel;
    const ct = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = blockCipherCrypt(RC2, { data: ct, key, iv, mode, decrypt: true, strictCtr: false });
    return out === 'Hex' ? bytesToHex(res) : res;
  });
