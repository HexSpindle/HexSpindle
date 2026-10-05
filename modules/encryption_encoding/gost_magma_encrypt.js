import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { makeMagma, runMode } from './_gost.js';

export const MODES = ['ECB', 'CBC', 'CFB', 'OFB', 'CTR'];

module('GOST Magma Encrypt', "GOST R 34.12-2015 'Magma': the modern successor to GOST 28147-89, a 64-bit block cipher. 32-byte key.",
  [A.toggle('Key (32 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Mode', MODES), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw'])],
  (data, key, iv, mode, inp, out) => {
    if (inp === 'Hex') data = parseHex(decodeLatin1(data));
    const cipher = makeMagma(key);
    const res = runMode(cipher, mode, true, data, iv);
    return out === 'Hex' ? bytesToHex(res) : res;
  });
