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

function salsaState(key, n6, n7, n8, n9) {
  const input = new Uint32Array(16);
  input[0] = SIGMA[0];
  input[1] = le32(key, 0); input[2] = le32(key, 4); input[3] = le32(key, 8); input[4] = le32(key, 12);
  input[5] = SIGMA[1];
  input[6] = n6; input[7] = n7; input[8] = n8; input[9] = n9;
  input[10] = SIGMA[2];
  input[11] = le32(key, 16); input[12] = le32(key, 20); input[13] = le32(key, 24); input[14] = le32(key, 28);
  input[15] = SIGMA[3];
  return input;
}

function permute20(input) {
  const x = Uint32Array.from(input);
  for (let i = 0; i < 10; i++) doubleround(x);
  return x;
}

function hsalsa20(key, nonce16) {
  const input = salsaState(key, le32(nonce16, 0), le32(nonce16, 4), le32(nonce16, 8), le32(nonce16, 12));
  const x = permute20(input);
  const out = new Uint8Array(32);
  putLe32(out, 0, x[0]); putLe32(out, 4, x[5]); putLe32(out, 8, x[10]); putLe32(out, 12, x[15]);
  putLe32(out, 16, x[6]); putLe32(out, 20, x[7]); putLe32(out, 24, x[8]); putLe32(out, 28, x[9]);
  return out;
}

function salsaBlock(key, nonce8, ctrLo, ctrHi) {
  const input = salsaState(key, le32(nonce8, 0), le32(nonce8, 4), ctrLo >>> 0, ctrHi >>> 0);
  const x = permute20(input);
  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) putLe32(out, i * 4, (x[i] + input[i]) >>> 0);
  return out;
}

export function xsalsa20Encrypt(key, nonce, data) {
  if (key.length !== 32) throw new Error(`XSalsa20 key must be 32 bytes (got ${key.length})`);
  if (nonce.length !== 24) throw new Error(`XSalsa20 nonce must be 24 bytes (got ${nonce.length})`);
  const subkey = hsalsa20(key, nonce.subarray(0, 16));
  const innerNonce = nonce.subarray(16, 24);
  const out = new Uint8Array(data.length);
  let ctrLo = 0, ctrHi = 0, off = 0;
  while (off < data.length) {
    const block = salsaBlock(subkey, innerNonce, ctrLo, ctrHi);
    const n = Math.min(64, data.length - off);
    for (let i = 0; i < n; i++) out[off + i] = data[off + i] ^ block[i];
    off += n;
    ctrLo = (ctrLo + 1) >>> 0;
    if (ctrLo === 0) ctrHi = (ctrHi + 1) >>> 0;
  }
  return out;
}

module('XSalsa20', 'XSalsa20 stream cipher (encrypt = decrypt): Salsa20 extended to a 24-byte nonce via HSalsa20 subkey derivation. 32-byte key.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex')],
  (data, key, nonce) => xsalsa20Encrypt(key, nonce, data));
