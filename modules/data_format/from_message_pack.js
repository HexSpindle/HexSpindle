import { module } from './_cat.js';
import { bytesToHex, decodeUtf8 } from '../../core/util.js';
import { Flt, stringifyTyped } from './_json.js';

const FMT_INT = {
  0xcc: ['Uint8', 1], 0xcd: ['Uint16', 2], 0xce: ['Uint32', 4], 0xcf: ['BigUint64', 8],
  0xd0: ['Int8', 1], 0xd1: ['Int16', 2], 0xd2: ['Int32', 4], 0xd3: ['BigInt64', 8],
};
const FMT_FLOAT = { 0xca: ['Float32', 4], 0xcb: ['Float64', 8] };

function readUint(b, i, n) {
  let v = 0n;
  for (let j = 0; j < n; j++) v = (v << 8n) | BigInt(b[i + j]);
  return v;
}

function dec(b, i = 0) {
  const c = b[i];
  i++;
  if (c < 0x80) return [c, i];
  if (c >= 0xe0) return [c - 256, i];
  if (c >= 0xa0 && c < 0xc0) { const n = c & 31; return [decodeUtf8(b.subarray(i, i + n)), i + n]; }
  if (c >= 0x90 && c < 0xa0) return arr(b, i, c & 15);
  if (c >= 0x80 && c < 0x90) return mp(b, i, c & 15);
  if (c === 0xc0) return [null, i];
  if (c === 0xc2) return [false, i];
  if (c === 0xc3) return [true, i];
  if (c in FMT_FLOAT) {
    const [kind, n] = FMT_FLOAT[c];
    const dv = new DataView(b.buffer, b.byteOffset + i, n);
    const v = kind === 'Float32' ? dv.getFloat32(0, false) : dv.getFloat64(0, false);
    return [new Flt(v), i + n];
  }
  if (c in FMT_INT) {
    const [kind, n] = FMT_INT[c];
    const dv = new DataView(b.buffer, b.byteOffset + i, n);
    let v;
    if (kind === 'Uint8') v = dv.getUint8(0);
    else if (kind === 'Uint16') v = dv.getUint16(0, false);
    else if (kind === 'Uint32') v = dv.getUint32(0, false);
    else if (kind === 'BigUint64') v = dv.getBigUint64(0, false);
    else if (kind === 'Int8') v = dv.getInt8(0);
    else if (kind === 'Int16') v = dv.getInt16(0, false);
    else if (kind === 'Int32') v = dv.getInt32(0, false);
    else v = dv.getBigInt64(0, false);
    return [v, i + n];
  }
  for (const [base, lb] of [[0xd9, 1], [0xda, 2], [0xdb, 4]]) {
    if (c === base) { const n = Number(readUint(b, i, lb)); i += lb; return [decodeUtf8(b.subarray(i, i + n)), i + n]; }
  }
  for (const [base, lb] of [[0xc4, 1], [0xc5, 2], [0xc6, 4]]) {
    if (c === base) { const n = Number(readUint(b, i, lb)); i += lb; return [bytesToHex(b.subarray(i, i + n)), i + n]; }
  }
  if (c === 0xdc || c === 0xdd) { const lb = c === 0xdc ? 2 : 4; const n = Number(readUint(b, i, lb)); return arr(b, i + lb, n); }
  if (c === 0xde || c === 0xdf) { const lb = c === 0xde ? 2 : 4; const n = Number(readUint(b, i, lb)); return mp(b, i + lb, n); }
  throw new Error(`Unsupported MessagePack type 0x${c.toString(16).padStart(2, '0')}`);
}

function arr(b, i, n) {
  const out = [];
  for (let k = 0; k < n; k++) { const [v, ni] = dec(b, i); out.push(v); i = ni; }
  return [out, i];
}

function mp(b, i, n) {
  const out = {};
  for (let k = 0; k < n; k++) {
    const [k1, ni1] = dec(b, i);
    const [v1, ni2] = dec(b, ni1);
    out[k1 instanceof Flt ? String(k1.v) : String(k1)] = v1;
    i = ni2;
  }
  return [out, i];
}

module('From MessagePack', 'Decodes MessagePack to JSON.', [], (data) => stringifyTyped(dec(data)[0], 4));
