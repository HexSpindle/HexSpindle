import { module } from './_cat.js';
import { base64Decode, decodeUtf8 } from '../../core/util.js';

function pyBytesRepr(bytes) {
  let out = "b'";
  for (const b of bytes) {
    if (b === 0x5c) out += '\\\\';
    else if (b === 0x27) out += "\\'";
    else if (b === 0x09) out += '\\t';
    else if (b === 0x0a) out += '\\n';
    else if (b === 0x0d) out += '\\r';
    else if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
    else out += '\\x' + b.toString(16).padStart(2, '0');
  }
  return out + "'";
}

function pyDateStr(d, micro = 0) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return micro ? `${base}.${String(micro).padStart(6, '0')}` : base;
}

const BPLIST_MAGIC = 'bplist00';

function parseBinaryPlist(data) {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const trailer = data.subarray(data.length - 32);
  const tdv = new DataView(trailer.buffer, trailer.byteOffset, trailer.byteLength);
  const offsetIntSize = tdv.getUint8(6);
  const objectRefSize = tdv.getUint8(7);
  const numObjects = Number(tdv.getBigUint64(8));
  const topObject = Number(tdv.getBigUint64(16));
  const offsetTableOffset = Number(tdv.getBigUint64(24));

  function readUint(offset, size) {
    let v = 0n;
    for (let i = 0; i < size; i++) v = (v << 8n) | BigInt(dv.getUint8(offset + i));
    return v;
  }
  const offsetTable = [];
  for (let i = 0; i < numObjects; i++) offsetTable.push(Number(readUint(offsetTableOffset + i * offsetIntSize, offsetIntSize)));

  function readCount(offset, nibble) {
    if (nibble !== 0x0f) return [nibble, offset];
    const intMarker = dv.getUint8(offset);
    const sizeNibble = intMarker & 0x0f;
    const size = 1 << sizeNibble;
    const n = Number(readUint(offset + 1, size));
    return [n, offset + 1 + size];
  }

  const cache = new Map();
  function readObject(idx) {
    if (cache.has(idx)) return cache.get(idx);
    const offset = offsetTable[idx];
    const marker = dv.getUint8(offset);
    const type = marker & 0xf0, nibble = marker & 0x0f;
    let result;
    if (type === 0x00) {
      result = nibble === 0x08 ? false : nibble === 0x09 ? true : null;
    } else if (type === 0x10) {
      const size = 1 << nibble;
      if (size === 8) {
        let v = readUint(offset + 1, 8);
        if (v >= (1n << 63n)) v -= (1n << 64n); // 8-byte ints are signed two's complement
        result = Number(v);
      } else {
        result = Number(readUint(offset + 1, size));
      }
    } else if (type === 0x20) {
      const size = 1 << nibble;
      result = size === 4 ? dv.getFloat32(offset + 1) : dv.getFloat64(offset + 1);
    } else if (type === 0x30) {
      const secsSince2001 = dv.getFloat64(offset + 1);
      const ms = (secsSince2001 + 978307200) * 1000;
      result = pyDateStr(new Date(Math.floor(ms / 1000) * 1000), Math.round((ms - Math.floor(ms / 1000) * 1000) * 1000));
    } else if (type === 0x40) {
      const [count, dataStart] = readCount(offset + 1, nibble);
      result = pyBytesRepr(data.subarray(dataStart, dataStart + count));
    } else if (type === 0x50) {
      const [count, dataStart] = readCount(offset + 1, nibble);
      let s = '';
      for (let i = 0; i < count; i++) s += String.fromCharCode(dv.getUint8(dataStart + i));
      result = s;
    } else if (type === 0x60) {
      const [count, dataStart] = readCount(offset + 1, nibble);
      let s = '';
      for (let i = 0; i < count; i++) s += String.fromCharCode(dv.getUint16(dataStart + i * 2));
      result = s;
    } else if (type === 0x80) {
      const size = nibble + 1;
      result = Number(readUint(offset + 1, size));
    } else if (type === 0xa0 || type === 0xc0) {
      const [count, refStart] = readCount(offset + 1, nibble);
      result = [];
      cache.set(idx, result);
      for (let i = 0; i < count; i++) result.push(readObject(Number(readUint(refStart + i * objectRefSize, objectRefSize))));
      return result;
    } else if (type === 0xd0) {
      const [count, refStart] = readCount(offset + 1, nibble);
      const keyRefs = [], valRefs = [];
      for (let i = 0; i < count; i++) keyRefs.push(Number(readUint(refStart + i * objectRefSize, objectRefSize)));
      const valStart = refStart + count * objectRefSize;
      for (let i = 0; i < count; i++) valRefs.push(Number(readUint(valStart + i * objectRefSize, objectRefSize)));
      result = {};
      cache.set(idx, result);
      for (let i = 0; i < count; i++) result[readObject(keyRefs[i])] = readObject(valRefs[i]);
      return result;
    } else {
      throw new Error(`Unsupported bplist object type 0x${type.toString(16)}`);
    }
    cache.set(idx, result);
    return result;
  }
  return readObject(topObject);
}

function parseXmlNode(el) {
  const tag = el.tagName;
  if (tag === 'dict') {
    const out = {};
    const children = [...el.children];
    for (let i = 0; i < children.length; i += 2) out[children[i].textContent] = parseXmlNode(children[i + 1]);
    return out;
  }
  if (tag === 'array') return [...el.children].map(parseXmlNode);
  if (tag === 'string') return el.textContent;
  if (tag === 'integer') return parseInt(el.textContent.trim(), 10);
  if (tag === 'real') return parseFloat(el.textContent.trim());
  if (tag === 'true') return true;
  if (tag === 'false') return false;
  if (tag === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z?$/.exec(el.textContent.trim());
    if (!m) throw new Error(`Invalid <date>: ${el.textContent}`);
    const [, y, mo, d, h, mi, se, frac] = m;
    const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
    const micro = frac ? Math.round(Number('0.' + frac) * 1e6) : 0;
    return pyDateStr(date, micro);
  }
  if (tag === 'data') return pyBytesRepr(base64Decode(el.textContent.replace(/\s+/g, '')));
  throw new Error(`Unsupported plist element <${tag}>`);
}

function toJson(v, indent = '') {
  const next = indent + '  ';
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return '[\n' + v.map(x => next + toJson(x, next)).join(',\n') + '\n' + indent + ']';
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  return '{\n' + keys.map(k => `${next}${JSON.stringify(k)}: ${toJson(v[k], next)}`).join(',\n') + '\n' + indent + '}';
}

module('P-list Viewer', 'Parses an Apple property list (binary or XML .plist) and shows it as JSON.', [],
  (data) => {
    try {
      let obj;
      if (data.length >= 8 && decodeUtf8(data.subarray(0, 8)) === BPLIST_MAGIC) {
        obj = parseBinaryPlist(data);
      } else {
        const text = decodeUtf8(data);
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        const err = doc.querySelector('parsererror');
        if (err) throw new Error(err.textContent);
        const plist = doc.documentElement;
        const root = [...plist.children][0];
        obj = root ? parseXmlNode(root) : null;
      }
      return toJson(obj);
    } catch (e) {
      throw new Error(`Not a valid plist: ${e.message}`);
    }
  });
