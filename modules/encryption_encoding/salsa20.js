import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function rotl(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }

function doubleround(x) {
  x[4] ^= rotl((x[0] + x[12]) >>> 0, 7); x[8] ^= rotl((x[4] + x[0]) >>> 0, 9); x[12] ^= rotl((x[8] + x[4]) >>> 0, 13); x[0] ^= rotl((x[12] + x[8]) >>> 0, 18);
  x[9] ^= rotl((x[5] + x[1]) >>> 0, 7); x[13] ^= rotl((x[9] + x[5]) >>> 0, 9); x[1] ^= rotl((x[13] + x[9]) >>> 0, 13); x[5] ^= rotl((x[1] + x[13]) >>> 0, 18);
  x[14] ^= rotl((x[10] + x[6]) >>> 0, 7); x[2] ^= rotl((x[14] + x[10]) >>> 0, 9); x[6] ^= rotl((x[2] + x[14]) >>> 0, 13); x[10] ^= rotl((x[6] + x[2]) >>> 0, 18);
  x[3] ^= rotl((x[15] + x[11]) >>> 0, 7); x[7] ^= rotl((x[3] + x[15]) >>> 0, 9); x[11] ^= rotl((x[7] + x[3]) >>> 0, 13); x[15] ^= rotl((x[11] + x[7]) >>> 0, 18);
  x[1] ^= rotl((x[0] + x[3]) >>> 0, 7); x[2] ^= rotl((x[1] + x[0]) >>> 0, 9); x[3] ^= rotl((x[2] + x[1]) >>> 0, 13); x[0] ^= rotl((x[3] + x[2]) >>> 0, 18);
  x[6] ^= rotl((x[5] + x[4]) >>> 0, 7); x[7] ^= rotl((x[6] + x[5]) >>> 0, 9); x[4] ^= rotl((x[7] + x[6]) >>> 0, 13); x[5] ^= rotl((x[4] + x[7]) >>> 0, 18);
  x[11] ^= rotl((x[10] + x[9]) >>> 0, 7); x[8] ^= rotl((x[11] + x[10]) >>> 0, 9); x[9] ^= rotl((x[8] + x[11]) >>> 0, 13); x[10] ^= rotl((x[9] + x[8]) >>> 0, 18);
  x[12] ^= rotl((x[15] + x[14]) >>> 0, 7); x[13] ^= rotl((x[12] + x[15]) >>> 0, 9); x[14] ^= rotl((x[13] + x[12]) >>> 0, 13); x[15] ^= rotl((x[14] + x[13]) >>> 0, 18);
}

function le32(b, off) { return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0; }
function putLe32(out, off, v) { out[off] = v & 255; out[off + 1] = (v >>> 8) & 255; out[off + 2] = (v >>> 16) & 255; out[off + 3] = (v >>> 24) & 255; }

const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]; // "expand 32-byte k"
const TAU = [0x61707865, 0x3120646e, 0x79622d36, 0x6b206574]; // "expand 16-byte k"

function salsaBlock(key, nonce, ctrLo, ctrHi) {
  const k = key.length === 32 ? key : key; // (both lengths handled via const selection below)
  const c = key.length === 32 ? SIGMA : TAU;
  const k0 = [le32(key, 0), le32(key, 4), le32(key, 8), le32(key, 12)];
  const k1 = key.length === 32 ? [le32(key, 16), le32(key, 20), le32(key, 24), le32(key, 28)] : k0;
  const input = new Uint32Array(16);
  input[0] = c[0];
  input[1] = k0[0]; input[2] = k0[1]; input[3] = k0[2]; input[4] = k0[3];
  input[5] = c[1];
  input[6] = le32(nonce, 0); input[7] = le32(nonce, 4);
  input[8] = ctrLo >>> 0; input[9] = ctrHi >>> 0;
  input[10] = c[2];
  input[11] = k1[0]; input[12] = k1[1]; input[13] = k1[2]; input[14] = k1[3];
  input[15] = c[3];
  const x = Uint32Array.from(input);
  for (let i = 0; i < 10; i++) doubleround(x);
  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) putLe32(out, i * 4, (x[i] + input[i]) >>> 0);
  return out;
}

export function salsa20Encrypt(key, nonce, data) {
  if (key.length !== 16 && key.length !== 32) throw new Error(`Salsa20 key must be 16 or 32 bytes (got ${key.length})`);
  if (nonce.length !== 8) throw new Error(`Nonce must be 8 bytes (got ${nonce.length})`);
  const out = new Uint8Array(data.length);
  let ctrLo = 0, ctrHi = 0, off = 0;
  while (off < data.length) {
    const block = salsaBlock(key, nonce, ctrLo, ctrHi);
    const n = Math.min(64, data.length - off);
    for (let i = 0; i < n; i++) out[off + i] = data[off + i] ^ block[i];
    off += n;
    ctrLo = (ctrLo + 1) >>> 0;
    if (ctrLo === 0) ctrHi = (ctrHi + 1) >>> 0;
  }
  return out;
}

module('Salsa20', 'Salsa20 stream cipher (encrypt = decrypt). 16 or 32-byte key; 8-byte nonce.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex')],
  (data, key, nonce) => salsa20Encrypt(key, nonce, data));
