const W = 32;
const MASK = 0xffffffff;
const LGW = 5; // log2(32)
const P32 = 0xb7e15163;
const Q32 = 0x9e3779b9;

function rotl(x, n) { n &= 31; return n === 0 ? x >>> 0 : (((x << n) | (x >>> (32 - n))) >>> 0); }
function rotr(x, n) { n &= 31; return n === 0 ? x >>> 0 : (((x >>> n) | (x << (32 - n))) >>> 0); }
function fFunc(x) { return Number((BigInt(x) * BigInt((2 * x + 1) >>> 0)) & 0xffffffffn) >>> 0; }

function bytesToWordsLE(bytes) {
  const n = Math.ceil(bytes.length / 4);
  const words = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let w = 0;
    for (let j = 0; j < 4; j++) { const idx = i * 4 + j; if (idx < bytes.length) w |= bytes[idx] << (j * 8); }
    words[i] = w >>> 0;
  }
  return words;
}

export function rc6KeySchedule(key, rounds = 20) {
  const b = key.length;
  const c = Math.max(Math.ceil(b / 4), 1);
  const padded = new Uint8Array(c * 4);
  padded.set(key);
  const L = bytesToWordsLE(padded);
  const t = 2 * rounds + 4;
  const S = new Array(t);
  S[0] = P32 >>> 0;
  for (let i = 1; i < t; i++) S[i] = (S[i - 1] + Q32) >>> 0;
  let A = 0, B = 0, i = 0, j = 0;
  const v = 3 * Math.max(c, t);
  for (let s = 0; s < v; s++) {
    A = S[i] = rotl((S[i] + A + B) >>> 0, 3);
    B = L[j] = rotl((L[j] + A + B) >>> 0, (A + B) & 31);
    i = (i + 1) % t;
    j = (j + 1) % c;
  }
  return { S, rounds };
}

function blockToWords(block) {
  const dv = new DataView(block.buffer, block.byteOffset, block.byteLength);
  return [dv.getUint32(0, true), dv.getUint32(4, true), dv.getUint32(8, true), dv.getUint32(12, true)];
}
function wordsToBlock(a, b, c, d) {
  const out = new Uint8Array(16);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, a >>> 0, true); dv.setUint32(4, b >>> 0, true); dv.setUint32(8, c >>> 0, true); dv.setUint32(12, d >>> 0, true);
  return out;
}

export function rc6EncryptBlock(block, ks) {
  const { S, rounds } = ks;
  let [A, B, C, D] = blockToWords(block);
  B = (B + S[0]) >>> 0;
  D = (D + S[1]) >>> 0;
  for (let i = 1; i <= rounds; i++) {
    const t = rotl(fFunc(B), LGW);
    const u = rotl(fFunc(D), LGW);
    A = (rotl(A ^ t, u & 31) + S[2 * i]) >>> 0;
    C = (rotl(C ^ u, t & 31) + S[2 * i + 1]) >>> 0;
    const tmp = A; A = B; B = C; C = D; D = tmp;
  }
  A = (A + S[2 * rounds + 2]) >>> 0;
  C = (C + S[2 * rounds + 3]) >>> 0;
  return wordsToBlock(A, B, C, D);
}

export function rc6DecryptBlock(block, ks) {
  const { S, rounds } = ks;
  let [A, B, C, D] = blockToWords(block);
  C = (C - S[2 * rounds + 3]) >>> 0;
  A = (A - S[2 * rounds + 2]) >>> 0;
  for (let i = rounds; i >= 1; i--) {
    const tmp = D; D = C; C = B; B = A; A = tmp;
    const u = rotl(fFunc(D), LGW);
    const t = rotl(fFunc(B), LGW);
    C = rotr((C - S[2 * i + 1]) >>> 0, t & 31) ^ u;
    A = rotr((A - S[2 * i]) >>> 0, u & 31) ^ t;
  }
  D = (D - S[1]) >>> 0;
  B = (B - S[0]) >>> 0;
  return wordsToBlock(A, B, C, D);
}

export const RC6 = (rounds) => ({
  blockSize: 16,
  keySchedule: (key) => rc6KeySchedule(key, rounds),
  encryptBlock: (ks, b) => rc6EncryptBlock(b, ks),
  decryptBlock: (ks, b) => rc6DecryptBlock(b, ks),
});
