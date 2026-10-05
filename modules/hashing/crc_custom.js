import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { crc } from './crc8_checksum.js';

function hexToBigInt(s) {
  s = s.trim().replace(/^0x/i, '') || '0';
  return BigInt('0x' + s);
}

module('CRC (custom parameters)', "Computes a CRC with any width/polynomial/init/reflect/xorout - the Rocksoft 'catalogue' model. Use this for a CRC variant not in the preset lists.",
  [A.number('Width (bits)', 32, 1, 64), A.string('Polynomial (hex)', '04C11DB7'), A.string('Init (hex)', 'FFFFFFFF'),
   A.boolean('Reflect input', true), A.boolean('Reflect output', true), A.string('XOR out (hex)', 'FFFFFFFF')],
  (data, width, poly, init, refin, refout, xorout) => {
    const params = [width, hexToBigInt(poly), hexToBigInt(init), refin, refout, hexToBigInt(xorout)];
    const v = crc(data, params);
    return v.toString(16).padStart(Math.ceil(width / 4), '0');
  });
