// SPDX-License-Identifier: MIT
// HexSpindle original code. No third-party runtime dependency.

export const te = new TextEncoder();
export const td = new TextDecoder('utf-8', { fatal: false });
export const td16 = new TextDecoder('utf-16le', { fatal: false });
export const tdLatin1 = new TextDecoder('latin1', { fatal: false });

export function text(data) { return td.decode(data); }
export function latin1(data) { return tdLatin1.decode(data); }
export function utf16(data) { return td16.decode(data); }
export function hex(data, sep = '') { return [...data].map(b => b.toString(16).padStart(2, '0')).join(sep); }
export function hexU(n, w = 8) { return '0x' + Number(n >>> 0).toString(16).padStart(w, '0'); }
export function safeJson(v, space = 2) { return JSON.stringify(v, (_, x) => typeof x === 'bigint' ? x.toString() : x, space); }
export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

export function dvOf(data) { return new DataView(data.buffer, data.byteOffset, data.byteLength); }
export function has(data, off, len = 1) { return Number.isInteger(off) && off >= 0 && len >= 0 && off + len <= data.length; }
export function need(data, off, len, what = 'data') { if (!has(data, off, len)) throw new Error(`Truncated ${what} at offset 0x${Math.max(0, off).toString(16)}`); }
export function u8(data, off) { need(data, off, 1); return data[off]; }
export function u16le(data, off) { need(data, off, 2); return dvOf(data).getUint16(off, true); }
export function u16be(data, off) { need(data, off, 2); return dvOf(data).getUint16(off, false); }
export function i32le(data, off) { need(data, off, 4); return dvOf(data).getInt32(off, true); }
export function u32le(data, off) { need(data, off, 4); return dvOf(data).getUint32(off, true); }
export function u32be(data, off) { need(data, off, 4); return dvOf(data).getUint32(off, false); }
export function u64le(data, off) { need(data, off, 8); return dvOf(data).getBigUint64(off, true); }
export function u64be(data, off) { need(data, off, 8); return dvOf(data).getBigUint64(off, false); }
export function i64le(data, off) { need(data, off, 8); return dvOf(data).getBigInt64(off, true); }

export function asciiz(data, off, max = 4096) {
  if (!has(data, off)) return '';
  const endMax = Math.min(data.length, off + max);
  let end = off;
  while (end < endMax && data[end]) end++;
  return tdLatin1.decode(data.subarray(off, end));
}
export function utf16z(data, off, max = 8192) {
  if (!has(data, off)) return '';
  const endMax = Math.min(data.length, off + max);
  let end = off;
  while (end + 1 < endMax && (data[end] || data[end + 1])) end += 2;
  return td16.decode(data.subarray(off, end));
}
export function fixedAscii(data, off, len) {
  if (!has(data, off, len)) return '';
  let end = off + len;
  while (end > off && data[end - 1] === 0) end--;
  return tdLatin1.decode(data.subarray(off, end));
}
export function fixedUtf16(data, off, chars) {
  if (!has(data, off, chars * 2)) return '';
  return td16.decode(data.subarray(off, off + chars * 2)).replace(/\0+$/g, '');
}

export function filetimeToIso(v) {
  try {
    const n = typeof v === 'bigint' ? v : BigInt(v);
    if (n <= 0n) return null;
    const ms = Number((n - 116444736000000000n) / 10000n);
    if (!Number.isFinite(ms) || ms < -62135596800000 || ms > 253402300799999) return null;
    return new Date(ms).toISOString();
  } catch { return null; }
}
export function unixToIso(sec, frac = 0) {
  const ms = Number(sec) * 1000 + Number(frac || 0);
  if (!Number.isFinite(ms)) return null;
  try { return new Date(ms).toISOString(); } catch { return null; }
}
export function webkitToIso(microseconds) {
  const ms = Number(microseconds) / 1000 - 11644473600000;
  if (!Number.isFinite(ms)) return null;
  try { return new Date(ms).toISOString(); } catch { return null; }
}
export function cocoaToIso(seconds) {
  const ms = (Number(seconds) + 978307200) * 1000;
  if (!Number.isFinite(ms)) return null;
  try { return new Date(ms).toISOString(); } catch { return null; }
}

export function printableAsciiStrings(data, min = 4) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= data.length; i++) {
    const b = i < data.length ? data[i] : 0;
    if (b >= 0x20 && b <= 0x7e) { if (start < 0) start = i; }
    else if (start >= 0) {
      if (i - start >= min) out.push({ offset: start, text: tdLatin1.decode(data.subarray(start, i)) });
      start = -1;
    }
  }
  return out;
}
export function printableUtf16Strings(data, min = 4) {
  const out = [];
  let i = 0;
  while (i + 1 < data.length) {
    const s = i;
    let chars = 0;
    while (i + 1 < data.length && data[i + 1] === 0 && data[i] >= 0x20 && data[i] <= 0x7e) { i += 2; chars++; }
    if (chars >= min) out.push({ offset: s, text: td16.decode(data.subarray(s, s + chars * 2)) });
    if (i === s) i += 2;
  }
  return out;
}

export function parseJsonish(data) {
  const s = text(data).trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const rows = [];
  for (const line of s.split(/\r?\n/)) {
    const t = line.trim(); if (!t) continue;
    try { rows.push(JSON.parse(t)); } catch { return null; }
  }
  return rows.length ? rows : null;
}
export function recordsFromInput(data) {
  const j = parseJsonish(data);
  if (Array.isArray(j)) return j;
  if (j && typeof j === 'object') {
    for (const k of ['Records','records','Events','events','value','items','Results','results']) if (Array.isArray(j[k])) return j[k];
    return [j];
  }
  return [];
}
export function dig(obj, ...keys) {
  for (const k of keys) {
    if (obj == null) return undefined;
    if (typeof k === 'number') obj = obj[k];
    else if (Object.prototype.hasOwnProperty.call(obj, k)) obj = obj[k];
    else {
      const found = Object.keys(obj).find(x => x.toLowerCase() === String(k).toLowerCase());
      if (found == null) return undefined;
      obj = obj[found];
    }
  }
  return obj;
}
export function first(obj, paths, fallback = undefined) {
  for (const p of paths) {
    let v = obj;
    for (const k of p) v = dig(v, k);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
}

export function entropy(data) {
  if (!data.length) return 0;
  const counts = new Uint32Array(256);
  for (const b of data) counts[b]++;
  let e = 0;
  for (const c of counts) if (c) { const p = c / data.length; e -= p * Math.log2(p); }
  return e;
}
export function isLikelyText(data) {
  if (!data.length) return true;
  let ok = 0;
  for (const b of data) if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127)) ok++;
  return ok / data.length > 0.88;
}

export function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows, columns = null) {
  if (!rows.length) return '';
  columns ||= [...new Set(rows.flatMap(r => Object.keys(r)))];
  return [columns.join(','), ...rows.map(r => columns.map(c => csvEscape(r[c])).join(','))].join('\n');
}

export function parseXmlFields(xml) {
  const out = {};
  const re = /<Data\b[^>]*\bName=["']([^"']+)["'][^>]*>([\s\S]*?)<\/Data>/gi;
  let m;
  while ((m = re.exec(xml))) out[m[1]] = xmlUnescape(stripTags(m[2]));
  return out;
}
export function xmlTag(xml, name) {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const m = re.exec(xml); return m ? xmlUnescape(stripTags(m[1])).trim() : '';
}
export function xmlAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i');
  const m = re.exec(xml); return m ? xmlUnescape(m[1]) : '';
}
export function stripTags(s) { return String(s).replace(/<[^>]*>/g, ''); }
export function xmlUnescape(s) { return String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'); }

export function parseKeyValueLines(s) {
  const out = {};
  for (const line of String(s).split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

export function fnv1a32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function looksIp(s) {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(s)) return s.split('.').every(x => +x <= 255);
  return /^[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}$/i.test(s);
}
export function normalizeIndicator(s) {
  s = String(s).trim();
  s = s.replace(/^hxxps?:\/\//i, m => m.toLowerCase().startsWith('hxxps') ? 'https://' : 'http://').replace(/\[\.\]/g, '.');
  return s;
}
export function extractIocsFromText(s, source = '') {
  const out = [];
  const push = (type, value, index) => out.push({ type, value: normalizeIndicator(value), source, offset: index });
  const pats = [
    ['url', /\b(?:https?|hxxps?):\/\/[A-Za-z0-9._~%!$&'()*+,;=:@/?#\[\]-]+/gi],
    ['ipv4', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
    ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
    ['sha256', /\b[a-f0-9]{64}\b/gi], ['sha1', /\b[a-f0-9]{40}\b/gi], ['md5', /\b[a-f0-9]{32}\b/gi],
    ['domain', /\b(?:[a-z0-9-]+\.)+[a-z]{2,63}\b/gi],
  ];
  for (const [type, re] of pats) { let m; while ((m = re.exec(s))) { if (type === 'ipv4' && !looksIp(m[0])) continue; push(type, m[0], m.index); } }
  const seen = new Set();
  return out.filter(x => { const k = x.type + '\0' + x.value.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
