import { encodeUtf8, decodeUtf8, bytesToHex } from '../../core/util.js';

/* ---------------- AMF0 ---------------- */

function amf0WriteU16(bytes, n) { bytes.push((n >> 8) & 0xff, n & 0xff); }
function amf0WriteU32(bytes, n) { bytes.push((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff); }
function amf0WriteDouble(bytes, num) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, num, false);
  for (const b of new Uint8Array(buf)) bytes.push(b);
}
function amf0WriteString16(bytes, str) {
  const b = encodeUtf8(str);
  amf0WriteU16(bytes, b.length);
  for (const x of b) bytes.push(x);
}

function encodeAMF0Value(bytes, value) {
  if (value === null) { bytes.push(0x05); return; }
  if (value === undefined) { bytes.push(0x06); return; }
  if (typeof value === 'boolean') { bytes.push(0x01, value ? 1 : 0); return; }
  if (typeof value === 'number') { bytes.push(0x00); amf0WriteDouble(bytes, value); return; }
  if (typeof value === 'string') {
    if (value.length > 0xffff) {
      bytes.push(0x0c);
      const b = encodeUtf8(value);
      amf0WriteU32(bytes, b.length);
      for (const x of b) bytes.push(x);
    } else {
      bytes.push(0x02);
      amf0WriteString16(bytes, value);
    }
    return;
  }
  if (value instanceof Date) { bytes.push(0x0b); amf0WriteDouble(bytes, value.getTime()); bytes.push(0, 0); return; }
  if (Array.isArray(value)) {
    bytes.push(0x0a);
    amf0WriteU32(bytes, value.length);
    for (const v of value) encodeAMF0Value(bytes, v);
    return;
  }
  if (typeof value === 'object') {
    bytes.push(0x03);
    for (const k of Object.keys(value)) { amf0WriteString16(bytes, k); encodeAMF0Value(bytes, value[k]); }
    bytes.push(0, 0, 0x09);
    return;
  }
  throw new Error(`Cannot encode a value of type "${typeof value}" to AMF0`);
}

export function encodeAMF0(value) {
  const bytes = [];
  encodeAMF0Value(bytes, value);
  return new Uint8Array(bytes);
}

function amf0ReadU16(b, i) { return (b[i] << 8) | b[i + 1]; }
function amf0ReadU32(b, i) { return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; }
function amf0ReadDouble(b, i) { return new DataView(b.buffer, b.byteOffset + i, 8).getFloat64(0, false); }

function amf0ReadPropertyList(b, j, refs) {
  const obj = {};
  while (true) {
    const klen = amf0ReadU16(b, j);
    if (klen === 0 && b[j + 2] === 0x09) { j += 3; break; }
    const key = decodeUtf8(b.subarray(j + 2, j + 2 + klen));
    j += 2 + klen;
    const [val, nj] = decodeAMF0Value(b, j, refs);
    obj[key] = val;
    j = nj;
  }
  return [obj, j];
}

function decodeAMF0Value(b, i, refs) {
  if (i >= b.length) throw new Error('Unexpected end of AMF0 data');
  const marker = b[i];
  i++;
  switch (marker) {
    case 0x00: return [amf0ReadDouble(b, i), i + 8];
    case 0x01: return [!!b[i], i + 1];
    case 0x02: { const len = amf0ReadU16(b, i); return [decodeUtf8(b.subarray(i + 2, i + 2 + len)), i + 2 + len]; }
    case 0x03: { const [obj, j] = amf0ReadPropertyList(b, i, refs); refs.push(obj); return [obj, j]; }
    case 0x05: return [null, i];
    case 0x06: return [undefined, i];
    case 0x07: { const idx = amf0ReadU16(b, i); return [refs[idx], i + 2]; }
    case 0x08: { const [obj, j] = amf0ReadPropertyList(b, i + 4, refs); refs.push(obj); return [obj, j]; }
    case 0x0a: {
      const n = amf0ReadU32(b, i);
      let j = i + 4;
      const arr = [];
      for (let k = 0; k < n; k++) { const [val, nj] = decodeAMF0Value(b, j, refs); arr.push(val); j = nj; }
      refs.push(arr);
      return [arr, j];
    }
    case 0x0b: { const ms = amf0ReadDouble(b, i); return [new Date(ms), i + 10]; }
    case 0x0c: { const len = amf0ReadU32(b, i); return [decodeUtf8(b.subarray(i + 4, i + 4 + len)), i + 4 + len]; }
    case 0x0f: { const len = amf0ReadU32(b, i); return [decodeUtf8(b.subarray(i + 4, i + 4 + len)), i + 4 + len]; }
    case 0x10: {
      const clen = amf0ReadU16(b, i);
      const className = decodeUtf8(b.subarray(i + 2, i + 2 + clen));
      const [obj, j] = amf0ReadPropertyList(b, i + 2 + clen, refs);
      obj.__className = className;
      refs.push(obj);
      return [obj, j];
    }
    default:
      throw new Error(`Unsupported AMF0 type marker 0x${marker.toString(16).padStart(2, '0')}`);
  }
}

export function decodeAMF0(bytes) {
  if (!bytes.length) throw new Error('Please provide an input.');
  const refs = [];
  const [value] = decodeAMF0Value(bytes, 0, refs);
  return value;
}

/* ---------------- AMF3 ---------------- */

function u29Bytes(value) {
  const bytes = [];
  if (value >= 0x200000) bytes.push(0x80 | ((value >> 21) & 0x7f), 0x80 | ((value >> 14) & 0x7f), 0x80 | ((value >> 7) & 0x7f), value & 0xff);
  else if (value >= 0x4000) bytes.push(0x80 | ((value >> 14) & 0x7f), 0x80 | ((value >> 7) & 0x7f), value & 0x7f);
  else if (value >= 0x80) bytes.push(0x80 | ((value >> 7) & 0x7f), value & 0x7f);
  else bytes.push(value & 0x7f);
  return bytes;
}

function amf3WriteString(bytes, str) {
  const b = encodeUtf8(str);
  for (const x of u29Bytes((b.length << 1) | 1)) bytes.push(x);
  for (const x of b) bytes.push(x);
}

function amf3WriteDouble(bytes, num) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, num, false);
  for (const b of new Uint8Array(buf)) bytes.push(b);
}

function encodeAMF3Value(bytes, value) {
  if (value === undefined) { bytes.push(0x00); return; }
  if (value === null) { bytes.push(0x01); return; }
  if (value === false) { bytes.push(0x02); return; }
  if (value === true) { bytes.push(0x03); return; }
  if (typeof value === 'number') { bytes.push(0x05); amf3WriteDouble(bytes, value); return; }
  if (typeof value === 'string') { bytes.push(0x06); amf3WriteString(bytes, value); return; }
  if (value instanceof Date) { bytes.push(0x08); for (const x of u29Bytes(1)) bytes.push(x); amf3WriteDouble(bytes, value.getTime()); return; }
  if (Array.isArray(value)) {
    bytes.push(0x09);
    for (const x of u29Bytes((value.length << 1) | 1)) bytes.push(x);
    bytes.push(0x01); // empty associative-part terminator: literal empty-string key
    for (const v of value) encodeAMF3Value(bytes, v);
    return;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    bytes.push(0x0a);
    for (const x of u29Bytes((keys.length << 4) | 0x03)) bytes.push(x); // literal traits, sealed (not dynamic), not externalizable
    amf3WriteString(bytes, ''); // anonymous class name
    for (const k of keys) amf3WriteString(bytes, k);
    for (const k of keys) encodeAMF3Value(bytes, value[k]);
    return;
  }
  throw new Error(`Cannot encode a value of type "${typeof value}" to AMF3`);
}

export function encodeAMF3(value) {
  const bytes = [];
  encodeAMF3Value(bytes, value);
  return new Uint8Array(bytes);
}

function u29Read(b, i) {
  let byte1 = b[i++];
  if (!(byte1 & 0x80)) return [byte1, i];
  let byte2 = b[i++];
  if (!(byte2 & 0x80)) return [((byte1 & 0x7f) << 7) | byte2, i];
  let byte3 = b[i++];
  if (!(byte3 & 0x80)) return [((byte1 & 0x7f) << 14) | ((byte2 & 0x7f) << 7) | byte3, i];
  let byte4 = b[i++];
  return [((byte1 & 0x7f) << 21) | ((byte2 & 0x7f) << 14) | ((byte3 & 0x7f) << 7) | byte4, i];
}

function amf3ReadString(b, i, strings) {
  const [lenOrRef, ni] = u29Read(b, i);
  if ((lenOrRef & 1) === 0) return [strings[lenOrRef >> 1], ni];
  const len = lenOrRef >> 1;
  const s = decodeUtf8(b.subarray(ni, ni + len));
  if (s !== '') strings.push(s);
  return [s, ni + len];
}

function decodeAMF3Value(b, i, ctx) {
  if (i >= b.length) throw new Error('Unexpected end of AMF3 data');
  const marker = b[i];
  i++;
  switch (marker) {
    case 0x00: return [undefined, i];
    case 0x01: return [null, i];
    case 0x02: return [false, i];
    case 0x03: return [true, i];
    case 0x04: {
      const [raw, ni] = u29Read(b, i);
      return [raw >= 0x10000000 ? raw - 0x20000000 : raw, ni];
    }
    case 0x05: return [new DataView(b.buffer, b.byteOffset + i, 8).getFloat64(0, false), i + 8];
    case 0x06: case 0x07: case 0x0b: return amf3ReadString(b, i, ctx.strings);
    case 0x08: {
      const [indicator, ni] = u29Read(b, i);
      if ((indicator & 1) === 0) return [ctx.objects[indicator >> 1], ni];
      const ms = new DataView(b.buffer, b.byteOffset + ni, 8).getFloat64(0, false);
      const d = new Date(ms);
      ctx.objects.push(d);
      return [d, ni + 8];
    }
    case 0x09: {
      const [lenOrRef, ni] = u29Read(b, i);
      if ((lenOrRef & 1) === 0) return [ctx.objects[lenOrRef >> 1], ni];
      const denseLen = lenOrRef >> 1;
      const arr = [];
      ctx.objects.push(arr);
      let j = ni;
      const assoc = {};
      let hasAssoc = false;
      while (true) {
        const [key, nj] = amf3ReadString(b, j, ctx.strings);
        if (key === '') { j = nj; break; }
        hasAssoc = true;
        const [val, nj2] = decodeAMF3Value(b, nj, ctx);
        assoc[key] = val;
        j = nj2;
      }
      for (let k = 0; k < denseLen; k++) { const [val, nj] = decodeAMF3Value(b, j, ctx); arr.push(val); j = nj; }
      if (hasAssoc) for (const k of Object.keys(assoc)) arr[k] = assoc[k]; // non-index keys are dropped by JSON output
      return [arr, j];
    }
    case 0x0a: {
      const [indicator, ni] = u29Read(b, i);
      if ((indicator & 1) === 0) return [ctx.objects[indicator >> 1], ni];
      if ((indicator & 0x4) === 0x4) throw new Error('Externalizable AMF3 objects are not supported');
      let j = ni, traits;
      if ((indicator & 0x2) === 0) {
        traits = ctx.traits[indicator >> 2];
        if (!traits) throw new Error('Invalid AMF3 traits reference');
      } else {
        const sealedCount = indicator >>> 4;
        const [className, nj] = amf3ReadString(b, j, ctx.strings);
        j = nj;
        const sealedMemberNames = [];
        for (let k = 0; k < sealedCount; k++) { const [name, nj2] = amf3ReadString(b, j, ctx.strings); sealedMemberNames.push(name); j = nj2; }
        traits = { className, sealedMemberNames, isDynamic: (indicator & 0x8) === 0x8 };
        ctx.traits.push(traits);
      }
      const obj = {};
      ctx.objects.push(obj);
      for (const name of traits.sealedMemberNames) { const [val, nj] = decodeAMF3Value(b, j, ctx); obj[name] = val; j = nj; }
      if (traits.isDynamic) {
        while (true) {
          const [key, nj] = amf3ReadString(b, j, ctx.strings);
          if (key === '') { j = nj; break; }
          const [val, nj2] = decodeAMF3Value(b, nj, ctx);
          obj[key] = val;
          j = nj2;
        }
      }
      if (traits.className) obj.__className = traits.className;
      return [obj, j];
    }
    case 0x0c: {
      const [lenOrRef, ni] = u29Read(b, i);
      if ((lenOrRef & 1) === 0) return [ctx.objects[lenOrRef >> 1], ni];
      const len = lenOrRef >> 1;
      const hex = bytesToHex(b.subarray(ni, ni + len));
      ctx.objects.push(hex);
      return [hex, ni + len];
    }
    default:
      throw new Error(`Unsupported AMF3 type marker 0x${marker.toString(16).padStart(2, '0')}`);
  }
}

export function decodeAMF3(bytes) {
  if (!bytes.length) throw new Error('Please provide an input.');
  const ctx = { strings: [], objects: [], traits: [] };
  const [value] = decodeAMF3Value(bytes, 0, ctx);
  return value;
}
