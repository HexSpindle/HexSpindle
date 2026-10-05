import { module } from './_cat.js';
import { encodeUtf8, concatBytes } from '../../core/util.js';
import { Flt, parseJsonTyped } from './_json.js';

function head(major, n) {
  n = typeof n === 'bigint' ? n : BigInt(n);
  if (n < 24n) return new Uint8Array([(major << 5) | Number(n)]);
  if (n < 256n) return new Uint8Array([(major << 5) | 24, Number(n)]);
  if (n < 65536n) { const b = new Uint8Array(3); b[0] = (major << 5) | 25; new DataView(b.buffer).setUint16(1, Number(n)); return b; }
  if (n < 4294967296n) { const b = new Uint8Array(5); b[0] = (major << 5) | 26; new DataView(b.buffer).setUint32(1, Number(n)); return b; }
  const b = new Uint8Array(9); b[0] = (major << 5) | 27; new DataView(b.buffer).setBigUint64(1, n); return b;
}

function enc(o) {
  if (o === null || o === undefined) return new Uint8Array([0xf6]);
  if (o === true) return new Uint8Array([0xf5]);
  if (o === false) return new Uint8Array([0xf4]);
  if (typeof o === 'number' || typeof o === 'bigint') {
    const n = typeof o === 'bigint' ? o : BigInt(o);
    return n >= 0n ? head(0, n) : head(1, -1n - n);
  }
  if (o instanceof Flt) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, o.v, false);
    return concatBytes([new Uint8Array([0xfb]), new Uint8Array(buf)]);
  }
  if (typeof o === 'string') {
    const b = encodeUtf8(o);
    return concatBytes([head(3, b.length), b]);
  }
  if (Array.isArray(o)) return concatBytes([head(4, o.length), ...o.map(enc)]);
  if (typeof o === 'object') {
    const entries = Object.entries(o);
    return concatBytes([head(5, entries.length), ...entries.flatMap(([k, v]) => [enc(k), enc(v)])]);
  }
  throw new TypeError(`Cannot CBOR-encode ${typeof o}`);
}

module('CBOR Encode', 'Encodes JSON as CBOR (RFC 8949).', [], (t) => enc(parseJsonTyped(t)), { text: true });
