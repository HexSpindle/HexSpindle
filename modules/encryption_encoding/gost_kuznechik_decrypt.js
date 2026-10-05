import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { makeKuznechik, runMode } from './_gost.js';
import { MODES } from './gost_kuznechik_encrypt.js';

module('GOST Kuznechik Decrypt', "GOST R 34.12-2015 'Kuznechik' decryption.",
  [A.toggle('Key (32 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Mode', MODES), A.select('Input', ['Hex', 'Raw']), A.select('Output', ['Raw', 'Hex'])],
  (data, key, iv, mode, inp, out) => {
    if (inp === 'Hex') data = parseHex(decodeLatin1(data));
    const cipher = makeKuznechik(key);
    const res = runMode(cipher, mode, false, data, iv);
    return out === 'Hex' ? bytesToHex(res) : res;
  });
