import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

const P = (1n << 130n) - 5n;
const MASK128 = (1n << 128n) - 1n;

export function poly1305Mac(r, s, data) {
  let rInt = 0n;
  for (let i = 15; i >= 0; i--) rInt = (rInt << 8n) | BigInt(r[i]);
  rInt &= 0x0ffffffc0ffffffc0ffffffc0fffffffn;
  let sInt = 0n;
  for (let i = 15; i >= 0; i--) sInt = (sInt << 8n) | BigInt(s[i]);

  let acc = 0n;
  for (let off = 0; off < data.length; off += 16) {
    const chunk = data.subarray(off, off + 16);
    let n = 1n << BigInt(chunk.length * 8);
    for (let i = chunk.length - 1; i >= 0; i--) n |= BigInt(chunk[i]) << BigInt(i * 8);
    acc = (acc + n) * rInt % P;
  }
  const tag = (acc + sInt) & MASK128;
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = Number((tag >> BigInt(i * 8)) & 0xffn);
  return out;
}

function rotl32(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }
function chacha20Block(key, nonce, counter) {
  const CONST = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
  const kw = new Array(8);
  const kdv = new DataView(key.buffer, key.byteOffset, key.byteLength);
  for (let i = 0; i < 8; i++) kw[i] = kdv.getUint32(i * 4, true);
  const nw = new Array(3);
  const ndv = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
  for (let i = 0; i < 3; i++) nw[i] = ndv.getUint32(i * 4, true);
  const state = [...CONST, ...kw, counter >>> 0, ...nw];
  const working = state.slice();
  function qr(a, b, c, d) {
    working[a] = (working[a] + working[b]) >>> 0; working[d] = rotl32(working[d] ^ working[a], 16);
    working[c] = (working[c] + working[d]) >>> 0; working[b] = rotl32(working[b] ^ working[c], 12);
    working[a] = (working[a] + working[b]) >>> 0; working[d] = rotl32(working[d] ^ working[a], 8);
    working[c] = (working[c] + working[d]) >>> 0; working[b] = rotl32(working[b] ^ working[c], 7);
  }
  for (let round = 0; round < 10; round++) {
    qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15);
    qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14);
  }
  const out = new Uint8Array(64);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 16; i++) odv.setUint32(i * 4, (working[i] + state[i]) >>> 0, true);
  return out;
}

async function aesEcbEncrypt(key16, block16) {
  const ck = await crypto.subtle.importKey('raw', key16, 'AES-CBC', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, ck, block16));
  return ct.subarray(0, 16);
}

export async function poly1305(cipherKey, data, cipher = 'ChaCha20', nonce = null) {
  if (cipherKey.length !== 32) throw new Error(`Poly1305 with ${cipher} requires a 32-byte key`);
  let r, s, usedNonce;
  if (cipher === 'ChaCha20') {
    if (nonce == null || !nonce.length) usedNonce = crypto.getRandomValues(new Uint8Array(12));
    else if (nonce.length === 8) usedNonce = new Uint8Array([0, 0, 0, 0, ...nonce]);
    else if (nonce.length === 12) usedNonce = nonce;
    else throw new Error('Poly1305 with ChaCha20 requires an 8- or 12-byte nonce');
    const block = chacha20Block(cipherKey, usedNonce, 0);
    r = block.subarray(0, 16); s = block.subarray(16, 32);
  } else {
    if (nonce == null || !nonce.length) usedNonce = crypto.getRandomValues(new Uint8Array(16));
    else if (nonce.length === 16) usedNonce = nonce;
    else throw new Error('Poly1305 with AES requires a 16-byte nonce');
    r = cipherKey.subarray(16, 32);
    s = await aesEcbEncrypt(cipherKey.subarray(0, 16), usedNonce);
  }
  return { mac: poly1305Mac(r, s, data), nonce: usedNonce };
}

module('Poly1305', 'Poly1305 one-time authenticator (the MAC half of ChaCha20-Poly1305). 32-byte key; nonce is 16 bytes for AES or 8/12 bytes for ChaCha20.',
  [A.toggle('Key (32 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64']), A.select('Cipher', ['ChaCha20', 'AES']), A.toggle('Nonce (blank = random)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'])],
  async (data, key, cipher, nonce) => {
    const { mac, nonce: used } = await poly1305(key, data, cipher, nonce);
    return `MAC: ${bytesToHex(mac)}\nNonce used: ${bytesToHex(used)}`;
  });
