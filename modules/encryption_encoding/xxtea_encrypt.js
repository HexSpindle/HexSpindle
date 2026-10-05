import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

const DELTA = 0x9e3779b9;

function mx(s, y, z, p, e, key) {
  const t1 = (((z >>> 5) ^ ((y << 2) >>> 0)) >>> 0);
  const t2 = (((y >>> 3) ^ ((z << 4) >>> 0)) >>> 0);
  const sum1 = (t1 + t2) >>> 0;
  const t3 = ((s ^ y) >>> 0);
  const t4 = ((key[(p & 3) ^ e] ^ z) >>> 0);
  const sum2 = (t3 + t4) >>> 0;
  return (sum1 ^ sum2) >>> 0;
}

export function btea(v, key, encrypt) {
  const n = v.length;
  if (n < 2) throw new Error('XXTEA needs at least 8 bytes of data');
  const rounds = 6 + Math.floor(52 / n);
  if (encrypt) {
    let s = 0, z = v[n - 1];
    for (let r = 0; r < rounds; r++) {
      s = (s + DELTA) >>> 0;
      const e = (s >>> 2) & 3;
      for (let p = 0; p < n - 1; p++) {
        const y = v[p + 1];
        v[p] = (v[p] + mx(s, y, z, p, e, key)) >>> 0;
        z = v[p];
      }
      const y = v[0];
      v[n - 1] = (v[n - 1] + mx(s, y, z, n - 1, e, key)) >>> 0;
      z = v[n - 1];
    }
  } else {
    let s = (rounds * DELTA) >>> 0;
    let y = v[0];
    for (let r = 0; r < rounds; r++) {
      const e = (s >>> 2) & 3;
      for (let p = n - 1; p > 0; p--) {
        const z = v[p - 1];
        v[p] = (v[p] - mx(s, y, z, p, e, key)) >>> 0;
        y = v[p];
      }
      const z = v[n - 1];
      v[0] = (v[0] - mx(s, y, z, 0, e, key)) >>> 0;
      y = v[0];
      s = (s - DELTA) >>> 0;
    }
  }
  return v;
}

export function bytesToWordsLE(bytes) {
  const n = bytes.length / 4;
  const v = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    v[i] = ((bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0);
  }
  return v;
}
export function wordsToBytesLE(v) {
  const out = new Uint8Array(v.length * 4);
  for (let i = 0; i < v.length; i++) {
    const w = v[i] >>> 0, o = i * 4;
    out[o] = w & 0xff; out[o + 1] = (w >>> 8) & 0xff; out[o + 2] = (w >>> 16) & 0xff; out[o + 3] = (w >>> 24) & 0xff;
  }
  return out;
}

export const XXTEA_FORMATS = ['Raw (xxtea.js, length word)', 'Hex (zero-padded, no length word)'];

function toWords(bytes, includeLength) {
  const n = (bytes.length + 3) >> 2;
  const v = new Array(includeLength ? n + 1 : n).fill(0);
  if (includeLength) v[n] = bytes.length;
  for (let i = 0; i < bytes.length; i++) v[i >> 2] = (v[i >> 2] | (bytes[i] << ((i & 3) << 3))) >>> 0;
  return v;
}
export function xxteaKeyWords(key) {
  const k = new Uint8Array(Math.max(16, key.length));
  k.set(key);
  return toWords(k, false);
}

function cmx(s, y, z, p, e, k) {
  return ((((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^ ((s ^ y) + (k[(p & 3) ^ e] ^ z))) >>> 0;
}
export function xxteaJsEncrypt(data, key) {
  if (data.length === 0) return new Uint8Array(0);
  const v = toWords(data, true), k = xxteaKeyWords(key);
  const n = v.length - 1;
  let z = v[n], s = 0;
  for (let q = Math.floor(6 + 52 / v.length); q > 0; --q) {
    s = (s + DELTA) >>> 0;
    const e = (s >>> 2) & 3;
    for (let p = 0; p < n; ++p) z = v[p] = (v[p] + cmx(s, v[p + 1], z, p, e, k)) >>> 0;
    z = v[n] = (v[n] + cmx(s, v[0], z, n, e, k)) >>> 0;
  }
  return wordsToBytesLE(v);
}
export function xxteaJsDecrypt(data, key) {
  if (data.length === 0) return new Uint8Array(0);
  const v = toWords(data, false), k = xxteaKeyWords(key);
  const n = v.length - 1;
  let y = v[0];
  for (let s = (Math.floor(6 + 52 / v.length) * DELTA) >>> 0; s !== 0; s = (s - DELTA) >>> 0) {
    const e = (s >>> 2) & 3;
    for (let p = n; p > 0; --p) y = v[p] = (v[p] - cmx(s, y, v[p - 1], p, e, k)) >>> 0;
    y = v[0] = (v[0] - cmx(s, y, v[n], 0, e, k)) >>> 0;
  }
  const m = v[n], len = n * 4;
  if (m < len - 3 || m > len) throw new Error('Unable to decrypt using this key');
  return wordsToBytesLE(v).slice(0, m);
}

module('XXTEA Encrypt', 'XXTEA block cipher (16-byte key; shorter keys are zero-padded). Default format is xxtea.js',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.select('Format', XXTEA_FORMATS, XXTEA_FORMATS[0])],
  (data, key, format) => {
    if (format !== XXTEA_FORMATS[1]) return xxteaJsEncrypt(data, key);
    if (key.length !== 16) throw new Error('Key must be 16 bytes');
    const padLen = (4 - (data.length % 4)) % 4;
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data);
    const v = bytesToWordsLE(padded);
    const keyWords = bytesToWordsLE(key);
    return bytesToHex(wordsToBytesLE(btea(v, keyWords, true)));
  });
