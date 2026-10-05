import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

function varint(b, i) {
  let n = 0n, shift = 0n;
  while (true) {
    const c = b[i]; i++;
    n |= BigInt(c & 0x7f) << shift;
    if (!(c & 0x80)) return [n, i];
    shift += 7n;
  }
}

function isPrintable(s) {
  if (s.length === 0) return true;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20 || (cp >= 0x7f && cp <= 0xa0) || cp === 0xad) return false;
  }
  return true;
}

function parse(b, depth = 0) {
  const out = {};
  let i = 0;
  while (i < b.length) {
    let key; [key, i] = varint(b, i);
    const field = Number(key >> 3n), wt = Number(key & 7n);
    let v;
    if (wt === 0) { [v, i] = varint(b, i); }
    else if (wt === 1) {
      const dv = new DataView(b.buffer, b.byteOffset + i, 8);
      v = dv.getBigUint64(0, true);
      i += 8;
    } else if (wt === 5) {
      const dv = new DataView(b.buffer, b.byteOffset + i, 4);
      v = dv.getUint32(0, true);
      i += 4;
    } else if (wt === 2) {
      let ln; [ln, i] = varint(b, i);
      const len = Number(ln);
      const raw = b.subarray(i, i + len);
      i += len;
      v = null;
      if (depth < 6 && raw.length) {
        try { v = parse(raw, depth + 1); } catch { v = null; }
      }
      if (v === null) {
        try {
          const s = new TextDecoder('utf-8', { fatal: true }).decode(raw);
          v = isPrintable(s) ? s : hexSep(raw);
        } catch { v = hexSep(raw); }
      }
    } else {
      throw new Error(`Unsupported wire type ${wt}`);
    }
    const k = String(field);
    if (k in out) out[k] = Array.isArray(out[k]) ? [...out[k], v] : [out[k], v];
    else out[k] = v;
  }
  return out;
}

function stringify(obj) {
  return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? `@@BIGINT:${v}@@` : v, 2)
    .replace(/"@@BIGINT:(-?\d+)@@"/g, '$1');
}

module('Protobuf Decode', 'Decodes a protobuf message without a schema (field numbers -> values, nested messages guessed).', [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    return stringify(parse(b));
  });
