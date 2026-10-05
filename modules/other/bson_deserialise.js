import { module } from './_cat.js';
import { decodeUtf8, bytesToHex } from '../../core/util.js';

class Dbl { constructor(v) { this.v = v; } }

function readCString(bytes, offset) {
  let end = offset;
  while (bytes[end] !== 0) end++;
  return [decodeUtf8(bytes.subarray(offset, end)), end + 1];
}
function readString(dv, bytes, offset) {
  const len = dv.getInt32(offset, true);
  const str = decodeUtf8(bytes.subarray(offset + 4, offset + 4 + len - 1));
  return [str, offset + 4 + len];
}

function pyBytesRepr(bytes) {
  const hasSingle = [...bytes].some(b => b === 39);
  const hasDouble = [...bytes].some(b => b === 34);
  const quote = hasSingle && !hasDouble ? '"' : "'";
  const qc = quote.charCodeAt(0);
  let out = 'b' + quote;
  for (const b of bytes) {
    if (b === 92) out += '\\\\';
    else if (b === qc) out += '\\' + quote;
    else if (b === 10) out += '\\n';
    else if (b === 13) out += '\\r';
    else if (b === 9) out += '\\t';
    else if (b >= 32 && b < 127) out += String.fromCharCode(b);
    else out += '\\x' + b.toString(16).padStart(2, '0');
  }
  return out + quote;
}

function formatDatetime(ms) {
  const n = Number(ms);
  const d = new Date(n);
  const p2 = x => String(x).padStart(2, '0');
  let s = `${String(d.getUTCFullYear()).padStart(4, '0')}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
  const micros = (((n % 1000) + 1000) % 1000) * 1000;
  if (micros) s += '.' + String(micros).padStart(6, '0');
  return s;
}

function decodeDocument(bytes, dv, offset) {
  const totalLen = dv.getInt32(offset, true);
  let pos = offset + 4;
  const end = offset + totalLen;
  const obj = {};
  while (pos < end - 1) {
    const type = bytes[pos]; pos++;
    const [name, p2] = readCString(bytes, pos); pos = p2;
    const [value, p3] = decodeValue(type, bytes, dv, pos); pos = p3;
    obj[name] = value;
  }
  return [obj, offset + totalLen];
}

function decodeValue(type, bytes, dv, pos) {
  switch (type) {
    case 0x01: { const v = dv.getFloat64(pos, true); return [new Dbl(v), pos + 8]; }
    case 0x02: return readString(dv, bytes, pos);
    case 0x03: return decodeDocument(bytes, dv, pos);
    case 0x04: { const [obj, end] = decodeDocument(bytes, dv, pos); return [Object.values(obj), end]; }
    case 0x05: {
      const len = dv.getInt32(pos, true);
      const data = bytes.subarray(pos + 5, pos + 5 + len);
      return [pyBytesRepr(data), pos + 5 + len];
    }
    case 0x06: return [null, pos];
    case 0x07: return [bytesToHex(bytes.subarray(pos, pos + 12)), pos + 12];
    case 0x08: return [bytes[pos] !== 0, pos + 1];
    case 0x09: { const ms = dv.getBigInt64(pos, true); return [formatDatetime(ms), pos + 8]; }
    case 0x0a: return [null, pos];
    case 0x0b: { const [pattern, p2] = readCString(bytes, pos); const [opts, p3] = readCString(bytes, p2); return [`/${pattern}/${opts}`, p3]; }
    case 0x0c: { const [ns, p2] = readString(dv, bytes, pos); const oid = bytesToHex(bytes.subarray(p2, p2 + 12)); return [`DBPointer(${ns}, ${oid})`, p2 + 12]; }
    case 0x0d: return readString(dv, bytes, pos);
    case 0x0e: return readString(dv, bytes, pos);
    case 0x0f: {
      const total = dv.getInt32(pos, true);
      const [code] = readString(dv, bytes, pos + 4);
      return [code, pos + total];
    }
    case 0x10: return [dv.getInt32(pos, true), pos + 4];
    case 0x11: { const inc = dv.getUint32(pos, true); const ts = dv.getUint32(pos + 4, true); return [`Timestamp(${ts}, ${inc})`, pos + 8]; }
    case 0x12: {
      const big = dv.getBigInt64(pos, true);
      const safe = big >= -9007199254740991n && big <= 9007199254740991n;
      return [safe ? Number(big) : big, pos + 8];
    }
    case 0x13: return [`Decimal128(${bytesToHex(bytes.subarray(pos, pos + 16))})`, pos + 16];
    case 0x7f: return ['MaxKey()', pos];
    case 0xff: return ['MinKey()', pos];
    default: throw new Error(`Unsupported BSON type: 0x${type.toString(16)}`);
  }
}

function formatDouble(n) {
  if (Number.isNaN(n)) return 'NaN';
  if (n === Infinity) return 'Infinity';
  if (n === -Infinity) return '-Infinity';
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

function toJson(v, lvl, indent) {
  const ind = n => ' '.repeat(indent * n);
  if (v instanceof Dbl) return formatDouble(v.v);
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : formatDouble(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const items = v.map(x => ind(lvl + 1) + toJson(x, lvl + 1, indent));
    return '[\n' + items.join(',\n') + '\n' + ind(lvl) + ']';
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  const items = keys.map(k => ind(lvl + 1) + JSON.stringify(k) + ': ' + toJson(v[k], lvl + 1, indent));
  return '{\n' + items.join(',\n') + '\n' + ind(lvl) + '}';
}

module('BSON deserialise', 'Decodes BSON (the binary format used by MongoDB) to JSON.', [],
  (data) => {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const [obj] = decodeDocument(data, dv, 0);
    return toJson(obj, 0, 2);
  });
