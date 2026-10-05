import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { crcHex } from './crc8_checksum.js';
import { customArgs, customCrc } from './_crc_catalogue.js';

export const CRC64 = {
  'CRC-64/ECMA-182': [64, 0x42F0E1EBA9EA3693n, 0x0n, false, false, 0x0n],
  'CRC-64/XZ': [64, 0x42F0E1EBA9EA3693n, 0xFFFFFFFFFFFFFFFFn, true, true, 0xFFFFFFFFFFFFFFFFn],
  'CRC-64/WE': [64, 0x42F0E1EBA9EA3693n, 0xFFFFFFFFFFFFFFFFn, false, false, 0xFFFFFFFFFFFFFFFFn],
  'CRC-64/GO-ISO': [64, 0x1Bn, 0xFFFFFFFFFFFFFFFFn, true, true, 0xFFFFFFFFFFFFFFFFn],
};

module('CRC-64 Checksum', '64-bit cyclic redundancy check (many variants).',
  [A.select('Algorithm', [...Object.keys(CRC64), 'Custom']), ...customArgs()],
  (data, alg, ...custom) => (alg === 'Custom' ? customCrc(data, ...custom) : crcHex(data, CRC64[alg])));
