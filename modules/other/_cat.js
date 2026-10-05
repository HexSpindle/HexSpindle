import { makeModule } from '../../core/registry.js';
export const module = makeModule('other');

export class Flt { constructor(value) { this.value = value; } }

export function parseJsonTyped(s) {
  let i = 0;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function val() {
    ws();
    const c = s[i];
    if (c === '{') return obj();
    if (c === '[') return arr();
    if (c === '"') return str();
    if (s.startsWith('true', i)) { i += 4; return true; }
    if (s.startsWith('false', i)) { i += 5; return false; }
    if (s.startsWith('null', i)) { i += 4; return null; }
    return num();
  }
  function obj() {
    i++; ws();
    const o = new Map();
    if (s[i] === '}') { i++; return o; }
    for (;;) {
      ws();
      const k = str();
      ws(); i++; // ':'
      o.set(k, val());
      ws();
      if (s[i] === ',') { i++; continue; }
      i++; // '}'
      return o;
    }
  }
  function arr() {
    i++; ws();
    const a = [];
    if (s[i] === ']') { i++; return a; }
    for (;;) {
      a.push(val());
      ws();
      if (s[i] === ',') { i++; continue; }
      i++; // ']'
      return a;
    }
  }
  function str() {
    i++; // opening quote
    let out = '';
    while (s[i] !== '"') {
      if (s[i] === '\\') {
        i++;
        const e = s[i];
        if (e === 'n') out += '\n';
        else if (e === 't') out += '\t';
        else if (e === 'r') out += '\r';
        else if (e === 'b') out += '\b';
        else if (e === 'f') out += '\f';
        else if (e === 'u') { out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16)); i += 4; }
        else out += e;
        i++;
      } else {
        out += s[i]; i++;
      }
    }
    i++; // closing quote
    return out;
  }
  function num() {
    const start = i;
    if (s[i] === '-') i++;
    while (/[0-9]/.test(s[i])) i++;
    let isFloat = false;
    if (s[i] === '.') { isFloat = true; i++; while (/[0-9]/.test(s[i])) i++; }
    if (s[i] === 'e' || s[i] === 'E') { isFloat = true; i++; if (s[i] === '+' || s[i] === '-') i++; while (/[0-9]/.test(s[i])) i++; }
    const n = Number(s.slice(start, i));
    return isFloat ? new Flt(n) : n;
  }
  const v = val();
  ws();
  return v;
}

/** Mirrors Python's repr(float) closely enough for round-numbers and typical values: integral
 * floats get a trailing ".0", everything else uses the shortest round-tripping decimal form. */
export function pyFloatRepr(n) {
  if (!Number.isFinite(n)) return n > 0 ? 'inf' : (n < 0 ? '-inf' : 'nan');
  if (Number.isInteger(n) && Math.abs(n) < 1e16) return (Object.is(n, -0) ? '-0' : String(n)) + '.0';
  let s = String(n);
  const m = /^(-?)(\d(?:\.\d+)?)e([+-])(\d+)$/.exec(s);
  if (m) s = `${m[1]}${m[2]}e${m[3]}${m[4].padStart(2, '0')}`;
  return s;
}

/** crypto.getRandomValues() refuses buffers over 65536 bytes in browsers; this fills arbitrarily
 * large buffers in chunks, matching Python's os.urandom()/secrets module (a CSPRNG, not a seeded one). */
export function secureRandomBytes(n) {
  const buf = new Uint8Array(n);
  for (let off = 0; off < n; off += 65536) crypto.getRandomValues(buf.subarray(off, Math.min(off + 65536, n)));
  return buf;
}

/** Mirrors Python's secrets.randbits(k): k cryptographically random bits as a BigInt in [0, 2**k). */
export function secureRandBits(bits) {
  const numbytes = Math.ceil(bits / 8);
  const buf = secureRandomBytes(numbytes);
  let x = 0n;
  for (const b of buf) x = (x << 8n) | BigInt(b);
  return x >> BigInt(numbytes * 8 - bits);
}

/** Mirrors Python's secrets.randbelow(n): a cryptographically random int in [0, n), via rejection
 * sampling on secureRandBits like CPython's _randbelow_with_getrandbits. Accepts/returns a plain
 * Number or a BigInt depending on what n is, so callers needing huge ranges (e.g. prime search) can
 * stay in BigInt. */
export function secureRandBelow(n) {
  const big = typeof n === 'bigint';
  const nBig = big ? n : BigInt(Math.trunc(n));
  if (nBig <= 0n) return big ? 0n : 0;
  const bits = nBig.toString(2).length;
  let r;
  do { r = secureRandBits(bits); } while (r >= nBig);
  return big ? r : Number(r);
}

function pyStr(v) {
  if (v instanceof Flt) return pyFloatRepr(v.value);
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  return String(v);
}

const JSON_ESCAPES = { '"': '\\"', '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f' };

/** Python's json.dumps() defaults to ensure_ascii=True, escaping every non-ASCII codepoint as \uXXXX
 * (surrogate pairs for anything outside the BMP) - unlike JSON.stringify(), which leaves UTF-8 text
 * as literal characters. This reproduces that escaping so string output matches byte-for-byte. */
function pyJsonString(s) {
  let out = '"';
  for (const ch of s) {
    if (ch in JSON_ESCAPES) { out += JSON_ESCAPES[ch]; continue; }
    const code = ch.codePointAt(0);
    if (code < 0x20 || code > 0x7e) {
      if (code > 0xffff) {
        const c = code - 0x10000;
        out += '\\u' + (0xd800 + (c >> 10)).toString(16).padStart(4, '0') + '\\u' + (0xdc00 + (c & 0x3ff)).toString(16).padStart(4, '0');
      } else {
        out += '\\u' + code.toString(16).padStart(4, '0');
      }
    } else out += ch;
  }
  return out + '"';
}

/** Pretty-prints a value built from parseJsonTyped()/Flt the way Python's json.dumps(v, indent=2)
 * would, including the "42" vs "42.0" int/float distinction JSON.stringify can't tell apart, and the
 * ensure_ascii=True \uXXXX string escaping. */
export function toPyJson(v, indent = 2, depth = 0) {
  const pad = ' '.repeat(indent * (depth + 1));
  const padEnd = ' '.repeat(indent * depth);
  if (v === null || v === undefined) return 'null';
  if (v instanceof Flt) return pyFloatRepr(v.value);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return pyJsonString(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return '[\n' + v.map(x => pad + toPyJson(x, indent, depth + 1)).join(',\n') + '\n' + padEnd + ']';
  }
  if (v instanceof Map) {
    if (!v.size) return '{}';
    const lines = [...v.entries()].map(([k, x]) => `${pad}${pyJsonString(pyStr(k))}: ${toPyJson(x, indent, depth + 1)}`);
    return '{\n' + lines.join(',\n') + '\n' + padEnd + '}';
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  const lines = keys.map(k => `${pad}${pyJsonString(k)}: ${toPyJson(v[k], indent, depth + 1)}`);
  return '{\n' + lines.join(',\n') + '\n' + padEnd + '}';
}
