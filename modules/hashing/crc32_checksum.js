import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { CRC_CATALOGUE, customArgs, ccCrc, customCrc } from './_crc_catalogue.js';

let TABLE = null;
function table() {
  if (TABLE) return TABLE;
  TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    TABLE[n] = c >>> 0;
  }
  return TABLE;
}
export function crc32(u8) {
  const t = table();
  let crc = 0xffffffff;
  for (const b of u8) crc = t[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const VARIANTS = Object.keys(CRC_CATALOGUE).filter((n) => /^CRC-32(\/|$)/.test(n) && n !== 'CRC-32');

module('CRC-32 Checksum', 'Standard CRC-32 (zlib/PNG polynomial 0xEDB88320), other 32-bit catalogue variants, or custom parameters.',
  [A.select('Algorithm', ['CRC-32', ...VARIANTS, 'Custom']), ...customArgs()],
  (data, alg = 'CRC-32', ...custom) => {
    if (alg === 'CRC-32') return crc32(data).toString(16).padStart(8, '0');
    if (alg === 'Custom') return customCrc(data, ...custom);
    const [w, poly, init, refIn, refOut, xorOut] = CRC_CATALOGUE[alg];
    return ccCrc(BigInt(w), data, poly, init, refIn, refOut, xorOut);
  });
