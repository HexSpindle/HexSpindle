import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

function salsa20_8(input) {
  const x = input.slice();
  const rotl = (a, b) => (a << b) | (a >>> (32 - b));
  for (let round = 0; round < 8; round += 2) {
    x[4] ^= rotl((x[0] + x[12]) | 0, 7);
    x[8] ^= rotl((x[4] + x[0]) | 0, 9);
    x[12] ^= rotl((x[8] + x[4]) | 0, 13);
    x[0] ^= rotl((x[12] + x[8]) | 0, 18);
    x[9] ^= rotl((x[5] + x[1]) | 0, 7);
    x[13] ^= rotl((x[9] + x[5]) | 0, 9);
    x[1] ^= rotl((x[13] + x[9]) | 0, 13);
    x[5] ^= rotl((x[1] + x[13]) | 0, 18);
    x[14] ^= rotl((x[10] + x[6]) | 0, 7);
    x[2] ^= rotl((x[14] + x[10]) | 0, 9);
    x[6] ^= rotl((x[2] + x[14]) | 0, 13);
    x[10] ^= rotl((x[6] + x[2]) | 0, 18);
    x[3] ^= rotl((x[15] + x[11]) | 0, 7);
    x[7] ^= rotl((x[3] + x[15]) | 0, 9);
    x[11] ^= rotl((x[7] + x[3]) | 0, 13);
    x[15] ^= rotl((x[11] + x[7]) | 0, 18);
    x[1] ^= rotl((x[0] + x[3]) | 0, 7);
    x[2] ^= rotl((x[1] + x[0]) | 0, 9);
    x[3] ^= rotl((x[2] + x[1]) | 0, 13);
    x[0] ^= rotl((x[3] + x[2]) | 0, 18);
    x[6] ^= rotl((x[5] + x[4]) | 0, 7);
    x[7] ^= rotl((x[6] + x[5]) | 0, 9);
    x[4] ^= rotl((x[7] + x[6]) | 0, 13);
    x[5] ^= rotl((x[4] + x[7]) | 0, 18);
    x[11] ^= rotl((x[10] + x[9]) | 0, 7);
    x[8] ^= rotl((x[11] + x[10]) | 0, 9);
    x[9] ^= rotl((x[8] + x[11]) | 0, 13);
    x[10] ^= rotl((x[9] + x[8]) | 0, 18);
    x[12] ^= rotl((x[15] + x[14]) | 0, 7);
    x[13] ^= rotl((x[12] + x[15]) | 0, 9);
    x[14] ^= rotl((x[13] + x[12]) | 0, 13);
    x[15] ^= rotl((x[14] + x[13]) | 0, 18);
  }
  const out = new Uint32Array(16);
  for (let i = 0; i < 16; i++) out[i] = (x[i] + input[i]) | 0;
  return out;
}

function bytesToWords(bytes, off) {
  const w = new Uint32Array(16);
  const dv = new DataView(bytes.buffer, bytes.byteOffset + off, 64);
  for (let i = 0; i < 16; i++) w[i] = dv.getUint32(i * 4, true);
  return w;
}
function wordsToBytes(words, out, off) {
  const dv = new DataView(out.buffer, out.byteOffset + off, 64);
  for (let i = 0; i < 16; i++) dv.setUint32(i * 4, words[i], true);
}

function blockMix(B, r) {
  const out = new Uint8Array(B.length);
  let X = bytesToWords(B, (2 * r - 1) * 64);
  const Y = [];
  for (let i = 0; i < 2 * r; i++) {
    const Bi = bytesToWords(B, i * 64);
    const xored = new Uint32Array(16);
    for (let j = 0; j < 16; j++) xored[j] = X[j] ^ Bi[j];
    X = salsa20_8(xored);
    Y.push(X);
  }
  let outIdx = 0;
  for (let i = 0; i < 2 * r; i += 2) wordsToBytes(Y[i], out, (outIdx++) * 64);
  for (let i = 1; i < 2 * r; i += 2) wordsToBytes(Y[i], out, (outIdx++) * 64);
  return out;
}

function romix(B, N, r) {
  const blockLen = 128 * r;
  let X = B.slice();
  const V = new Uint8Array(blockLen * N);
  for (let i = 0; i < N; i++) {
    V.set(X, i * blockLen);
    X = blockMix(X, r);
  }
  for (let i = 0; i < N; i++) {
    const dv = new DataView(X.buffer, X.byteOffset + blockLen - 64, 4);
    const j = dv.getUint32(0, true) % N;
    const Vj = V.subarray(j * blockLen, (j + 1) * blockLen);
    const xored = new Uint8Array(blockLen);
    for (let k = 0; k < blockLen; k++) xored[k] = X[k] ^ Vj[k];
    X = blockMix(xored, r);
  }
  return X;
}

async function pbkdf2(password, salt, iterations, dkLen) {
  const key = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, dkLen * 8);
  return new Uint8Array(bits);
}

async function scrypt(password, salt, N, r, p, dkLen) {
  const blockLen = 128 * r;
  const B = await pbkdf2(password, salt, 1, p * blockLen);
  const Bout = new Uint8Array(B.length);
  for (let i = 0; i < p; i++) {
    const block = B.subarray(i * blockLen, (i + 1) * blockLen);
    Bout.set(romix(block, N, r), i * blockLen);
  }
  return pbkdf2(password, Bout, 1, dkLen);
}

module('scrypt', 'scrypt password-based key derivation; outputs hex.',
  [A.toggle('Salt', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'UTF8'), A.number('Cost (N)', 16384, 2),
   A.number('Block size (r)', 8, 1), A.number('Parallelization (p)', 1, 1), A.number('Key length', 64, 1)],
  async (data, salt, n, r, p, length) => bytesToHex(await scrypt(data, salt, n, r, p, length)));
