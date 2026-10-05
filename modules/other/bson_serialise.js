import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodeUtf8 } from '../../core/util.js';

function parseJson(text) {
  let i = 0;
  const s = text;
  function ws() { while (i < s.length && /\s/.test(s[i])) i++; }
  function parseValue() {
    ws();
    const c = s[i];
    if (c === '{') return parseObject();
    if (c === '[') return parseArray();
    if (c === '"') return parseString();
    if (s.startsWith('true', i)) { i += 4; return true; }
    if (s.startsWith('false', i)) { i += 5; return false; }
    if (s.startsWith('null', i)) { i += 4; return null; }
    return parseNumber();
  }
  function parseObject() {
    i++; ws();
    const obj = {};
    if (s[i] === '}') { i++; return obj; }
    while (true) {
      ws();
      const key = parseString();
      ws();
      if (s[i] !== ':') throw new Error('Invalid JSON: expected :');
      i++;
      obj[key] = parseValue();
      ws();
      if (s[i] === ',') { i++; continue; }
      if (s[i] === '}') { i++; break; }
      throw new Error('Invalid JSON: expected , or }');
    }
    return obj;
  }
  function parseArray() {
    i++; ws();
    const arr = [];
    if (s[i] === ']') { i++; return arr; }
    while (true) {
      arr.push(parseValue());
      ws();
      if (s[i] === ',') { i++; continue; }
      if (s[i] === ']') { i++; break; }
      throw new Error('Invalid JSON: expected , or ]');
    }
    return arr;
  }
  function parseString() {
    if (s[i] !== '"') throw new Error('Invalid JSON: expected string');
    i++;
    let out = '';
    while (s[i] !== '"') {
      if (i >= s.length) throw new Error('Invalid JSON: unterminated string');
      let c = s[i];
      if (c === '\\') {
        i++;
        const e = s[i];
        if (e === '"') out += '"';
        else if (e === '\\') out += '\\';
        else if (e === '/') out += '/';
        else if (e === 'b') out += '\b';
        else if (e === 'f') out += '\f';
        else if (e === 'n') out += '\n';
        else if (e === 'r') out += '\r';
        else if (e === 't') out += '\t';
        else if (e === 'u') { out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16)); i += 4; }
        else throw new Error('Invalid JSON escape');
        i++;
      } else { out += c; i++; }
    }
    i++;
    return out;
  }
  function parseNumber() {
    const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
    if (!m) throw new Error('Invalid JSON number');
    const raw = m[0];
    i += raw.length;
    if (raw.includes('.') || /[eE]/.test(raw)) return { __double: parseFloat(raw) };
    return { __int: BigInt(raw) };
  }
  const v = parseValue();
  ws();
  if (i !== s.length) throw new Error('Invalid JSON: trailing data');
  return v;
}

function i32le(n) { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, n, true); return b; }
function cstring(name) { const u = encodeUtf8(name); const out = new Uint8Array(u.length + 1); out.set(u); return out; }
function concat(parts) { const total = parts.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(total); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; }

const INT32_MIN = -2147483648n, INT32_MAX = 2147483647n;
const INT64_MIN = -9223372036854775808n, INT64_MAX = 9223372036854775807n;

function encodeInt(bi) {
  if (bi >= INT32_MIN && bi <= INT32_MAX) return { type: 0x10, bytes: i32le(Number(bi)) };
  if (bi >= INT64_MIN && bi <= INT64_MAX) { const b = new Uint8Array(8); new DataView(b.buffer).setBigInt64(0, bi, true); return { type: 0x12, bytes: b }; }
  throw new Error(`BSON can only handle integers up to 8 bytes in size: ${bi}`);
}
function encodeDouble(n) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, n, true); return { type: 0x01, bytes: b }; }
function encodeString(str) { const u = encodeUtf8(str); return concat([i32le(u.length + 1), u, Uint8Array.of(0)]); }

function encodeDocument(entries) {
  const elements = entries.map(([name, val]) => {
    const { type, bytes } = encodeVal(val);
    return concat([Uint8Array.of(type), cstring(name), bytes]);
  });
  const inner = concat(elements);
  return concat([i32le(4 + inner.length + 1), inner, Uint8Array.of(0)]);
}

function encodeVal(v) {
  if (v === null) return { type: 0x0a, bytes: new Uint8Array(0) };
  if (typeof v === 'boolean') return { type: 0x08, bytes: Uint8Array.of(v ? 1 : 0) };
  if (typeof v === 'string') return { type: 0x02, bytes: encodeString(v) };
  if (Array.isArray(v)) return { type: 0x04, bytes: encodeDocument(v.map((x, i) => [String(i), x])) };
  if (v && typeof v === 'object') {
    if ('__int' in v) return encodeInt(v.__int);
    if ('__double' in v) return encodeDouble(v.__double);
    return { type: 0x03, bytes: encodeDocument(Object.entries(v)) };
  }
  throw new Error('Unsupported JSON value for BSON encoding');
}

function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) && !('__int' in v) && !('__double' in v); }

module('BSON serialise', 'Encodes a JSON object as BSON (the binary format used by MongoDB).',
  [A.boolean('Wrap top-level arrays in {"_": [...]} (BSON documents must be objects)', true)],
  (t, wraparr) => {
    let obj = parseJson(t);
    if (Array.isArray(obj)) {
      if (!wraparr) throw new Error('BSON documents must be objects, not arrays - enable wrapping or provide an object');
      obj = { _: obj };
    } else if (!isPlainObject(obj)) {
      throw new Error('BSON documents must be objects, not arrays - enable wrapping or provide an object');
    }
    return encodeDocument(Object.entries(obj));
  }, { text: true });
