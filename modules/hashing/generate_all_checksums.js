import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { crcHex, CRC8 } from './crc8_checksum.js';
import { CRC16 } from './crc16_checksum.js';
import { CRC24 } from './crc24_checksum.js';
import { CRC64 } from './crc64_checksum.js';
import { fletcher, fletcher8 } from './fletcher8_checksum.js';
import { adler32 } from './adler32_checksum.js';

const CRC32 = {
  'CRC-32': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/BZIP2': [32, 0x04C11DB7n, 0xFFFFFFFFn, false, false, 0xFFFFFFFFn],
  'CRC-32C': [32, 0x1EDC6F41n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32D': [32, 0xA833982Bn, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/MPEG-2': [32, 0x04C11DB7n, 0xFFFFFFFFn, false, false, 0x00000000n],
  'CRC-32/POSIX': [32, 0x04C11DB7n, 0x00000000n, false, false, 0xFFFFFFFFn],
  'CRC-32Q': [32, 0x814141ABn, 0x00000000n, false, false, 0x00000000n],
  'CRC-32/JAMCRC': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0x00000000n],
  'CRC-32/XFER': [32, 0x000000AFn, 0x00000000n, false, false, 0x00000000n],
};

const CRC_BY_WIDTH = [CRC8, CRC16, CRC24, CRC32, CRC64];
const FLETCHER_WORD_BITS = [4, 8, 16, 32];

module('Generate all checksums', 'Computes every supported CRC / Fletcher / Adler checksum of the input.',
  [A.boolean('Include names', true)],
  (data, names) => {
    const rows = [];
    for (const table of CRC_BY_WIDTH) {
      for (const [n, p] of Object.entries(table)) rows.push([n, crcHex(data, p)]);
    }
    for (const wbits of FLETCHER_WORD_BITS) rows.push([`Fletcher-${wbits * 2}`, wbits === 4 ? fletcher8(data) : fletcher(data, wbits)]);
    rows.push(['Adler-32', adler32(data).toString(16).padStart(8, '0')]);
    return rows.map(([k, v]) => (names ? `${k}: ` : '') + v).join('\n');
  });
