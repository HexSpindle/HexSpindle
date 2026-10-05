import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function rotl(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }

function quarterRound(s, a, b, c, d) {
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl(s[b] ^ s[c], 7);
}

function chachaRounds(state) {
  const s = state.slice();
  for (let i = 0; i < 10; i++) {
    quarterRound(s, 0, 4, 8, 12); quarterRound(s, 1, 5, 9, 13); quarterRound(s, 2, 6, 10, 14); quarterRound(s, 3, 7, 11, 15);
    quarterRound(s, 0, 5, 10, 15); quarterRound(s, 1, 6, 11, 12); quarterRound(s, 2, 7, 8, 13); quarterRound(s, 3, 4, 9, 14);
  }
  return s;
}

const CONST = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];

function bytesToWordsLE(b) {
  const w = new Uint32Array(b.length / 4);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let i = 0; i < w.length; i++) w[i] = dv.getUint32(i * 4, true);
  return w;
}
function wordsToBytesLE(w) {
  const out = new Uint8Array(w.length * 4);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < w.length; i++) dv.setUint32(i * 4, w[i] >>> 0, true);
  return out;
}

function hchacha20(key, nonce16) {
  const state = new Uint32Array(16);
  state.set(CONST, 0);
  state.set(bytesToWordsLE(key), 4);
  state.set(bytesToWordsLE(nonce16), 12);
  const s = chachaRounds(state);
  const out = new Uint32Array(8);
  out.set(s.subarray(0, 4), 0);
  out.set(s.subarray(12, 16), 4);
  return wordsToBytesLE(out);
}

function keystream(key, nonce, counter, len) {
  let effKey = key, effNonce = nonce;
  if (nonce.length === 24) {
    effKey = hchacha20(key, nonce.subarray(0, 16));
    effNonce = new Uint8Array(12);
    effNonce.set(nonce.subarray(16, 24), 4);
  }
  const keyWords = bytesToWordsLE(effKey);
  const out = new Uint8Array(len);
  let off = 0;
  if (effNonce.length === 12) {
    const nonceWords = bytesToWordsLE(effNonce);
    let ctr = counter >>> 0;
    while (off < len) {
      const state = new Uint32Array(16);
      state.set(CONST, 0); state.set(keyWords, 4);
      state[12] = ctr; state.set(nonceWords, 13);
      const s = chachaRounds(state);
      for (let i = 0; i < 16; i++) s[i] = (s[i] + state[i]) >>> 0;
      const block = wordsToBytesLE(s);
      const n = Math.min(64, len - off);
      out.set(block.subarray(0, n), off);
      off += n; ctr = (ctr + 1) >>> 0;
    }
  } else if (effNonce.length === 8) {
    const nonceWords = bytesToWordsLE(effNonce);
    let ctrLo = Number(BigInt(counter) & 0xffffffffn) >>> 0;
    let ctrHi = Number(BigInt(counter) >> 32n) >>> 0;
    while (off < len) {
      const state = new Uint32Array(16);
      state.set(CONST, 0); state.set(keyWords, 4);
      state[12] = ctrLo; state[13] = ctrHi; state.set(nonceWords, 14);
      const s = chachaRounds(state);
      for (let i = 0; i < 16; i++) s[i] = (s[i] + state[i]) >>> 0;
      const block = wordsToBytesLE(s);
      const n = Math.min(64, len - off);
      out.set(block.subarray(0, n), off);
      off += n;
      ctrLo = (ctrLo + 1) >>> 0;
      if (ctrLo === 0) ctrHi = (ctrHi + 1) >>> 0;
    }
  } else {
    throw new Error(`Nonce must be 8, 12 or 24 bytes (got ${effNonce.length})`);
  }
  return out;
}

export function chacha20Encrypt(key, nonce, counter, data) {
  if (key.length !== 32) throw new Error(`ChaCha20 key must be 32 bytes (got ${key.length})`);
  const ks = keystream(key, nonce, counter, data.length);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ ks[i];
  return out;
}

module('ChaCha20', 'ChaCha20 stream cipher (encrypt = decrypt). 32-byte key; 8, 12 or 24-byte nonce.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.number('Initial counter', 0, 0)],
  (data, key, nonce, counter) => chacha20Encrypt(key, nonce, counter, data));
