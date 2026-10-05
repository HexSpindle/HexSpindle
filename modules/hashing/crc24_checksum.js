import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { crcHex } from './crc8_checksum.js';

export const CRC24 = {
  'CRC-24/OPENPGP': [24, 0x864CFBn, 0xB704CEn, false, false, 0x000000n],
};

module('CRC-24 Checksum', '24-bit cyclic redundancy check (OpenPGP).',
  [A.select('Algorithm', Object.keys(CRC24))],
  (data, alg) => crcHex(data, CRC24[alg]));
