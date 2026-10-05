import { module } from './_cat.js';

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

module('CRC-32 Checksum', 'Standard CRC-32 (zlib/PNG polynomial 0xEDB88320).', [], (data) => crc32(data).toString(16).padStart(8, '0'));
