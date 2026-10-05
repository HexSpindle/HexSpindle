const NROUNDS = 31;

const SBOX = [0xc, 0x5, 0x6, 0xb, 0x9, 0x0, 0xa, 0xd, 0x3, 0xe, 0xf, 0x8, 0x4, 0x7, 0x1, 0x2];
const SBOX_INV = [0x5, 0xe, 0xf, 0x8, 0xc, 0x1, 0x2, 0xd, 0xb, 0x4, 0x6, 0x3, 0x0, 0x7, 0x9, 0xa];

const PBOX = [];
for (let i = 0; i < 64; i++) {
  if (i === 63) PBOX.push(63);
  else PBOX.push((i * 16) % 63);
}
const PBOX_INV = new Array(64);
for (let i = 0; i < 64; i++) PBOX_INV[PBOX[i]] = i;

function bytesToBigInt(bytes) {
  let r = 0n;
  for (let i = 0; i < bytes.length; i++) r = (r << 8n) | BigInt(bytes[i]);
  return r;
}
function bigIntToBytes(v, len) {
  const out = new Uint8Array(len);
  for (let i = len - 1; i >= 0; i--) { out[i] = Number(v & 0xffn); v >>= 8n; }
  return out;
}

function sBoxLayer(state, sbox) {
  let result = 0n;
  for (let i = 0; i < 16; i++) {
    const nibble = Number((state >> BigInt(i * 4)) & 0xfn);
    result |= BigInt(sbox[nibble]) << BigInt(i * 4);
  }
  return result;
}
function pLayer(state, pbox) {
  let result = 0n;
  for (let i = 0; i < 64; i++) if ((state >> BigInt(i)) & 1n) result |= 1n << BigInt(pbox[i]);
  return result;
}

function roundKeys80(key) {
  let reg = bytesToBigInt(key);
  const out = [];
  for (let i = 1; i <= NROUNDS + 1; i++) {
    out.push(reg >> 16n);
    reg = ((reg << 61n) | (reg >> 19n)) & ((1n << 80n) - 1n);
    const leftNibble = Number(reg >> 76n);
    reg = (reg & ((1n << 76n) - 1n)) | (BigInt(SBOX[leftNibble]) << 76n);
    reg ^= BigInt(i) << 15n;
  }
  return out;
}
function roundKeys128(key) {
  let reg = bytesToBigInt(key);
  const out = [];
  for (let i = 1; i <= NROUNDS + 1; i++) {
    out.push(reg >> 64n);
    reg = ((reg << 61n) | (reg >> 67n)) & ((1n << 128n) - 1n);
    const leftByte = Number((reg >> 120n) & 0xffn);
    const n1 = (leftByte >> 4) & 0xf, n2 = leftByte & 0xf;
    reg = (reg & ((1n << 120n) - 1n)) | (BigInt((SBOX[n1] << 4) | SBOX[n2]) << 120n);
    reg ^= BigInt(i) << 62n;
  }
  return out;
}

export function presentKeySchedule(key) {
  if (key.length !== 10 && key.length !== 16) throw new Error(`PRESENT key must be 10 or 16 bytes (got ${key.length})`);
  return key.length === 10 ? roundKeys80(key) : roundKeys128(key);
}

export function presentEncryptBlock(block, roundKeys) {
  let state = bytesToBigInt(block);
  for (let i = 0; i < NROUNDS; i++) {
    state ^= roundKeys[i];
    state = sBoxLayer(state, SBOX);
    state = pLayer(state, PBOX);
  }
  state ^= roundKeys[NROUNDS];
  return bigIntToBytes(state, 8);
}

export function presentDecryptBlock(block, roundKeys) {
  let state = bytesToBigInt(block);
  state ^= roundKeys[NROUNDS];
  for (let i = NROUNDS - 1; i >= 0; i--) {
    state = pLayer(state, PBOX_INV);
    state = sBoxLayer(state, SBOX_INV);
    state ^= roundKeys[i];
  }
  return bigIntToBytes(state, 8);
}

export const PRESENT = { blockSize: 8, keySchedule: presentKeySchedule, encryptBlock: (ks, b) => presentEncryptBlock(b, ks), decryptBlock: (ks, b) => presentDecryptBlock(b, ks) };
