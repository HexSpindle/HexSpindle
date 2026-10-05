import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { keccakSponge } from './keccak.js';

export function sha3(data, digestBits) {
  const digestBytes = digestBits / 8;
  const rate = 200 - 2 * digestBytes;
  return keccakSponge(data, rate, 0x06, digestBytes);
}

module('SHA3', 'SHA-3 family (FIPS 202).', [A.select('Size', ['512', '384', '256', '224'])],
  (data, size) => bytesToHex(sha3(data, parseInt(size, 10))));
