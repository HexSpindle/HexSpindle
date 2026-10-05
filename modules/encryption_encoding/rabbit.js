import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';

function counterUpdate(C, A, b) {
  let carry = b;
  for (let j = 0; j < 8; j++) {
    const temp = C[j] + A[j] + carry;
    carry = (temp / 4294967296) >>> 0;
    C[j] = temp >>> 0;
  }
  return carry;
}

function g(u, v) {
  const uv = (u + v) >>> 0;
  const upper = uv >>> 16, lower = uv & 0xffff;
  const upperUpper = upper * upper;
  const upperLower2 = 2 * upper * lower;
  const lowerLower = lower * lower;
  const mswTemp = upperUpper + ((upperLower2 / 65536) >>> 0);
  const lswTemp = lowerLower + (upperLower2 & 0xffff) * 65536;
  const msw = mswTemp + ((lswTemp / 4294967296) >>> 0);
  const lsw = lswTemp >>> 0;
  return (lsw ^ msw) >>> 0;
}

function leftRotate(value, width) { return ((value << width) | (value >>> (32 - width))) >>> 0; }
function h1(v0, v1, v2) { return (v0 + leftRotate(v1, 16) + leftRotate(v2, 16)) >>> 0; }
function h2(v0, v1, v2) { return (v0 + leftRotate(v1, 8) + v2) >>> 0; }

function nextState(X, C, G) {
  for (let j = 0; j < 8; j++) G[j] = g(X[j], C[j]);
  const nx = new Uint32Array(8);
  nx[0] = h1(G[0], G[7], G[6]); nx[1] = h2(G[1], G[0], G[7]);
  nx[2] = h1(G[2], G[1], G[0]); nx[3] = h2(G[3], G[2], G[1]);
  nx[4] = h1(G[4], G[3], G[2]); nx[5] = h2(G[5], G[4], G[3]);
  nx[6] = h1(G[6], G[5], G[4]); nx[7] = h2(G[7], G[6], G[5]);
  X.set(nx);
}

const A_CONST = [0x4d34d34d, 0xd34d34d3, 0x34d34d34, 0x4d34d34d, 0xd34d34d3, 0x34d34d34, 0x4d34d34d, 0xd34d34d3];

export function rabbit(key, iv, data, littleEndian = false) {
  if (key.length !== 16) throw new Error(`Rabbit key must be 16 bytes (got ${key.length})`);
  if (iv.length !== 0 && iv.length !== 8) throw new Error(`Rabbit IV must be 0 or 8 bytes (got ${iv.length})`);

  const X = new Uint32Array(8), C = new Uint32Array(8), G = new Uint32Array(8);
  let b = 0;

  const K = new Uint16Array(8);
  if (littleEndian) {
    for (let i = 0; i < 8; i++) K[i] = (key[1 + 2 * i] << 8) | key[2 * i];
  } else {
    for (let i = 0; i < 8; i++) K[i] = (key[14 - 2 * i] << 8) | key[15 - 2 * i];
  }
  for (let j = 0; j < 8; j++) {
    if (j % 2 === 0) {
      X[j] = (K[(j + 1) % 8] << 16) | K[j];
      C[j] = (K[(j + 4) % 8] << 16) | K[(j + 5) % 8];
    } else {
      X[j] = (K[(j + 5) % 8] << 16) | K[(j + 4) % 8];
      C[j] = (K[j] << 16) | K[(j + 1) % 8];
    }
  }
  for (let i = 0; i < 4; i++) { b = counterUpdate(C, A_CONST, b); nextState(X, C, G); }
  for (let j = 0; j < 8; j++) C[j] = C[j] ^ X[(j + 4) % 8];

  if (iv.length === 8) {
    const getIVValue = (p0, p1, p2, p3) => {
      if (littleEndian) return ((iv[p0] << 24) | (iv[p1] << 16) | (iv[p2] << 8) | iv[p3]) >>> 0;
      return ((iv[7 - p0] << 24) | (iv[7 - p1] << 16) | (iv[7 - p2] << 8) | iv[7 - p3]) >>> 0;
    };
    C[0] ^= getIVValue(3, 2, 1, 0); C[1] ^= getIVValue(7, 6, 3, 2);
    C[2] ^= getIVValue(7, 6, 5, 4); C[3] ^= getIVValue(5, 4, 1, 0);
    C[4] ^= getIVValue(3, 2, 1, 0); C[5] ^= getIVValue(7, 6, 3, 2);
    C[6] ^= getIVValue(7, 6, 5, 4); C[7] ^= getIVValue(5, 4, 1, 0);
    for (let i = 0; i < 4; i++) { b = counterUpdate(C, A_CONST, b); nextState(X, C, G); }
  }

  const S = new Uint8Array(16);
  const extract = () => {
    let pos = 0;
    const addPart = (v) => { S[pos++] = v >>> 8; S[pos++] = v & 0xff; };
    b = counterUpdate(C, A_CONST, b);
    nextState(X, C, G);
    addPart(((X[6] >>> 16) ^ (X[1] & 0xffff)) >>> 0);
    addPart(((X[6] & 0xffff) ^ (X[3] >>> 16)) >>> 0);
    addPart(((X[4] >>> 16) ^ (X[7] & 0xffff)) >>> 0);
    addPart(((X[4] & 0xffff) ^ (X[1] >>> 16)) >>> 0);
    addPart(((X[2] >>> 16) ^ (X[5] & 0xffff)) >>> 0);
    addPart(((X[2] & 0xffff) ^ (X[7] >>> 16)) >>> 0);
    addPart(((X[0] >>> 16) ^ (X[3] & 0xffff)) >>> 0);
    addPart(((X[0] & 0xffff) ^ (X[5] >>> 16)) >>> 0);
    if (littleEndian) S.reverse();
  };

  const result = new Uint8Array(data.length);
  let i = 0;
  for (; i <= data.length - 16; i += 16) {
    extract();
    for (let j = 0; j < 16; j++) result[i + j] = data[i + j] ^ S[j];
  }
  if (data.length % 16 !== 0) {
    const length = data.length - i;
    extract();
    if (littleEndian) {
      for (let j = 0; j < length; j++) result[i + j] = data[i + j] ^ S[j];
    } else {
      for (let j = 0; j < length; j++) result[i + j] = data[i + j] ^ S[16 - length + j];
    }
  }
  return result;
}

module('Rabbit', 'Rabbit stream cipher (RFC 4503, eSTREAM portfolio). 128-bit key, optional 64-bit IV; encrypt = decrypt.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
   A.select('Endianness', ['Big', 'Little']), A.select('Input', ['Raw', 'Hex']), A.select('Output', ['Hex', 'Raw'])],
  (data, key, iv, endianness, inp, out) => {
    const plain = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const res = rabbit(key, iv, plain, endianness === 'Little');
    return out === 'Hex' ? bytesToHex(res) : res;
  });
