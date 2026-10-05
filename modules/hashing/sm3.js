import { module } from './_cat.js';
import { bytesToHex } from '../../core/util.js';

const IV = [0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600, 0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e];
const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
const T = (j) => (j < 16 ? 0x79cc4519 : 0x7a879d8a);
function FF(j, x, y, z) { return j < 16 ? (x ^ y ^ z) : ((x & y) | (x & z) | (y & z)); }
function GG(j, x, y, z) { return j < 16 ? (x ^ y ^ z) : ((x & y) | (~x & z)); }
const P0 = (x) => (x ^ rotl(x, 9) ^ rotl(x, 17)) >>> 0;
const P1 = (x) => (x ^ rotl(x, 15) ^ rotl(x, 23)) >>> 0;

export function sm3(data) {
  const msgLen = data.length;
  const padded = new Uint8Array((msgLen + 9 + 63) & ~63);
  padded.set(data);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Number((bitLen >> 32n) & 0xffffffffn));
  dv.setUint32(padded.length - 4, Number(bitLen & 0xffffffffn));

  let V = IV.slice();
  for (let off = 0; off < padded.length; off += 64) {
    const W = new Array(68);
    for (let j = 0; j < 16; j++) W[j] = dv.getUint32(off + j * 4);
    for (let j = 16; j < 68; j++) {
      W[j] = (P1(W[j - 16] ^ W[j - 9] ^ rotl(W[j - 3], 15)) ^ rotl(W[j - 13], 7) ^ W[j - 6]) >>> 0;
    }
    const W1 = new Array(64);
    for (let j = 0; j < 64; j++) W1[j] = (W[j] ^ W[j + 4]) >>> 0;

    let [A, B, C, D, E, F, G, H] = V;
    for (let j = 0; j < 64; j++) {
      const ss1 = rotl((rotl(A, 12) + E + rotl(T(j), j % 32)) >>> 0, 7);
      const ss2 = (ss1 ^ rotl(A, 12)) >>> 0;
      const tt1 = (FF(j, A, B, C) + D + ss2 + W1[j]) >>> 0;
      const tt2 = (GG(j, E, F, G) + H + ss1 + W[j]) >>> 0;
      D = C; C = rotl(B, 9); B = A; A = tt1;
      H = G; G = rotl(F, 19); F = E; E = P0(tt2);
    }
    V = [A ^ V[0], B ^ V[1], C ^ V[2], D ^ V[3], E ^ V[4], F ^ V[5], G ^ V[6], H ^ V[7]].map(x => x >>> 0);
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) odv.setUint32(i * 4, V[i]);
  return out;
}

module('SM3', 'Chinese national standard SM3 hash (requires OpenSSL support).', [], (data) => bytesToHex(sm3(data)));
