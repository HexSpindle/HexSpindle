const DELTA = 0x9e3779b9;
const MASK = 0xffffffff;

export function teaEncryptBlock(v0, v1, key, rounds = 32) {
  const [k0, k1, k2, k3] = key;
  let s = 0;
  for (let n = 0; n < rounds; n++) {
    s = (s + DELTA) >>> 0;
    const t0 = (((((v1 << 4) >>> 0) + k0) >>> 0) ^ ((v1 + s) >>> 0) ^ ((((v1 >>> 5) >>> 0) + k1) >>> 0)) >>> 0;
    v0 = (v0 + t0) >>> 0;
    const t1 = (((((v0 << 4) >>> 0) + k2) >>> 0) ^ ((v0 + s) >>> 0) ^ ((((v0 >>> 5) >>> 0) + k3) >>> 0)) >>> 0;
    v1 = (v1 + t1) >>> 0;
  }
  return [v0 & MASK, v1 & MASK];
}

export function teaDecryptBlock(v0, v1, key, rounds = 32) {
  const [k0, k1, k2, k3] = key;
  let s = (DELTA * rounds) >>> 0;
  for (let n = 0; n < rounds; n++) {
    const t1 = (((((v0 << 4) >>> 0) + k2) >>> 0) ^ ((v0 + s) >>> 0) ^ ((((v0 >>> 5) >>> 0) + k3) >>> 0)) >>> 0;
    v1 = (v1 - t1) >>> 0;
    const t0 = (((((v1 << 4) >>> 0) + k0) >>> 0) ^ ((v1 + s) >>> 0) ^ ((((v1 >>> 5) >>> 0) + k1) >>> 0)) >>> 0;
    v0 = (v0 - t0) >>> 0;
    s = (s - DELTA) >>> 0;
  }
  return [v0 & MASK, v1 & MASK];
}

export function xteaEncryptBlock(v0, v1, key, rounds = 32) {
  let s = 0;
  for (let n = 0; n < rounds; n++) {
    const t1 = ((((v1 << 4) >>> 0) ^ (v1 >>> 5)) + v1) >>> 0;
    const t2 = (s + key[s & 3]) >>> 0;
    v0 = (v0 + (t1 ^ t2)) >>> 0;
    s = (s + DELTA) >>> 0;
    const t3 = ((((v0 << 4) >>> 0) ^ (v0 >>> 5)) + v0) >>> 0;
    const t4 = (s + key[(s >>> 11) & 3]) >>> 0;
    v1 = (v1 + (t3 ^ t4)) >>> 0;
  }
  return [v0 & MASK, v1 & MASK];
}

export function xteaDecryptBlock(v0, v1, key, rounds = 32) {
  let s = (DELTA * rounds) >>> 0;
  for (let n = 0; n < rounds; n++) {
    const t3 = ((((v0 << 4) >>> 0) ^ (v0 >>> 5)) + v0) >>> 0;
    const t4 = (s + key[(s >>> 11) & 3]) >>> 0;
    v1 = (v1 - (t3 ^ t4)) >>> 0;
    s = (s - DELTA) >>> 0;
    const t1 = ((((v1 << 4) >>> 0) ^ (v1 >>> 5)) + v1) >>> 0;
    const t2 = (s + key[s & 3]) >>> 0;
    v0 = (v0 - (t1 ^ t2)) >>> 0;
  }
  return [v0 & MASK, v1 & MASK];
}

export const TEA_PADDINGS = ['PKCS5', 'NO', 'ZERO', 'RANDOM', 'BIT'];

function applyPadding(data, padding) {
  const rem = data.length % 8;
  if (rem === 0 && padding !== 'PKCS5') return data;
  const n = 8 - rem;
  const out = new Uint8Array(data.length + n);
  out.set(data);
  switch (padding) {
    case 'NO':
      throw new Error(`No padding requested but input length (${data.length} bytes) is not a multiple of 8 bytes.`);
    case 'PKCS5': out.fill(n, data.length); break;
    case 'ZERO': break;
    case 'RANDOM': crypto.getRandomValues(out.subarray(data.length)); break;
    case 'BIT': out[data.length] = 0x80; break;
    default: throw new Error(`Unknown padding type: ${padding}`);
  }
  return out;
}

function removePadding(data, padding) {
  if (data.length === 0) return data;
  switch (padding) {
    case 'PKCS5': {
      const p = data[data.length - 1];
      if (p > 0 && p <= 8) {
        for (let i = 0; i < p; i++) if (data[data.length - 1 - i] !== p) throw new Error('Invalid PKCS#5 padding.');
        return data.slice(0, data.length - p);
      }
      throw new Error('Invalid PKCS#5 padding.');
    }
    case 'BIT':
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] === 0x80) return data.slice(0, i);
        if (data[i] !== 0) throw new Error('Invalid BIT padding.');
      }
      throw new Error('Invalid BIT padding.');
    default: return data;
  }
}

function blocks(padded, encryptFn, key, rounds) {
  const out = new Uint8Array(padded.length);
  for (let i = 0; i < padded.length; i += 8) {
    let v0 = (((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]) >>> 0);
    let v1 = (((padded[i + 4] << 24) | (padded[i + 5] << 16) | (padded[i + 6] << 8) | padded[i + 7]) >>> 0);
    [v0, v1] = encryptFn(v0, v1, key, rounds);
    out[i] = (v0 >>> 24) & 0xff; out[i + 1] = (v0 >>> 16) & 0xff; out[i + 2] = (v0 >>> 8) & 0xff; out[i + 3] = v0 & 0xff;
    out[i + 4] = (v1 >>> 24) & 0xff; out[i + 5] = (v1 >>> 16) & 0xff; out[i + 6] = (v1 >>> 8) & 0xff; out[i + 7] = v1 & 0xff;
  }
  return out;
}

function keyWords(key16) {
  const key = new Array(4);
  for (let i = 0; i < 4; i++) {
    const o = i * 4;
    key[i] = (((key16[o] << 24) | (key16[o + 1] << 16) | (key16[o + 2] << 8) | key16[o + 3]) >>> 0);
  }
  return key;
}

function ecb(data, key16, rounds, decrypt, padding, encFn, decFn) {
  const key = keyWords(key16);
  if (data.length === 0) return new Uint8Array(0);
  if (decrypt) {
    if (data.length % 8) throw new Error(`Invalid ciphertext length: ${data.length} bytes. Must be a multiple of 8.`);
    return removePadding(blocks(data, decFn, key, rounds), padding);
  }
  return blocks(applyPadding(data, padding), encFn, key, rounds);
}

export function teaEcb(data, key16, rounds, decrypt, padding = 'ZERO') {
  return ecb(data, key16, rounds, decrypt, padding, teaEncryptBlock, teaDecryptBlock);
}
export function xteaEcb(data, key16, rounds, decrypt, padding = 'ZERO') {
  return ecb(data, key16, rounds, decrypt, padding, xteaEncryptBlock, xteaDecryptBlock);
}
