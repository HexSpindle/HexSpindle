import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { runHash } from './_hash_util.js';

function rotl(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }

const ZL = [
  0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
  7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,
  3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,
  1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,
  4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13,
];
const ZR = [
  5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,
  6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,
  15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,
  8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,
  12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11,
];
const SL = [
  11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,
  7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,
  11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,
  11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,
  9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6,
];
const SR = [
  8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,
  9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,
  9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,
  15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,
  8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11,
];
const KL = [0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
const KR = [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

const f1 = (x, y, z) => x ^ y ^ z;
const f2 = (x, y, z) => (x & y) | (~x & z);
const f3 = (x, y, z) => (x | ~y) ^ z;
const f4 = (x, y, z) => (x & z) | (y & ~z);
const f5 = (x, y, z) => x ^ (y | ~z);
const FL = [f1, f2, f3, f4, f5];
const FR = [f5, f4, f3, f2, f1];

function ripemd160(u8) {
  const msgLen = u8.length;
  const padded = new Uint8Array((msgLen + 9 + 63) & ~63);
  padded.set(u8);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Number(bitLen & 0xffffffffn), true);
  dv.setUint32(padded.length - 4, Number((bitLen >> 32n) & 0xffffffffn), true);

  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const X = [];
    for (let j = 0; j < 16; j++) X.push(dv.getUint32(chunk + j * 4, true));
    let A = h0, B = h1, C = h2, D = h3, E = h4;
    let Ap = h0, Bp = h1, Cp = h2, Dp = h3, Ep = h4;
    for (let j = 0; j < 80; j++) {
      const round = j >> 4;
      let T = (rotl((A + FL[round](B, C, D) + X[ZL[j]] + KL[round]) >>> 0, SL[j]) + E) >>> 0;
      A = E; E = D; D = rotl(C, 10); C = B; B = T;
      T = (rotl((Ap + FR[round](Bp, Cp, Dp) + X[ZR[j]] + KR[round]) >>> 0, SR[j]) + Ep) >>> 0;
      Ap = Ep; Ep = Dp; Dp = rotl(Cp, 10); Cp = Bp; Bp = T;
    }
    const T = (h1 + C + Dp) >>> 0;
    h1 = (h2 + D + Ep) >>> 0;
    h2 = (h3 + E + Ap) >>> 0;
    h3 = (h4 + A + Bp) >>> 0;
    h4 = (h0 + B + Cp) >>> 0;
    h0 = T;
  }
  const out = new Uint8Array(20);
  const outDv = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((v, i) => outDv.setUint32(i * 4, v, true));
  return out;
}

module('RIPEMD', 'RIPEMD (RACE Integrity Primitives Evaluation Message Digest) family: RIPEMD-128, -160, -256 and -320. RIPEMD-160 is native; the other sizes use crypto-api.',
  [A.select('Size', ['320', '256', '160', '128'])],
  async (data, size) => size === '160'
    ? [...ripemd160(data)].map(b => b.toString(16).padStart(2, '0')).join('')
    : runHash('ripemd' + size, data));
export { ripemd160 };
