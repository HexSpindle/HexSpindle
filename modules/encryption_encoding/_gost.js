import { KUZ_SBOX, KUZ_SBOX_INV, KUZ_LCOEFF, MAGMA_SBOX } from './_gost_tables.js';

function xorBytes(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}


function gfMul(a, b) {
  let r = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) r ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0xc3;
    b >>= 1;
  }
  return r;
}

function kuzR(data) {
  const result = new Uint8Array(16);
  for (let i = 0; i < 16; i++) result[i] = data[(i - 1 + 16) % 16];
  let a0 = 0;
  for (let i = 0; i < 16; i++) a0 ^= gfMul(result[i], KUZ_LCOEFF[i]);
  result[0] = a0;
  return result;
}

function kuzRReverse(data) {
  const result = new Uint8Array(16);
  let a15 = 0;
  for (let i = 15; i >= 0; i--) {
    result[(i - 1 + 16) % 16] = data[i];
    a15 ^= gfMul(data[i], KUZ_LCOEFF[i]);
  }
  result[15] = a15;
  return result;
}

function kuzL(data) {
  for (let i = 0; i < 16; i++) data = kuzR(data);
  return data;
}

function kuzLReverse(data) {
  for (let i = 0; i < 16; i++) data = kuzRReverse(data);
  return data;
}

function kuzS(data) {
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = KUZ_SBOX[data[i]];
  return out;
}

function kuzSReverse(data) {
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = KUZ_SBOX_INV[data[i]];
  return out;
}

function kuzRoundConstants() {
  const c = [];
  for (let i = 1; i <= 32; i++) {
    const block = new Uint8Array(16);
    block[15] = i;
    c.push(kuzL(block));
  }
  return c;
}

function kuzExpandKey(key) {
  const c = kuzRoundConstants();
  let key1 = key.slice(0, 16), key2 = key.slice(16, 32);
  const iterKey = [key1, key2];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 8; j++) {
      let internal = xorBytes(key1, c[i * 8 + j]);
      internal = kuzS(internal);
      internal = kuzL(internal);
      const newKey1 = xorBytes(internal, key2);
      key2 = key1;
      key1 = newKey1;
    }
    iterKey.push(key1, key2);
  }
  return iterKey; // 10 round keys, 16 bytes each
}

export function kuzEncryptBlock(iterKey, block) {
  for (let i = 0; i < 9; i++) {
    block = xorBytes(iterKey[i], block);
    block = kuzS(block);
    block = kuzL(block);
  }
  return xorBytes(iterKey[9], block);
}

export function kuzDecryptBlock(iterKey, block) {
  block = xorBytes(iterKey[9], block);
  for (let i = 8; i >= 0; i--) {
    block = kuzLReverse(block);
    block = kuzSReverse(block);
    block = xorBytes(iterKey[i], block);
  }
  return block;
}

export function makeKuznechik(key) {
  if (key.length !== 32) throw new Error(`Kuznechik key must be 32 bytes (got ${key.length})`);
  const iterKey = kuzExpandKey(key);
  return {
    blockSize: 16,
    encryptBlock: (b) => kuzEncryptBlock(iterKey, b),
    decryptBlock: (b) => kuzDecryptBlock(iterKey, b),
  };
}


function magmaT(data) {
  const result = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    let lo = data[i] & 0x0f;
    let hi = (data[i] & 0xf0) >> 4;
    lo = MAGMA_SBOX[(3 - i) * 2][lo];
    hi = MAGMA_SBOX[(3 - i) * 2 + 1][hi];
    result[i] = (hi << 4) | lo;
  }
  return result;
}

function magmaAdd32(a, b) {
  const result = new Uint8Array(4);
  let carry = 0;
  for (let i = 3; i >= 0; i--) {
    const sum = a[i] + b[i] + carry;
    result[i] = sum & 0xff;
    carry = sum >> 8;
  }
  return result;
}

function magmaG(k, a) {
  let internal = magmaAdd32(k, a);
  internal = magmaT(internal);
  let v = ((internal[0] << 24) | (internal[1] << 16) | (internal[2] << 8) | internal[3]) >>> 0;
  v = ((v << 11) | (v >>> 21)) >>> 0;
  return new Uint8Array([(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]);
}

function magmaGIter(k, a) {
  const a1 = a.slice(0, 4), a0 = a.slice(4, 8);
  const g = xorBytes(a1, magmaG(k, a0));
  return [a0, a1, g];
}

function magmaGPrev(k, a) {
  const [a0, , g] = magmaGIter(k, a);
  const out = new Uint8Array(8);
  out.set(a0, 0);
  out.set(g, 4);
  return out;
}

function magmaGFin(k, a) {
  const [a0, , g] = magmaGIter(k, a);
  const out = new Uint8Array(8);
  out.set(g, 0);
  out.set(a0, 4);
  return out;
}

function magmaExpandKey(key) {
  const k = [];
  for (let j = 0; j < 8; j++) k.push(key.slice(j * 4, j * 4 + 4));
  const iterKey = [...k, ...k, ...k, ...[...k].reverse()];
  return iterKey; // 32 x 4-byte round keys
}

export function magmaEncryptBlock(iterKey, block) {
  let result = magmaGPrev(iterKey[0], block);
  for (let i = 1; i < 31; i++) result = magmaGPrev(iterKey[i], result);
  return magmaGFin(iterKey[31], result);
}

export function magmaDecryptBlock(iterKey, block) {
  let result = magmaGPrev(iterKey[31], block);
  for (let i = 30; i > 0; i--) result = magmaGPrev(iterKey[i], result);
  return magmaGFin(iterKey[0], result);
}

export function makeMagma(key) {
  if (key.length !== 32) throw new Error(`Magma key must be 32 bytes (got ${key.length})`);
  const iterKey = magmaExpandKey(key);
  return {
    blockSize: 8,
    encryptBlock: (b) => magmaEncryptBlock(iterKey, b),
    decryptBlock: (b) => magmaDecryptBlock(iterKey, b),
  };
}

function numBlocks(data, blockSize) { return Math.floor(data.length / blockSize); }

function padZero(data, blockSize) {
  const pad = data.length < blockSize ? blockSize - data.length
    : (data.length % blockSize === 0 ? 0 : blockSize - (data.length % blockSize));
  if (pad === 0) return data;
  const out = new Uint8Array(data.length + pad);
  out.set(data, 0);
  return out;
}

export function ecbEncrypt(cipher, data) {
  data = padZero(data, cipher.blockSize);
  const out = new Uint8Array(data.length);
  const n = numBlocks(data, cipher.blockSize);
  for (let i = 0; i < n; i++) out.set(cipher.encryptBlock(data.subarray(i * cipher.blockSize, (i + 1) * cipher.blockSize)), i * cipher.blockSize);
  return out;
}

export function ecbDecrypt(cipher, data) {
  const n = numBlocks(data, cipher.blockSize);
  const out = new Uint8Array(n * cipher.blockSize);
  for (let i = 0; i < n; i++) out.set(cipher.decryptBlock(data.subarray(i * cipher.blockSize, (i + 1) * cipher.blockSize)), i * cipher.blockSize);
  return out;
}

function checkIv(iv, blockSize) {
  if (!iv || iv.length === 0 || iv.length % blockSize !== 0) {
    throw new Error('Invalid initialization vector value');
  }
}

export function cbcEncrypt(cipher, data, iv) {
  checkIv(iv, cipher.blockSize);
  data = padZero(data, cipher.blockSize);
  const reg = iv.slice();
  const out = new Uint8Array(data.length);
  const n = numBlocks(data, cipher.blockSize);
  const bs = cipher.blockSize;
  for (let i = 0; i < n; i++) {
    const block = data.subarray(i * bs, (i + 1) * bs);
    const cipherBlock = cipher.encryptBlock(xorBytes(reg.subarray(0, bs), block));
    out.set(cipherBlock, i * bs);
    reg.set(reg.subarray(bs), 0);
    reg.set(cipherBlock, reg.length - bs);
  }
  return out;
}

export function cbcDecrypt(cipher, data, iv) {
  checkIv(iv, cipher.blockSize);
  const reg = iv.slice();
  const bs = cipher.blockSize;
  const n = numBlocks(data, bs);
  const out = new Uint8Array(n * bs);
  for (let i = 0; i < n; i++) {
    const block = data.subarray(i * bs, (i + 1) * bs);
    const plain = xorBytes(reg.subarray(0, bs), cipher.decryptBlock(block));
    out.set(plain, i * bs);
    reg.set(reg.subarray(bs), 0);
    reg.set(block, reg.length - bs);
  }
  return out;
}

function feedbackGamma(cipher, reg) {
  return cipher.encryptBlock(reg.subarray(0, cipher.blockSize));
}

function feedbackShift(reg, blockSize, newTail) {
  reg.set(reg.subarray(blockSize), 0);
  reg.set(newTail, reg.length - blockSize);
}

export function cfbEncrypt(cipher, data, iv) {
  checkIv(iv, cipher.blockSize);
  const bs = cipher.blockSize;
  const reg = iv.slice();
  const out = new Uint8Array(data.length);
  const n = numBlocks(data, bs);
  for (let i = 0; i < n; i++) {
    const gamma = feedbackGamma(cipher, reg);
    const block = data.subarray(i * bs, (i + 1) * bs);
    const cipherBlock = xorBytes(gamma, block);
    out.set(cipherBlock, i * bs);
    feedbackShift(reg, bs, cipherBlock);
  }
  if (data.length % bs !== 0) {
    const gamma = feedbackGamma(cipher, reg);
    const tail = data.subarray(n * bs);
    for (let i = 0; i < tail.length; i++) out[n * bs + i] = tail[i] ^ gamma[i];
  }
  return out;
}

export function cfbDecrypt(cipher, data, iv) {
  checkIv(iv, cipher.blockSize);
  const bs = cipher.blockSize;
  const reg = iv.slice();
  const out = new Uint8Array(data.length);
  const n = numBlocks(data, bs);
  for (let i = 0; i < n; i++) {
    const gamma = feedbackGamma(cipher, reg);
    const block = data.subarray(i * bs, (i + 1) * bs);
    out.set(xorBytes(gamma, block), i * bs);
    feedbackShift(reg, bs, block);
  }
  if (data.length % bs !== 0) {
    const gamma = feedbackGamma(cipher, reg);
    const tail = data.subarray(n * bs);
    for (let i = 0; i < tail.length; i++) out[n * bs + i] = tail[i] ^ gamma[i];
  }
  return out;
}

function ofbRun(cipher, data, iv) {
  checkIv(iv, cipher.blockSize);
  const bs = cipher.blockSize;
  const reg = iv.slice();
  const out = new Uint8Array(data.length);
  const n = numBlocks(data, bs);
  for (let i = 0; i < n; i++) {
    const gamma = feedbackGamma(cipher, reg);
    const block = data.subarray(i * bs, (i + 1) * bs);
    out.set(xorBytes(gamma, block), i * bs);
    feedbackShift(reg, bs, gamma);
  }
  if (data.length % bs !== 0) {
    const gamma = feedbackGamma(cipher, reg);
    const tail = data.subarray(n * bs);
    for (let i = 0; i < tail.length; i++) out[n * bs + i] = tail[i] ^ gamma[i];
  }
  return out;
}
export const ofbEncrypt = ofbRun;
export const ofbDecrypt = ofbRun;

function ctrIncrement(ctr) {
  let carry = 1;
  for (let i = ctr.length - 1; i >= 0 && carry; i--) {
    const sum = ctr[i] + carry;
    ctr[i] = sum & 0xff;
    carry = sum >> 8;
  }
  return ctr;
}

function ctrRun(cipher, data, iv) {
  const bs = cipher.blockSize;
  if (!iv || iv.length !== bs / 2) throw new Error('Invalid initialization vector value');
  let counter = new Uint8Array(bs);
  counter.set(iv, 0);
  const out = new Uint8Array(data.length);
  const n = numBlocks(data, bs);
  for (let i = 0; i < n; i++) {
    const gamma = cipher.encryptBlock(counter);
    counter = ctrIncrement(counter);
    const block = data.subarray(i * bs, (i + 1) * bs);
    out.set(xorBytes(block, gamma), i * bs);
  }
  if (data.length % bs !== 0) {
    const gamma = cipher.encryptBlock(counter);
    const tail = data.subarray(n * bs);
    for (let i = 0; i < tail.length; i++) out[n * bs + i] = tail[i] ^ gamma[i];
  }
  return out;
}
export const ctrEncrypt = ctrRun;
export const ctrDecrypt = ctrRun;

export function runMode(cipher, mode, encrypt, data, iv) {
  switch (mode) {
    case 'ECB': return encrypt ? ecbEncrypt(cipher, data) : ecbDecrypt(cipher, data);
    case 'CBC': return encrypt ? cbcEncrypt(cipher, data, iv) : cbcDecrypt(cipher, data, iv);
    case 'CFB': return encrypt ? cfbEncrypt(cipher, data, iv) : cfbDecrypt(cipher, data, iv);
    case 'OFB': return encrypt ? ofbEncrypt(cipher, data, iv) : ofbDecrypt(cipher, data, iv);
    case 'CTR': return encrypt ? ctrEncrypt(cipher, data, iv) : ctrDecrypt(cipher, data, iv);
    default: throw new Error(`Unsupported mode: ${mode}`);
  }
}
