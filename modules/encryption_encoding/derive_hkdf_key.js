import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, concatBytes } from '../../core/util.js';
import { md5, sha224 } from './_hashes.js';
import { has160 } from '../hashing/has160.js';
import { whirlpool } from '../hashing/whirlpool.js';

const BLOCK_SIZE = { MD5: 64, SHA224: 64, SHA1: 64, SHA256: 64, SHA384: 128, SHA512: 128, HAS160: 64, Whirlpool: 64 };
const HASHES = Object.keys(BLOCK_SIZE);

async function digestFor(name, data) {
  switch (name) {
    case 'MD5': return md5(data);
    case 'SHA224': return sha224(data);
    case 'HAS160': return has160(data);
    case 'Whirlpool': return whirlpool(data);
    default: return new Uint8Array(await crypto.subtle.digest({ SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512' }[name], data));
  }
}

async function hmac(name, key, msg) {
  const bs = BLOCK_SIZE[name];
  let k = key;
  if (k.length > bs) k = await digestFor(name, k);
  if (k.length < bs) { const padded = new Uint8Array(bs); padded.set(k); k = padded; }
  const opad = new Uint8Array(bs), ipad = new Uint8Array(bs);
  for (let i = 0; i < bs; i++) { opad[i] = k[i] ^ 0x5c; ipad[i] = k[i] ^ 0x36; }
  return digestFor(name, concatBytes([opad, await digestFor(name, concatBytes([ipad, msg]))]));
}

module('Derive HKDF key', 'A simple Hashed Message Authentication Code (HMAC)-based key derivation function (HKDF), defined in RFC 5869. Input is the input keying material (IKM, or the PRK itself when "skip" is chosen).',
  [
    A.toggle('Salt', '', ['Hex', 'Decimal', 'Base64', 'UTF8', 'Latin1'], 'Hex'),
    A.toggle('Info', '', ['Hex', 'Decimal', 'Base64', 'UTF8', 'Latin1'], 'UTF8'),
    A.select('Hashing function', HASHES, 'SHA256'),
    A.select('Extract mode', ['with salt', 'no salt', 'skip']),
    A.number('L (number of output octets)', 16, 0),
  ],
  async (ikm, salt, info, hashFunc, extractMode, L) => {
    L = Math.floor(L);
    if (L < 0) throw new Error('L must be non-negative');
    const hashLen = (await digestFor(hashFunc, new Uint8Array(0))).length;
    if (L > 255 * hashLen) throw new Error(`L too large (maximum length for ${hashFunc} is ${255 * hashLen})`);

    let prk;
    if (extractMode === 'skip') {
      prk = ikm;
    } else {
      const saltBytes = extractMode === 'with salt' ? salt : new Uint8Array(hashLen);
      prk = await hmac(hashFunc, saltBytes, ikm);
    }

    let t = new Uint8Array(0);
    const blocks = [];
    for (let i = 1; i <= 255 && blocks.reduce((n, b) => n + b.length, 0) < L; i++) {
      t = await hmac(hashFunc, prk, concatBytes([t, info, new Uint8Array([i])]));
      blocks.push(t);
    }
    return bytesToHex(concatBytes(blocks).subarray(0, L));
  });
