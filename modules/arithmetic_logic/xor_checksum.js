import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

module('XOR Checksum', 'XORs all blocks of the input together.', [A.number('Blocksize', 1, 1)],
  (data, bs) => {
    bs = Math.trunc(bs);
    const acc = new Uint8Array(bs);
    for (let i = 0; i < data.length; i++) acc[i % bs] ^= data[i];
    return bytesToHex(acc);
  });
