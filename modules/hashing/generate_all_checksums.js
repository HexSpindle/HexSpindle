import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { CRC_CATALOGUE, ccCrc } from './_crc_catalogue.js';
import { fletcher, fletcher8 } from './fletcher8_checksum.js';
import { adler32 } from './adler32_checksum.js';

const OTHERS = {
  'Fletcher-8': (d) => fletcher8(d),
  'Fletcher-16': (d) => fletcher(d, 8),
  'Adler-32': (d) => adler32(d).toString(16).padStart(8, '0'),
  'Fletcher-32': (d) => fletcher(d, 16),
  'Fletcher-64': (d) => fletcher(d, 32),
};
const AFTER = { 'CRC-8/WCDMA': 'Fletcher-8', 'CRC-16/ZMODEM': 'Fletcher-16', 'CRC-31/PHILIPS': 'Adler-32', 'CRC-32/XZ': 'Fletcher-32', 'CRC-64/XZ': 'Fletcher-64' };
const CHECKSUMS = [];
for (const [name, [w, poly, init, refIn, refOut, xorOut]] of Object.entries(CRC_CATALOGUE)) {
  CHECKSUMS.push([name, (d) => ccCrc(BigInt(w), d, poly, init, refIn, refOut, xorOut)]);
  if (AFTER[name]) CHECKSUMS.push([AFTER[name], OTHERS[AFTER[name]]]);
}

const LENGTHS = ['All', '3', '4', '5', '6', '7', '8', '10', '11', '12', '13', '14', '15', '16', '17', '21', '24', '30', '31', '32', '40', '64', '82'];

module('Generate all checksums', 'Generates all available checksums for the input (every catalogue CRC plus Fletcher and Adler), optionally only those of one length.',
  [A.boolean('Include names', true), A.select('Length (bits)', LENGTHS)],
  (data, names, length = 'All') => {
    let out = '';
    for (const [name, fn] of CHECKSUMS) {
      if (length !== 'All' && length !== name.match(/-(\d{1,2})(\/|$)/)[1]) continue;
      const v = fn(data);
      out += names ? `${name}:${' '.repeat(25 - name.length)}${v}\n` : `${v}\n`;
    }
    return out;
  });
