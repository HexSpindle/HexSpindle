const MASK64 = 0xffffffffffffffffn;
const RATE = 16;
const PA = 12;
const PB = 8;
const VERSION = 1; // Ascon-AEAD128

function rotr64(x, n) {
  const nb = BigInt(n);
  return ((x >> nb) | ((x & ((1n << nb) - 1n)) << (64n - nb))) & MASK64;
}

function permutation(state, rounds) {
  for (let round = 12 - rounds; round < 12; round++) {
    state[2] ^= BigInt(0xf0 - round * 0x10 + round);
    state[0] ^= state[4]; state[4] ^= state[3]; state[2] ^= state[1];
    const t = new Array(5);
    for (let i = 0; i <= 4; i++) t[i] = (state[i] ^ MASK64) & state[(i + 1) % 5];
    for (let i = 0; i <= 4; i++) state[i] ^= t[(i + 1) % 5];
    state[1] ^= state[0]; state[0] ^= state[4]; state[3] ^= state[2]; state[2] ^= MASK64;
    state[0] ^= rotr64(state[0], 19) ^ rotr64(state[0], 28);
    state[1] ^= rotr64(state[1], 61) ^ rotr64(state[1], 39);
    state[2] ^= rotr64(state[2], 1) ^ rotr64(state[2], 6);
    state[3] ^= rotr64(state[3], 10) ^ rotr64(state[3], 17);
    state[4] ^= rotr64(state[4], 7) ^ rotr64(state[4], 41);
    for (let i = 0; i <= 4; i++) state[i] &= MASK64;
  }
}

function wordAt(bytes, offset) {
  let v = 0n;
  for (let i = 7; i >= 0; i--) {
    const idx = offset + i;
    v = (v << 8n) | BigInt(idx < bytes.length ? bytes[idx] : 0);
  }
  return v;
}
function wordToBytes(w) {
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) { out[i] = Number(w & 0xffn); w >>= 8n; }
  return out;
}
function concatBytes(...arrs) {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

function initialize(key, nonce) {
  const iv = wordAt(new Uint8Array([VERSION, 0, (PB << 4) + PA, 0x80, 0x00, RATE, 0, 0]), 0);
  const state = [iv, wordAt(key, 0), wordAt(key, 8), wordAt(nonce, 0), wordAt(nonce, 8)];
  permutation(state, PA);
  state[3] ^= wordAt(key, 0);
  state[4] ^= wordAt(key, 8);
  return state;
}

function processAssociatedData(state, ad) {
  if (ad.length) {
    const padLen = RATE - (ad.length % RATE) - 1;
    const message = concatBytes(ad, new Uint8Array([0x01]), new Uint8Array(padLen));
    for (let off = 0; off < message.length; off += RATE) {
      state[0] ^= wordAt(message, off);
      state[1] ^= wordAt(message, off + 8);
      permutation(state, PB);
    }
  }
  state[4] ^= 1n << 63n;
}

function processPlaintext(state, plaintext) {
  const lastLen = plaintext.length % RATE;
  const padLen = RATE - lastLen - 1;
  const message = concatBytes(plaintext, new Uint8Array([0x01]), new Uint8Array(padLen));
  const out = new Uint8Array(plaintext.length);
  let outOff = 0;
  for (let off = 0; off < message.length - RATE; off += RATE) {
    state[0] ^= wordAt(message, off);
    out.set(wordToBytes(state[0]), outOff); outOff += 8;
    state[1] ^= wordAt(message, off + 8);
    out.set(wordToBytes(state[1]), outOff); outOff += 8;
    permutation(state, PB);
  }
  const block = message.length - RATE;
  state[0] ^= wordAt(message, block);
  state[1] ^= wordAt(message, block + 8);
  const w0 = wordToBytes(state[0]), w1 = wordToBytes(state[1]);
  const tailLen = plaintext.length - outOff;
  out.set(w0.subarray(0, Math.min(8, tailLen)), outOff);
  if (tailLen > 8) out.set(w1.subarray(0, tailLen - 8), outOff + 8);
  return out;
}

function processCiphertext(state, ciphertext) {
  const lastLen = ciphertext.length % RATE;
  const message = concatBytes(ciphertext, new Uint8Array(RATE - lastLen));
  const out = new Uint8Array(ciphertext.length);
  let outOff = 0;
  for (let off = 0; off < message.length - RATE; off += RATE) {
    const c0 = wordAt(message, off), c1 = wordAt(message, off + 8);
    out.set(wordToBytes(state[0] ^ c0), outOff); outOff += 8;
    out.set(wordToBytes(state[1] ^ c1), outOff); outOff += 8;
    state[0] = c0; state[1] = c1;
    permutation(state, PB);
  }
  const block = message.length - RATE;
  const maskBytes = new Uint8Array(RATE);
  for (let i = lastLen; i < RATE; i++) maskBytes[i] = 0xff;
  const padBytes = new Uint8Array(RATE);
  padBytes[lastLen] = 0x01;
  const c0 = wordAt(message, block), c1 = wordAt(message, block + 8);
  const p0 = wordToBytes(state[0] ^ c0), p1 = wordToBytes(state[1] ^ c1);
  const tailLen = ciphertext.length - outOff; // equals lastLen, or RATE if ciphertext.length===0 mod RATE (then 0)
  out.set(p0.subarray(0, Math.min(8, tailLen)), outOff);
  if (tailLen > 8) out.set(p1.subarray(0, tailLen - 8), outOff + 8);
  state[0] = (state[0] & wordAt(maskBytes, 0)) ^ c0 ^ wordAt(padBytes, 0);
  state[1] = (state[1] & wordAt(maskBytes, 8)) ^ c1 ^ wordAt(padBytes, 8);
  return out;
}

function finalize(state, key) {
  state[2] ^= wordAt(key, 0);
  state[3] ^= wordAt(key, 8);
  permutation(state, PA);
  state[3] ^= wordAt(key, 0);
  state[4] ^= wordAt(key, 8);
  return concatBytes(wordToBytes(state[3]), wordToBytes(state[4]));
}

export function asconEncrypt(key, nonce, ad, plaintext) {
  if (key.length !== 16) throw new Error(`Ascon-AEAD128 key must be 16 bytes (got ${key.length})`);
  if (nonce.length !== 16) throw new Error(`Ascon-AEAD128 nonce must be 16 bytes (got ${nonce.length})`);
  const state = initialize(key, nonce);
  processAssociatedData(state, ad);
  const ciphertext = processPlaintext(state, plaintext);
  const tag = finalize(state, key);
  return concatBytes(ciphertext, tag);
}

export function asconDecrypt(key, nonce, ad, ciphertextAndTag) {
  if (key.length !== 16) throw new Error(`Ascon-AEAD128 key must be 16 bytes (got ${key.length})`);
  if (nonce.length !== 16) throw new Error(`Ascon-AEAD128 nonce must be 16 bytes (got ${nonce.length})`);
  if (ciphertextAndTag.length < 16) throw new Error('Ciphertext too short to contain a tag');
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);
  const expectedTag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);
  const state = initialize(key, nonce);
  processAssociatedData(state, ad);
  const plaintext = processCiphertext(state, ciphertext);
  const tag = finalize(state, key);
  let diff = 0;
  for (let i = 0; i < 16; i++) diff |= tag[i] ^ expectedTag[i];
  if (diff !== 0) throw new Error('Authentication failed: tag mismatch');
  return plaintext;
}
