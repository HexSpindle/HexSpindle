import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex } from './_packet.js';
import { encodeUtf8 } from '../../core/util.js';

function fail(msg, offset) { throw new Error(`${msg} at byte offset ${offset}`); }

/** Raw bytes as one char per byte (true latin1, not windows-1252). */
function bytesToChars(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 20000) s += String.fromCharCode(...u8.subarray(i, i + 20000));
  return s;
}

function parse(b) {
  let i = 0;
  const varint = () => {
    let v = 0n, shift = 0n;
    for (;;) {
      if (i >= b.length) fail('Exhausted Buffer', b.length);
      const c = b[i++];
      v |= BigInt(c & 0x7f) << shift;
      shift += 7n;
      if (!(c & 0x80)) return v;
    }
  };
  const fixed = (n) => {
    if (i + n > b.length) fail('Exhausted Buffer', b.length);
    let v = 0n;
    for (let k = n - 1; k >= 0; k--) v = (v << 8n) | BigInt(b[i + k]);
    i += n;
    return v;
  };
  const out = {};
  while (i < b.length) {
    const fieldOffset = i;
    const wt = b[i] & 7;
    const key = varint();
    const field = String(key >> 3n);
    let v;
    if (wt === 0) v = varint();
    else if (wt === 1) v = fixed(8);
    else if (wt === 5) v = fixed(4);
    else if (wt === 2) {
      const len = Number(varint());
      if (i + len > b.length) fail('Exhausted Buffer', b.length);
      const raw = b.subarray(i, i + len);
      try { v = parse(raw); } catch { v = bytesToChars(raw); }
      i += len;
    } else {
      fail('Unknown type 0x' + wt.toString(16), fieldOffset);
    }
    if (field in out) out[field] = Array.isArray(out[field]) ? [...out[field], v] : [out[field], v];
    else out[field] = v;
  }
  return out;
}

function stringify(obj) {
  return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? `@@BIGINT:${v}@@` : v, 4)
    .replace(/"@@BIGINT:(-?\d+)@@"/g, '$1');
}

function toBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return encodeUtf8(s);
    out[i] = c;
  }
  return out;
}

module('Protobuf Decode', 'Decodes a protobuf message without a schema (field numbers -> values, nested messages guessed).', [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    return toBytes(stringify(parse(b)));
  });
