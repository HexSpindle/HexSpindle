import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function reflect(v, bits) {
  let r = 0n;
  for (let i = 0; i < bits; i++) {
    r = (r << 1n) | (v & 1n);
    v >>= 1n;
  }
  return r;
}

const tableCache = new Map();

export function crc(data, params) {
  const [width, poly, init, refin, refout, xorout] = params;
  const mask = (1n << BigInt(width)) - 1n;
  const key = params.join(',');
  let t = tableCache.get(key);
  if (!t) {
    t = new Array(256);
    if (refin) {
      const rp = reflect(poly, width);
      for (let i = 0; i < 256; i++) {
        let c = BigInt(i);
        for (let k = 0; k < 8; k++) c = (c & 1n) ? (c >> 1n) ^ rp : c >> 1n;
        t[i] = c;
      }
    } else {
      const top = 1n << BigInt(width - 1);
      for (let i = 0; i < 256; i++) {
        let c = width >= 8 ? BigInt(i) << BigInt(width - 8) : BigInt(i);
        for (let k = 0; k < 8; k++) c = (c & top) ? ((c << 1n) ^ poly) & mask : (c << 1n) & mask;
        t[i] = c;
      }
    }
    tableCache.set(key, t);
  }
  let c;
  if (refin) {
    c = reflect(init, width);
    for (const b of data) c = t[Number((c ^ BigInt(b)) & 0xffn)] ^ (c >> 8n);
    if (!refout) c = reflect(c, width);
  } else {
    c = init;
    for (const b of data) c = t[Number(((c >> BigInt(width - 8)) ^ BigInt(b)) & 0xffn)] ^ ((c << 8n) & mask);
    if (refout) c = reflect(c, width);
  }
  return (c ^ xorout) & mask;
}

export function crcHex(data, params) {
  return crc(data, params).toString(16).padStart(Math.ceil(params[0] / 4), '0');
}

export const CRC8 = {
  'CRC-8': [8, 0x07n, 0x00n, false, false, 0x00n],
  'CRC-8/CDMA2000': [8, 0x9Bn, 0xFFn, false, false, 0x00n],
  'CRC-8/DARC': [8, 0x39n, 0x00n, true, true, 0x00n],
  'CRC-8/MAXIM': [8, 0x31n, 0x00n, true, true, 0x00n],
  'CRC-8/SAE-J1850': [8, 0x1Dn, 0xFFn, false, false, 0xFFn],
  'CRC-8/ITU': [8, 0x07n, 0x00n, false, false, 0x55n],
  'CRC-8/ROHC': [8, 0x07n, 0xFFn, true, true, 0x00n],
  'CRC-8/WCDMA': [8, 0x9Bn, 0x00n, true, true, 0x00n],
};

module('CRC-8 Checksum', '8-bit cyclic redundancy check (many variants).',
  [A.select('Algorithm', Object.keys(CRC8))],
  (data, alg) => crcHex(data, CRC8[alg]));
