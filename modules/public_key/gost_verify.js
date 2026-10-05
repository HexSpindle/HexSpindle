import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { gostVerify } from '../encryption_encoding/_gost_sign.js';
import { ALGORITHMS } from './gost_sign.js';

const ALGO_INFO = { 'GOST R 34.12 (Magma, 2015)': { algo: 'Magma', blockBytes: 8 }, 'GOST R 34.12 (Kuznyechik, 2015)': { algo: 'Kuznyechik', blockBytes: 16 } };

module('GOST Verify', 'Verifies the GOST MAC ("imitovstavka") of a message produced by GOST Sign. Enter the MAC in the MAC field; this checks a symmetric checksum, not an asymmetric signature.',
  [
    A.toggle('Key (32 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('MAC', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Input type', ['Raw', 'Hex']),
    A.select('Algorithm', ALGORITHMS),
  ],
  (data, key, iv, mac, inp, algorithm) => {
    const { algo, blockBytes } = ALGO_INFO[algorithm];
    if (key.length !== 32) throw new Error('Key must be 32 bytes');
    if (inp === 'Hex') data = parseHex(decodeLatin1(data));
    if (iv.length && iv.length !== blockBytes) throw new Error(`IV must be ${blockBytes} bytes for ${algorithm} (or empty for the default all-zero IV)`);
    if (!mac.length || mac.length > blockBytes) throw new Error(`MAC must be between 1 and ${blockBytes} bytes for ${algorithm}`);
    const ok = gostVerify(algo, key, mac, data, iv.length ? iv : null);
    return ok ? 'The signature matches' : 'The signature does not match';
  });
