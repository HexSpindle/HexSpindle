import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { gostKeyUnwrapNo, gostKeyUnwrapCp } from '../encryption_encoding/_gost_sign.js';
import { ALGORITHMS, gostHexEncode } from './gost_sign.js';

const ALGO_INFO = { 'GOST R 34.12 (Magma, 2015)': { algo: 'Magma', blockBytes: 8 }, 'GOST R 34.12 (Kuznyechik, 2015)': { algo: 'Kuznyechik', blockBytes: 16 } };

module('GOST Key Unwrap', 'Unwraps a content-encryption key (CEK) that was wrapped with GOST Key Wrap, verifying its integrity MAC.',
  [
    A.toggle('Key (KEK, 32 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('User Key Material (UKM)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Input type', ['Hex', 'Raw']),
    A.select('Output type', ['Raw', 'Hex']),
    A.select('Algorithm', ALGORITHMS),
    A.select('Key wrapping', ['NO', 'CP']),
  ],
  (data, kek, ukm, inp, out, algorithm, keyWrapping) => {
    const { algo, blockBytes } = ALGO_INFO[algorithm];
    if (kek.length !== 32) throw new Error('Key must be 32 bytes');
    if (inp === 'Hex') data = parseHex(decodeLatin1(data));
    const expectedUkmLen = keyWrapping === 'CP' ? 8 : blockBytes;
    if (ukm.length !== expectedUkmLen) throw new Error(`User Key Material must be ${expectedUkmLen} bytes for ${keyWrapping} wrapping with ${algorithm}`);
    const expectedLen = keyWrapping === 'CP' ? 36 : 32 + (blockBytes >> 1);
    if (data.length !== expectedLen) throw new Error(`Incorrect input length. Expected ${expectedLen} bytes.`);
    const cek = keyWrapping === 'CP' ? gostKeyUnwrapCp(algo, kek, data, ukm) : gostKeyUnwrapNo(algo, kek, data, ukm);
    return out === 'Hex' ? gostHexEncode(cek) : cek;
  });
