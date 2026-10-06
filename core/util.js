export function reFlags(ignoreCase = false, multiline = true, dotall = false) {
  let f = 'u';
  if (ignoreCase) f += 'i';
  if (multiline) f += 'm';
  if (dotall) f += 's';
  return f;
}

export const DELIM_MAP = {
  'Space': ' ', 'Comma': ',', 'Semi-colon': ';', 'Colon': ':', 'Tab': '\t',
  'Line feed': '\n', 'CRLF': '\r\n', 'Forward slash': '/', 'Backslash': '\\',
  '0x': '0x', '\\x': '\\x', 'Nothing (separate chars)': '', 'None': '', 'Dash': '-',
  'Pipe': '|', 'Full stop': '.',
};
export const DELIMS = ['Space', 'Comma', 'Semi-colon', 'Colon', 'Line feed', 'CRLF', 'Tab'];

export function delim(name) {
  if (name in DELIM_MAP) return DELIM_MAP[name];
  return name.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
}

const DELIM_REGEX = {
  'Space': /\s+/g, 'Percent': /%/g, 'Comma': /,/g, 'Semi-colon': /;/g, 'Colon': /:/g,
  'Line feed': /\n/g, 'CRLF': /\r\n/g, 'Forward slash': /\//g, 'Backslash': /\\/g,
  '0x with comma': /,?0x/g, '0x': /0x/g, '\\x': /\\x/g, 'None': /\s+/g,
};
export function delimRegex(name) {
  if (name in DELIM_REGEX) return new RegExp(DELIM_REGEX[name].source, 'g');
  return new RegExp(delim(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
}

export function parseHex(s) {
  let clean = s.replace(/0x|\\x|[^0-9a-fA-F]/g, '');
  if (clean.length % 2) clean = '0' + clean;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export function bytesToHex(u8, sep = '') {
  return [...u8].map(b => b.toString(16).padStart(2, '0')).join(sep);
}

const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: false });
const tdLatin1 = new TextDecoder('latin1', { fatal: false });

export function encodeUtf8(s) { return te.encode(s); }
export function decodeUtf8(u8) { return td.decode(u8); }
export function decodeLatin1(u8) { return tdLatin1.decode(u8); }

export function bytesToChars(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 20000) s += String.fromCharCode(...u8.subarray(i, i + 20000));
  return s;
}

export function decodeUtf8OrChars(u8) {
  if (!u8.length) return '';
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch { return bytesToChars(u8); }
}

export function escapeWhitespace(s) {
  return s.replace(/[\x09-\x10]/g, (c) => String.fromCharCode(0xe000 + c.charCodeAt(0)));
}

export function base64Decode(s) {
  s = s.replace(/\s+/g, '');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function base64Encode(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function toBytes(value, enc) {
  if (enc === 'Hex') return parseHex(value);
  if (enc === 'Base64') return base64Decode(value);
  if (enc === 'Latin1') return new Uint8Array([...value].map(c => c.charCodeAt(0) & 0xff));
  if (enc === 'Decimal') return new Uint8Array((value.match(/-?\d+/g) || []).map(x => (parseInt(x, 10) & 255)));
  if (enc === 'Binary') {
    const v = value.replace(/[^01]/g, '');
    const n = v.length - (v.length % 8);
    const out = new Uint8Array(n / 8);
    for (let i = 0; i < n; i += 8) out[i / 8] = parseInt(v.slice(i, i + 8), 2);
    return out;
  }
  return encodeUtf8(value);
}

export function printableRatio(u8) {
  if (!u8.length) return 0;
  let ok = 0;
  for (const c of u8) if ((c >= 32 && c < 127) || c === 9 || c === 10 || c === 13) ok++;
  return ok / u8.length;
}

export function concatBytes(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
