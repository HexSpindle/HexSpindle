import { parseHex, bytesToHex, concatBytes, encodeUtf8, decodeUtf8, decodeLatin1 } from '../../core/util.js';

export const CLASS_NAMES = ['UNIVERSAL', 'APPLICATION', 'CONTEXT', 'PRIVATE'];
export const UNIVERSAL_TYPE_NAMES = {
  1: 'BOOLEAN', 2: 'INTEGER', 3: 'BIT STRING', 4: 'OCTET STRING', 5: 'NULL', 6: 'OBJECT IDENTIFIER',
  10: 'ENUMERATED', 12: 'UTF8String', 16: 'SEQUENCE', 17: 'SET', 19: 'PrintableString', 20: 'T61String',
  22: 'IA5String', 23: 'UTCTime', 24: 'GeneralizedTime', 30: 'BMPString',
};


function parseOne(bytes, i) {
  const start = i;
  if (i >= bytes.length) throw new Error('ASN.1: unexpected end of data');
  const tagByte = bytes[i++];
  const cls = tagByte >> 6;
  const constructed = !!(tagByte & 0x20);
  let tag = tagByte & 0x1f;
  if (tag === 0x1f) {
    tag = 0;
    let b;
    do { b = bytes[i++]; tag = (tag << 7) | (b & 0x7f); } while (b & 0x80);
  }
  if (i >= bytes.length) throw new Error('ASN.1: truncated length');
  let lenByte = bytes[i++];
  let length;
  if (lenByte & 0x80) {
    const n = lenByte & 0x7f;
    if (n === 0) throw new Error('ASN.1: indefinite length not supported');
    if (i + n > bytes.length) throw new Error('ASN.1: truncated length');
    length = 0;
    for (let k = 0; k < n; k++) length = length * 256 + bytes[i++];
  } else {
    length = lenByte;
  }
  const valueStart = i;
  const valueEnd = i + length;
  if (valueEnd > bytes.length) throw new Error('ASN.1: declared length exceeds available data');
  const node = {
    tagByte, class: cls, constructed, tag,
    start, headerLen: valueStart - start, length, valueStart, end: valueEnd,
    raw: bytes.subarray(start, valueEnd),
  };
  if (constructed) node.children = parseSeq(bytes, valueStart, valueEnd);
  else node.value = bytes.subarray(valueStart, valueEnd);
  return node;
}

/** Parses a run of consecutive TLVs (e.g. the body of a SEQUENCE, or a whole DER document). */
export function parseSeq(bytes, start = 0, end = bytes.length) {
  const out = [];
  let i = start;
  while (i < end) {
    const node = parseOne(bytes, i);
    out.push(node);
    i = node.end;
  }
  return out;
}

/** Parses exactly one TLV starting at `start` and returns it. */
export function parseOneDer(bytes, start = 0) { return parseOne(bytes, start); }

export function typeName(node) {
  if (node.class === 0) return UNIVERSAL_TYPE_NAMES[node.tag] || `[UNIVERSAL ${node.tag}]`;
  return `[${CLASS_NAMES[node.class]} ${node.tag}]`;
}

export function derUint(node) {
  let v = 0n;
  for (const b of node.value) v = (v << 8n) | BigInt(b);
  return v;
}
export function derInt(node) {
  const b = node.value;
  let v = derUint(node);
  if (b.length && (b[0] & 0x80)) v -= 1n << BigInt(b.length * 8);
  return v;
}

export function decodeOid(bytes) {
  if (!bytes.length) throw new Error('ASN.1: empty OID');
  const parts = [Math.floor(bytes[0] / 40), bytes[0] % 40];
  let v = 0n;
  for (let i = 1; i < bytes.length; i++) {
    v = (v << 7n) | BigInt(bytes[i] & 0x7f);
    if (!(bytes[i] & 0x80)) { parts.push(v.toString()); v = 0n; }
  }
  return parts.join('.');
}

export function decodeAsn1Time(node) {
  const s = decodeLatin1(node.value);
  let y, rest;
  if (node.tag === 23) { // UTCTime: YYMMDDHHMM[SS]Z
    y = parseInt(s.slice(0, 2), 10);
    y += y < 50 ? 2000 : 1900;
    rest = s.slice(2);
  } else { // GeneralizedTime: YYYYMMDDHHMM[SS](.f)Z
    y = parseInt(s.slice(0, 4), 10);
    rest = s.slice(4);
  }
  const mo = +rest.slice(0, 2), d = +rest.slice(2, 4), h = +rest.slice(4, 6), mi = +rest.slice(6, 8);
  const sec = /^\d{2}/.test(rest.slice(8, 10)) ? +rest.slice(8, 10) : 0;
  return new Date(Date.UTC(y, mo - 1, d, h, mi, sec));
}


function encodeLength(len) {
  if (len < 0x80) return new Uint8Array([len]);
  let hex = len.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const b = parseHex(hex);
  return concatBytes([new Uint8Array([0x80 | b.length]), b]);
}

export function derTLV(tagByte, content) {
  return concatBytes([new Uint8Array([tagByte]), encodeLength(content.length), content]);
}

export function derSequence(children) { return derTLV(0x30, concatBytes(children)); }
export function derSet(children) { return derTLV(0x31, concatBytes(children)); }

function minimalUnsignedBytes(n) {
  if (n === 0n) return new Uint8Array([0]);
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let b = parseHex(hex);
  if (b[0] & 0x80) b = concatBytes([new Uint8Array([0]), b]);
  return b;
}

export function derInteger(n) {
  const bn = typeof n === 'bigint' ? n : BigInt(n);
  if (bn >= 0n) return derTLV(0x02, minimalUnsignedBytes(bn));
  let bits = bn.toString(2).length;
  let bytesLen = Math.ceil((bits + 1) / 8);
  let mod = 1n << BigInt(bytesLen * 8);
  let v = bn + mod;
  let hex = v.toString(16).padStart(bytesLen * 2, '0');
  return derTLV(0x02, parseHex(hex));
}

/** Pre-encoded raw bytes as a positive INTEGER (used for n/e/etc already given as big-endian bytes). */
export function derIntegerFromBytes(bytes) {
  let b = bytes;
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  b = b.subarray(i);
  if (b.length === 0) b = new Uint8Array([0]);
  if (b[0] & 0x80) b = concatBytes([new Uint8Array([0]), b]);
  return derTLV(0x02, b);
}

export function derBitString(bytes, unusedBits = 0) {
  return derTLV(0x03, concatBytes([new Uint8Array([unusedBits]), bytes]));
}
export function derOctetString(bytes) { return derTLV(0x04, bytes); }
export function derNull() { return derTLV(0x05, new Uint8Array(0)); }
export function derBoolean(b) { return derTLV(0x01, new Uint8Array([b ? 0xff : 0])); }

export function encodeOid(dotted) {
  const p = dotted.trim().split('.').map(x => BigInt(x));
  if (p.length < 2) throw new Error('OID must have at least two arcs');
  const out = [Number(p[0] * 40n + p[1])];
  for (const n0 of p.slice(2)) {
    let n = n0;
    const chunk = [Number(n & 0x7fn)];
    n >>= 7n;
    while (n > 0n) { chunk.push(Number(n & 0x7fn) | 0x80); n >>= 7n; }
    out.push(...chunk.reverse());
  }
  return new Uint8Array(out);
}
export function derOid(dotted) { return derTLV(0x06, encodeOid(dotted)); }

export function derUtf8String(s) { return derTLV(0x0c, encodeUtf8(s)); }
export function derPrintableString(s) { return derTLV(0x13, encodeUtf8(s)); }
export function derIA5String(s) { return derTLV(0x16, encodeUtf8(s)); }

function pad2(n) { return String(n).padStart(2, '0'); }

/** Encodes a JS Date as UTCTime (years 1950-2049) or GeneralizedTime (otherwise), per X.509 rules. */
export function derTime(date) {
  const y = date.getUTCFullYear();
  const s = `${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
  if (y >= 1950 && y < 2050) return derTLV(0x17, encodeUtf8(`${pad2(y % 100)}${s}`));
  return derTLV(0x18, encodeUtf8(`${y}${s}`));
}

/** Explicit, constructed context-specific tag (e.g. certificate [0] version, extensions [3]). */
export function derContext(num, innerTLVs) {
  return derTLV(0xa0 | (num & 0x1f), concatBytes(Array.isArray(innerTLVs) ? innerTLVs : [innerTLVs]));
}
/** Implicit, primitive context-specific tag (e.g. GeneralName dNSName [2]). */
export function derContextPrimitive(num, content) {
  return derTLV(0x80 | (num & 0x1f), content);
}
/** Implicit, constructed context-specific tag (e.g. CSR attributes [0] IMPLICIT SET OF). */
export function derContextConstructed(num, innerTLVs) {
  return derTLV(0xa0 | (num & 0x1f), concatBytes(Array.isArray(innerTLVs) ? innerTLVs : [innerTLVs]));
}

export { bytesToHex, decodeUtf8, decodeLatin1 };
