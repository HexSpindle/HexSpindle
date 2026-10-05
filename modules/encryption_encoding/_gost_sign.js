import { makeMagma, makeKuznechik, ecbEncrypt, ecbDecrypt, cfbEncrypt } from './_gost.js';

function makeCipher(algo, key) {
  if (algo === 'Kuznyechik') return makeKuznechik(key);
  if (algo === 'Magma') return makeMagma(key);
  throw new Error(`Unsupported algorithm: ${algo}`);
}

function doubleSubkey(bytes) {
  const n = bytes.length;
  const out = new Uint8Array(n);
  let carry = 0;
  for (let i = n - 1; i >= 0; i--) {
    const topBit = bytes[i] >>> 7;
    out[i] = ((bytes[i] << 1) & 0xff) | carry;
    carry = topBit;
  }
  if (carry) out[n - 1] ^= (n === 16 ? 0x87 : 0x1b);
  return out;
}

function bitPad(data, blockSize) {
  const n = data.length;
  const m = Math.ceil((n + 1) / blockSize) * blockSize;
  const out = new Uint8Array(m);
  out.set(data);
  out[n] = 1;
  return out;
}

function xorInto(dst, src) { for (let i = 0; i < dst.length; i++) dst[i] ^= src[i]; }

export function gostMac(algo, key, data, macLenBytes, initial = null) {
  const cipher = makeCipher(algo, key);
  const bs = cipher.blockSize;
  let k1 = doubleSubkey(cipher.encryptBlock(new Uint8Array(bs)));
  let blocks = data;
  if (data.length % bs !== 0) {
    blocks = bitPad(data, bs);
    k1 = doubleSubkey(k1); // K2
  }
  const s = initial ? initial.slice(0, bs) : new Uint8Array(bs);
  const nBlocks = blocks.length / bs;
  for (let i = 0; i < nBlocks; i++) {
    xorInto(s, blocks.subarray(i * bs, (i + 1) * bs));
    if (i === nBlocks - 1) xorInto(s, k1);
    s.set(cipher.encryptBlock(s));
  }
  return s.subarray(0, macLenBytes);
}

export function gostSign(algo, key, data, macLenBytes, iv = null) {
  return gostMac(algo, key, data, macLenBytes, iv);
}

export function gostVerify(algo, key, mac, data, iv = null) {
  const computed = gostMac(algo, key, data, mac.length, iv);
  if (computed.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= computed[i] ^ mac[i];
  return diff === 0;
}


export function gostKeyWrapNo(algo, kek, cek, ukm) {
  const bs = makeCipher(algo, kek).blockSize;
  if (ukm.length !== bs) throw new Error(`UKM must be ${bs} bytes for ${algo}`);
  const mac = gostMac(algo, kek, cek, bs >> 1, ukm);
  const enc = ecbEncrypt(makeCipher(algo, kek), cek);
  const out = new Uint8Array(cek.length + (bs >> 1));
  out.set(enc, 0);
  out.set(mac, cek.length);
  return out;
}

export function gostKeyUnwrapNo(algo, kek, wrapped, ukm) {
  const bs = makeCipher(algo, kek).blockSize;
  if (ukm.length !== bs) throw new Error(`UKM must be ${bs} bytes for ${algo}`);
  const macLen = bs >> 1;
  if (wrapped.length <= macLen) throw new Error('Wrapped key too short');
  const enc = wrapped.subarray(0, wrapped.length - macLen);
  const mac = wrapped.subarray(wrapped.length - macLen);
  const cek = ecbDecrypt(makeCipher(algo, kek), enc);
  if (!gostVerify(algo, kek, mac, cek, ukm)) throw new Error('Key wrap MAC does not match (wrong KEK/UKM, or corrupted data)');
  return cek;
}


function readU32LE(b, off) { return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0; }
function writeU32LE(b, off, v) { b[off] = v & 0xff; b[off + 1] = (v >>> 8) & 0xff; b[off + 2] = (v >>> 16) & 0xff; b[off + 3] = (v >>> 24) & 0xff; }

function diversifyKekMagma(kek, ukm) {
  let k = kek.slice();
  for (let i = 0; i < 8; i++) {
    const words = [];
    for (let j = 0; j < 8; j++) words.push(readU32LE(k, j * 4));
    let s0 = 0, s1 = 0;
    for (let j = 0; j < 8; j++) {
      const bit = (ukm[i] >>> j) & 1;
      if (bit) s0 = (s0 + words[j]) >>> 0;
      else s1 = (s1 + words[j]) >>> 0;
    }
    const iv = new Uint8Array(8);
    writeU32LE(iv, 0, s0);
    writeU32LE(iv, 4, s1);
    k = cfbEncrypt(makeMagma(k), k, iv);
  }
  return k;
}

export function gostKeyWrapCp(algo, kek, cek, ukm) {
  if (algo !== 'Magma') throw new Error('CryptoPro ("CP") key wrapping is only supported for Magma (GOST 28147-89 is a 64-bit cipher; the CryptoPro diversification algorithm is only defined for it)');
  if (ukm.length !== 8) throw new Error('UKM must be 8 bytes for CryptoPro key wrapping');
  const dek = diversifyKekMagma(kek, ukm);
  const mac = gostMac(algo, dek, cek, 4, ukm);
  const enc = ecbEncrypt(makeMagma(dek), cek);
  const out = new Uint8Array(cek.length + 4);
  out.set(enc, 0);
  out.set(mac, cek.length);
  return out;
}

export function gostKeyUnwrapCp(algo, kek, wrapped, ukm) {
  if (algo !== 'Magma') throw new Error('CryptoPro ("CP") key wrapping is only supported for Magma (GOST 28147-89 is a 64-bit cipher; the CryptoPro diversification algorithm is only defined for it)');
  if (ukm.length !== 8) throw new Error('UKM must be 8 bytes for CryptoPro key wrapping');
  if (wrapped.length <= 4) throw new Error('Wrapped key too short');
  const dek = diversifyKekMagma(kek, ukm);
  const enc = wrapped.subarray(0, wrapped.length - 4);
  const mac = wrapped.subarray(wrapped.length - 4);
  const cek = ecbDecrypt(makeMagma(dek), enc);
  if (!gostVerify(algo, dek, mac, cek, ukm)) throw new Error('Key wrap MAC does not match (wrong KEK/UKM, or corrupted data)');
  return cek;
}
