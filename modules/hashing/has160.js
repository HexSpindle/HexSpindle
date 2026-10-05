import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

const ROT1 = [5, 11, 7, 15, 6, 13, 8, 14, 7, 12, 9, 11, 8, 15, 6, 12, 9, 14, 5, 13];
const ROT2 = [10, 17, 25, 30];
const K = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc];
const IND = [
  18, 0, 1, 2, 3, 19, 4, 5, 6, 7, 16, 8, 9, 10, 11, 17, 12, 13, 14, 15,
  22, 3, 6, 9, 12, 23, 15, 2, 5, 8, 20, 11, 14, 1, 4, 21, 7, 10, 13, 0,
  26, 12, 5, 14, 7, 27, 0, 9, 2, 11, 24, 4, 13, 6, 15, 25, 8, 1, 10, 3,
  30, 7, 2, 13, 8, 31, 3, 14, 9, 4, 28, 15, 10, 5, 0, 29, 11, 6, 1, 12,
];
function rotl(x, n) { return ((x << n) | (x >>> (32 - n))) | 0; }

export function has160(data, rounds = 80) {
  const msgLen = data.length;
  const padded = new Uint8Array((((msgLen + 9 + 63) & ~63)));
  padded.set(data);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Number(bitLen & 0xffffffffn), true);
  dv.setUint32(padded.length - 4, Number((bitLen >> 32n) & 0xffffffffn), true);

  let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const W = new Int32Array(32);
  for (let off = 0; off < padded.length; off += 64) {
    for (let j = 0; j < 16; j++) W[j] = dv.getInt32(off + j * 4, true);
    W[16] = W[0] ^ W[1] ^ W[2] ^ W[3];
    W[17] = W[4] ^ W[5] ^ W[6] ^ W[7];
    W[18] = W[8] ^ W[9] ^ W[10] ^ W[11];
    W[19] = W[12] ^ W[13] ^ W[14] ^ W[15];
    W[20] = W[3] ^ W[6] ^ W[9] ^ W[12];
    W[21] = W[2] ^ W[5] ^ W[8] ^ W[15];
    W[22] = W[1] ^ W[4] ^ W[11] ^ W[14];
    W[23] = W[0] ^ W[7] ^ W[10] ^ W[13];
    W[24] = W[5] ^ W[7] ^ W[12] ^ W[14];
    W[25] = W[0] ^ W[2] ^ W[9] ^ W[11];
    W[26] = W[4] ^ W[6] ^ W[13] ^ W[15];
    W[27] = W[1] ^ W[3] ^ W[8] ^ W[10];
    W[28] = W[2] ^ W[7] ^ W[8] ^ W[13];
    W[29] = W[3] ^ W[4] ^ W[9] ^ W[14];
    W[30] = W[0] ^ W[5] ^ W[10] ^ W[15];
    W[31] = W[1] ^ W[6] ^ W[11] ^ W[12];

    let [a, b, c, d, e] = h;
    for (let i = 0; i < rounds; i++) {
      let t = (rotl(a, ROT1[i % 20]) + e + W[IND[i]] + K[(i / 20) | 0]) | 0;
      if (i < 20) t = (t + ((b & c) | (~b & d))) | 0;
      else if (i < 40) t = (t + (b ^ c ^ d)) | 0;
      else if (i < 60) t = (t + (c ^ (b | ~d))) | 0;
      else t = (t + (b ^ c ^ d)) | 0;
      e = d; d = c; c = rotl(b, ROT2[(i / 20) | 0]); b = a; a = t;
    }
    h = [(h[0] + a) | 0, (h[1] + b) | 0, (h[2] + c) | 0, (h[3] + d) | 0, (h[4] + e) | 0];
  }

  const out = new Uint8Array(20);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 5; i++) odv.setUint32(i * 4, h[i] >>> 0, true);
  return out;
}

module('HAS-160', 'HAS-160 (TTAS.KO-12.0011): a 160-bit Korean national-standard hash used with the KCDSA signature algorithm; structurally related to SHA-1.',
  [A.number('Rounds', 80, 1, 80)],
  (data, rounds) => bytesToHex(has160(data, Math.floor(rounds))));
