import { module } from './_cat.js';

const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22, 5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
  4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23, 6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
const K = Array.from({ length: 64 }, (_, i) => (Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);

function md5(u8) {
  const msgLen = u8.length;
  const withOne = new Uint8Array(((msgLen + 9 + 63) & ~63));
  withOne.set(u8);
  withOne[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(withOne.length - 8, Number(bitLen & 0xffffffffn), true);
  dv.setUint32(withOne.length - 4, Number((bitLen >> 32n) & 0xffffffffn), true);

  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const rotl = (x, c) => (x << c) | (x >>> (32 - c));

  for (let chunk = 0; chunk < withOne.length; chunk += 64) {
    const M = [];
    for (let j = 0; j < 16; j++) M.push(dv.getUint32(chunk + j * 4, true));
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const outDv = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => outDv.setUint32(i * 4, v, true));
  return out;
}

module('MD5', 'MD5 hash (128-bit). Broken for collision resistance - use SHA-2/3 for anything security-sensitive.', [],
  (data) => [...md5(data)].map(b => b.toString(16).padStart(2, '0')).join(''));
export { md5 };
