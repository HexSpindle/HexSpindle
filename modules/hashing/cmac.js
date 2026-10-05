import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { desBlock } from './lm_hash.js';

function xorBytes(a, b) { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] ^ b[i]; return o; }

async function aesEcbBlock(key, block) {
  const ck = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, ck, block));
  return ct.subarray(0, 16);
}

async function cmacBlockFn(key, alg) {
  if (alg === 'AES') return (block) => aesEcbBlock(key, block);
  const k1 = key.subarray(0, 8), k2 = key.subarray(8, 16), k3 = key.length === 24 ? key.subarray(16, 24) : k1;
  return (block) => Promise.resolve(desBlock(k3, desBlock(k2, desBlock(k1, block), true)));
}

export async function cmac(key, data, alg = 'AES') {
  const blockSize = alg === 'AES' ? 16 : 8;
  const encrypt = await cmacBlockFn(key, alg);
  const zero = new Uint8Array(blockSize);
  const l = await encrypt(zero);
  const rb = blockSize === 16 ? 0x87n : 0x1bn;
  function shift(bytes) {
    let carry = 0n;
    const out = new Uint8Array(bytes.length);
    for (let i = bytes.length - 1; i >= 0; i--) {
      const v = (BigInt(bytes[i]) << 1n) | carry;
      out[i] = Number(v & 0xffn);
      carry = (v >> 8n) & 1n;
    }
    if (carry) out[out.length - 1] ^= Number(rb);
    return out;
  }
  const k1 = shift(l);
  const k2 = shift(k1);

  let blocks;
  const n = Math.ceil(data.length / blockSize) || 1;
  const complete = data.length > 0 && data.length % blockSize === 0;
  blocks = [];
  for (let i = 0; i < n - 1; i++) blocks.push(data.subarray(i * blockSize, (i + 1) * blockSize));
  let last = data.subarray((n - 1) * blockSize);
  if (complete) {
    last = xorBytes(last, k1);
  } else {
    const padded = new Uint8Array(blockSize);
    padded.set(last);
    padded[last.length] = 0x80;
    last = xorBytes(padded, k2);
  }
  blocks.push(last);

  let x = new Uint8Array(blockSize);
  for (const block of blocks) x = await encrypt(xorBytes(x, block));
  return x;
}

module('CMAC', 'Cipher-based MAC using AES or Triple DES.', [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64']), A.select('Encryption algorithm', ['AES', 'Triple DES'])],
  async (data, key, alg) => bytesToHex(await cmac(key, data, alg === 'AES' ? 'AES' : 'DES3')));
