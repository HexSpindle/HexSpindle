import { module } from './_cat.js';
import { encodeUtf8, concatBytes } from '../../core/util.js';
import { Flt, parseJsonTyped } from './_json.js';

function packUint(n) {
  if (n < 0x100n) return new Uint8Array([0xcc, Number(n)]);
  if (n < 0x10000n) { const b = new Uint8Array(3); b[0] = 0xcd; new DataView(b.buffer).setUint16(1, Number(n)); return b; }
  if (n < 0x100000000n) { const b = new Uint8Array(5); b[0] = 0xce; new DataView(b.buffer).setUint32(1, Number(n)); return b; }
  const b = new Uint8Array(9); b[0] = 0xcf; new DataView(b.buffer).setBigUint64(1, n); return b;
}
function packInt(n) {
  if (n >= -128n && n < 128n) { const b = new Uint8Array(2); b[0] = 0xd0; new DataView(b.buffer).setInt8(1, Number(n)); return b; }
  if (n >= -32768n && n < 32768n) { const b = new Uint8Array(3); b[0] = 0xd1; new DataView(b.buffer).setInt16(1, Number(n)); return b; }
  if (n >= -2147483648n && n < 2147483648n) { const b = new Uint8Array(5); b[0] = 0xd2; new DataView(b.buffer).setInt32(1, Number(n)); return b; }
  const b = new Uint8Array(9); b[0] = 0xd3; new DataView(b.buffer).setBigInt64(1, n); return b;
}

function enc(o) {
  if (o === null || o === undefined) return new Uint8Array([0xc0]);
  if (o === true) return new Uint8Array([0xc3]);
  if (o === false) return new Uint8Array([0xc2]);
  if (typeof o === 'number' || typeof o === 'bigint') {
    const n = typeof o === 'bigint' ? o : BigInt(o);
    if (n >= 0n && n < 128n) return new Uint8Array([Number(n)]);
    if (n >= -32n && n < 0n) return new Uint8Array([Number(n & 0xffn)]);
    if (n >= 0n) return packUint(n);
    return packInt(n);
  }
  if (o instanceof Flt) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, o.v, false);
    return concatBytes([new Uint8Array([0xcb]), new Uint8Array(buf)]);
  }
  if (typeof o === 'string') {
    const b = encodeUtf8(o);
    const n = b.length;
    if (n < 32) return concatBytes([new Uint8Array([0xa0 | n]), b]);
    if (n < 256) return concatBytes([new Uint8Array([0xd9, n]), b]);
    if (n < 65536) { const h = new Uint8Array(3); h[0] = 0xda; new DataView(h.buffer).setUint16(1, n); return concatBytes([h, b]); }
    const h = new Uint8Array(5); h[0] = 0xdb; new DataView(h.buffer).setUint32(1, n); return concatBytes([h, b]);
  }
  if (Array.isArray(o)) {
    const n = o.length;
    let h;
    if (n < 16) h = new Uint8Array([0x90 | n]);
    else if (n < 65536) { h = new Uint8Array(3); h[0] = 0xdc; new DataView(h.buffer).setUint16(1, n); }
    else { h = new Uint8Array(5); h[0] = 0xdd; new DataView(h.buffer).setUint32(1, n); }
    return concatBytes([h, ...o.map(enc)]);
  }
  if (typeof o === 'object') {
    const entries = Object.entries(o);
    const n = entries.length;
    let h;
    if (n < 16) h = new Uint8Array([0x80 | n]);
    else if (n < 65536) { h = new Uint8Array(3); h[0] = 0xde; new DataView(h.buffer).setUint16(1, n); }
    else { h = new Uint8Array(5); h[0] = 0xdf; new DataView(h.buffer).setUint32(1, n); }
    return concatBytes([h, ...entries.flatMap(([k, v]) => [enc(k), enc(v)])]);
  }
  throw new TypeError('Unsupported type');
}

module('To MessagePack', 'Encodes JSON as MessagePack.', [], (t) => enc(parseJsonTyped(t)), { text: true });
