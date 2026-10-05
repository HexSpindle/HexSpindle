import { module } from './_cat.js';
import { encodeUtf8, concatBytes } from '../../core/util.js';

function head(major, n) {
  n = typeof n === 'bigint' ? n : BigInt(n);
  if (n < 24n) return new Uint8Array([(major << 5) | Number(n)]);
  if (n < 256n) return new Uint8Array([(major << 5) | 24, Number(n)]);
  if (n < 65536n) { const b = new Uint8Array(3); b[0] = (major << 5) | 25; new DataView(b.buffer).setUint16(1, Number(n)); return b; }
  if (n < 4294967296n) { const b = new Uint8Array(5); b[0] = (major << 5) | 26; new DataView(b.buffer).setUint32(1, Number(n)); return b; }
  const b = new Uint8Array(9); b[0] = (major << 5) | 27; new DataView(b.buffer).setBigUint64(1, n); return b;
}

function halfToUint(v) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, v, false);
  const u = dv.getUint32(0, false);
  if ((u & 8191) !== 0) return null;
  let r = u >> 16 & 32768;
  const e = u >> 23 & 255, m = u & 8388607;
  if (!(e === 0 && m === 0)) {
    if (e >= 113 && e <= 142) r += (e - 112 << 10) + (m >> 13);
    else if (e >= 103 && e < 113) { if (m & (1 << 126 - e) - 1) return null; r += m + 8388608 >> 126 - e; }
    else if (e === 255) { r |= 31744; r |= m >> 13; }
    else return null;
  }
  return r;
}

function encFloat(v) {
  if (Number.isNaN(v)) return new Uint8Array([0xf9, 0x7e, 0x00]);
  if (Math.fround(v) === v) {
    const h = halfToUint(v);
    if (h !== null) return new Uint8Array([0xf9, h >> 8, h & 255]);
    const b = new Uint8Array(5); b[0] = 0xfa; new DataView(b.buffer).setFloat32(1, v, false); return b;
  }
  const b = new Uint8Array(9); b[0] = 0xfb; new DataView(b.buffer).setFloat64(1, v, false); return b;
}

function cmpBytes(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function enc(o) {
  if (o === null || o === undefined) return new Uint8Array([0xf6]);
  if (o === true) return new Uint8Array([0xf5]);
  if (o === false) return new Uint8Array([0xf4]);
  if (typeof o === 'number') {
    if (Number.isSafeInteger(o) && !Object.is(o, -0)) return o >= 0 ? head(0, o) : head(1, -1 - o);
    return encFloat(o);
  }
  if (typeof o === 'string') {
    const b = encodeUtf8(o);
    return concatBytes([head(3, b.length), b]);
  }
  if (Array.isArray(o)) return concatBytes([head(4, o.length), ...o.map(enc)]);
  if (typeof o === 'object') {
    const entries = Object.entries(o).map(([k, v]) => [enc(k), v]).sort((a, b) => cmpBytes(a[0], b[0]));
    return concatBytes([head(5, entries.length), ...entries.flatMap(([k, v]) => [k, enc(v)])]);
  }
  throw new TypeError(`Cannot CBOR-encode ${typeof o}`);
}

module('CBOR Encode', 'Encodes JSON as CBOR (RFC 8949).', [], (t) => enc(JSON.parse(t)), { text: true });
