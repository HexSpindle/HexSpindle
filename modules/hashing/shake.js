import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { keccakSponge } from './keccak.js';

export function shake(data, capBits, outputBytes) {
  const rate = 200 - capBits / 8;
  return keccakSponge(data, rate, 0x1f, outputBytes);
}

module('Shake', 'SHAKE extendable-output functions.', [A.select('Capacity', ['256', '128']), A.number('Size (bits)', 512, 8)],
  (data, cap, bits) => bytesToHex(shake(data, cap === '128' ? 256 : 512, Math.floor(bits / 8))));
