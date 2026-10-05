import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex, concatBytes } from '../../core/util.js';

export const MODES = ['CBC', 'CFB', 'OFB', 'CTR', 'ECB', 'GCM'];

export function cipherArgs(decrypt = false) {
  return [
    A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.toggle('IV / Nonce', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.select('Mode', MODES),
    A.select('Input', decrypt ? ['Hex', 'Raw'] : ['Raw', 'Hex']),
    A.select('Output', decrypt ? ['Raw', 'Hex'] : ['Hex', 'Raw']),
  ];
}

function pkcs7Pad(data, bs) {
  const padLen = bs - (data.length % bs);
  const out = new Uint8Array(data.length + padLen);
  out.set(data, 0);
  out.fill(padLen, data.length);
  return out;
}
function pkcs7Unpad(data, bs) {
  if (!data.length || data.length % bs !== 0) throw new Error('Data is not padded');
  const padLen = data[data.length - 1];
  if (padLen < 1 || padLen > bs || padLen > data.length) throw new Error('Padding is incorrect.');
  for (let i = data.length - padLen; i < data.length; i++) if (data[i] !== padLen) throw new Error('Padding is incorrect.');
  return data.slice(0, data.length - padLen);
}

function xorBlock(a, b) { const out = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]; return out; }

function ecb(blockFn, bs, data) {
  const out = new Uint8Array(data.length);
  for (let off = 0; off < data.length; off += bs) out.set(blockFn(data.subarray(off, off + bs)), off);
  return out;
}
function cbcEncrypt(encBlock, bs, iv, data) {
  const out = new Uint8Array(data.length);
  let prev = iv;
  for (let off = 0; off < data.length; off += bs) {
    const block = xorBlock(data.subarray(off, off + bs), prev);
    const ct = encBlock(block);
    out.set(ct, off);
    prev = ct;
  }
  return out;
}
function cbcDecrypt(decBlock, bs, iv, data) {
  const out = new Uint8Array(data.length);
  let prev = iv;
  for (let off = 0; off < data.length; off += bs) {
    const ctBlock = data.subarray(off, off + bs);
    const pt = xorBlock(decBlock(ctBlock), prev);
    out.set(pt, off);
    prev = ctBlock;
  }
  return out;
}

function cfb(encBlock, bs, iv, data, decrypt) {
  const out = new Uint8Array(data.length);
  let shift = iv;
  for (let off = 0; off < data.length; off += bs) {
    const n = Math.min(bs, data.length - off);
    const ks = encBlock(shift).subarray(0, n);
    const chunk = data.subarray(off, off + n);
    const outChunk = xorBlock(chunk, ks);
    out.set(outChunk, off);
    shift = decrypt ? chunk : outChunk;
    if (n < bs) break;
  }
  return out;
}
function ofb(encBlock, bs, iv, data) {
  const out = new Uint8Array(data.length);
  let state = iv;
  for (let off = 0; off < data.length; off += bs) {
    state = encBlock(state);
    const n = Math.min(bs, data.length - off);
    for (let i = 0; i < n; i++) out[off + i] = data[off + i] ^ state[i];
  }
  return out;
}
function incCounterField(ctr, from) {
  const out = ctr.slice();
  for (let i = out.length - 1; i >= from; i--) { out[i] = (out[i] + 1) & 255; if (out[i] !== 0) break; }
  return out;
}

function ctr(encBlock, bs, iv, data) {
  const out = new Uint8Array(data.length);
  let counter = iv.length === bs ? iv : concatBytes([iv, new Uint8Array(bs - iv.length)]);
  const prefixLen = iv.length === bs ? 0 : iv.length;
  for (let off = 0; off < data.length; off += bs) {
    const ks = encBlock(counter);
    const n = Math.min(bs, data.length - off);
    for (let i = 0; i < n; i++) out[off + i] = data[off + i] ^ ks[i];
    counter = incCounterField(counter, prefixLen);
  }
  return out;
}

export function runCipher(encBlock, decBlock, bs, data, key, iv, mode, inp, out, decrypt) {
  if (inp === 'Hex') data = parseHex(decodeLatin1(data));
  if (mode !== 'ECB' && mode !== 'CTR' && iv.length !== bs) throw new Error(`IV must be ${bs} bytes for ${mode} (got ${iv.length})`);
  const enc = (block) => encBlock(block, key);
  const dec = (block) => decBlock(block, key);
  let res;
  if (decrypt) {
    if (mode === 'ECB') res = pkcs7Unpad(ecb(dec, bs, data), bs);
    else if (mode === 'CBC') res = pkcs7Unpad(cbcDecrypt(dec, bs, iv, data), bs);
    else if (mode === 'CFB') res = cfb(enc, bs, iv, data, true);
    else if (mode === 'OFB') res = ofb(enc, bs, iv, data);
    else if (mode === 'CTR') res = ctr(enc, bs, iv, data);
    else throw new Error(`Unsupported mode: ${mode}`);
  } else {
    if (mode === 'ECB') res = ecb(enc, bs, pkcs7Pad(data, bs));
    else if (mode === 'CBC') res = cbcEncrypt(enc, bs, iv, pkcs7Pad(data, bs));
    else if (mode === 'CFB') res = cfb(enc, bs, iv, data, false);
    else if (mode === 'OFB') res = ofb(enc, bs, iv, data);
    else if (mode === 'CTR') res = ctr(enc, bs, iv, data);
    else throw new Error(`Unsupported mode: ${mode}`);
  }
  return out === 'Hex' ? bytesToHex(res) : res;
}

export { concatBytes };
