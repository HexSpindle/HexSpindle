import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { gostKeyWrapNo, gostKeyWrapCp } from '../encryption_encoding/_gost_sign.js';
import { ALGORITHMS } from './gost_sign.js';

const ALGO_INFO = { 'GOST R 34.12 (Magma, 2015)': { algo: 'Magma', blockBytes: 8 }, 'GOST R 34.12 (Kuznyechik, 2015)': { algo: 'Kuznyechik', blockBytes: 16 } };

module('GOST Key Wrap', 'Wraps a 32-byte content-encryption key (CEK) with a 32-byte key-encryption key (KEK) using GOST key wrapping (RFC 4357). "NO" is the plain GOST 28147-89 wrap; "CP" additionally diversifies the KEK with the User Key Material (CryptoPro key wrap, Magma only).',
  [
    A.toggle('Key (KEK, 32 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('User Key Material (UKM)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Input type', ['Raw', 'Hex']),
    A.select('Output type', ['Hex', 'Raw']),
    A.select('Algorithm', ALGORITHMS),
    A.select('Key wrapping', ['NO', 'CP']),
  ],
  (data, kek, ukm, inp, out, algorithm, keyWrapping) => {
    const { algo, blockBytes } = ALGO_INFO[algorithm];
    if (kek.length !== 32) throw new Error('Key must be 32 bytes');
    if (inp === 'Hex') data = parseHex(decodeLatin1(data));
    if (data.length !== 32) throw new Error('Input (the content-encryption key to wrap) must be 32 bytes');
    const expectedUkmLen = keyWrapping === 'CP' ? 8 : blockBytes;
    if (ukm.length !== expectedUkmLen) throw new Error(`User Key Material must be ${expectedUkmLen} bytes for ${keyWrapping} wrapping with ${algorithm}`);
    const wrapped = keyWrapping === 'CP' ? gostKeyWrapCp(algo, kek, data, ukm) : gostKeyWrapNo(algo, kek, data, ukm);
    return out === 'Hex' ? bytesToHex(wrapped) : wrapped;
  });
