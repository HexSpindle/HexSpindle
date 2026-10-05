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

function blocks(data, encryptFn, key, rounds) {
  const padLen = (-data.length % 8 + 8) % 8;
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
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

export function teaEcb(data, key16, rounds, decrypt) {
  const key = keyWords(key16);
  return blocks(data, decrypt ? teaDecryptBlock : teaEncryptBlock, key, rounds);
}
export function xteaEcb(data, key16, rounds, decrypt) {
  const key = keyWords(key16);
  return blocks(data, decrypt ? xteaDecryptBlock : xteaEncryptBlock, key, rounds);
}
