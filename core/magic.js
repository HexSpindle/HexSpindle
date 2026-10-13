import { MODULES, MAGIC_HINTS } from './registry.js';
import { callModule, resolveArgs } from './engine.js';
import { SIGNATURES } from './filetypes.js';
import { decodeLatin1 } from './util.js';
import { delimiterOf, HASH_LENGTHS } from './magic-detect.js';

// Magic: speculative multi-stage decoding.
// Each candidate operation is only tried when the data structurally fits that encoding ("fit"),
// every result is assessed for how meaningful it is ("quality"), and a chain's confidence combines both.
// A layer that decodes further into something at least as meaningful is treated as an intermediate stage.
//
// Besides the core formats recognised in this file, operations describe their own input with hints
// (registry.js: { magic: hint } at registration, or magicHint(); helpers in magic-detect.js):
//   { kind: 'decode',  detect(ctx) }   the operation transforms the data; Magic runs it and follows the result
//   { kind: 'analyse', detect(ctx) }   the operation reports on the data; Magic suggests it without running it
// detect(ctx) returns nothing, a fit from 0 to 1, or { fit, args, label, ... } (or an array of those), where
//   ctx = { bytes, isText, ascii, text, head, utf8, compact, single, file, at(signature, offset) }.
// Extra fields a decode hint may return: needsQuality (only believed when the output is meaningful),
// weak (text-to-text cipher: must clearly improve readability), trust (self-validating, e.g. a checksum),
// variants ([{ args, label }]: a small keyspace, the best key is kept), whole (variants need the full text) and
// needsWords (the output must contain at least that many dictionary words, to rule out lucky keys) and
// verify(outputBytes) (an extra check on the result, e.g. that it is printable ASCII).

const SAMPLE = 4096;
const FULL_CHECK_LIMIT = 300000;
const MAX_EXPAND_BYTES = 4 << 20;
const TIME_BUDGET_MS = 6000;

// ---- Language evidence -------------------------------------------------------------------------

const BIGRAMS = new Set(('th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce '
  + 'li ch ll be ma si om ur ca el ta la ns di fo ho pe ec pr no ct us ac ot il tr ly nc et ut ss so rs un lo wa ge ie wh ee wi em ad ol rt po '
  + 'we na ul ni ts mo ow pa im mi ai sh ir su id os iv ia am fi ci vi pl ig tu ev ld ry mp fe bl ab gh ty op wo sa ay ex ke fr oo av ag if ap').split(' '));
const WORDS = new Set(('the and for you that this with have from not are was but all can your has will one about what when which there their they them then '
  + 'than been were would could should into more some out other time just like over also only new use used any may our his her its who how now '
  + 'is it to of in on at be as by we or an if do no so up me my he she us am '
  + 'http https www com org net html json xml user admin password login name data file error true false null function return var const let else get post '
  + 'select where key value token hello world test flag secret message powershell cmd exe windows system echo print import class public private id '
  + 'server client request response content type host path query string number list item index code text body header title page link image script style '
  + 'object download web hidden net read write open close start stop run exec shell root local remote address port mail date day year here').split(' '));

function language(text) {
  let pairs = 0, hits = 0, tokens = 0, known = 0, covered = 0;
  for (const word of text.toLowerCase().split(/[^a-z]+/)) {
    if (word.length < 2) continue;
    tokens++;
    if (WORDS.has(word)) known += word.length > 2 ? 1 : 0.5;
    if (word.length > 2) covered += word.length;
    for (let i = 0; i + 1 < word.length; i++) { pairs++; if (BIGRAMS.has(word.slice(i, i + 2))) hits++; }
  }
  if (!tokens) return 0;
  // Random letters hit the bigram table about a fifth of the time; English about two thirds.
  const bigram = pairs < 6 ? 0.3 * Math.min(1, pairs / 6) : Math.max(0, Math.min(1, (hits / pairs - 0.24) / 0.3));
  const words = Math.min(1, known / tokens / 0.3);
  // Letter runs must make up a real share of the text, otherwise hex and base64 blobs score by accident.
  const coverage = Math.min(1, covered / (text.replace(/\s/g, '').length || 1) / 0.4);
  return coverage * Math.min(1, 0.5 * bigram + 0.6 * words);
}

// How many distinct dictionary words (three letters or more) a text contains.
function knownWords(text) {
  const found = new Set();
  for (const word of text.toLowerCase().split(/[^a-z]+/)) if (word.length > 2 && WORDS.has(word)) found.add(word);
  return found.size;
}

// ---- Assessing how meaningful a result is ------------------------------------------------------

const COMPRESSED = new Set(['gz', 'bz2', 'xz', 'zst', 'lz4', 'zlib']);
const TEXT_SIGNATURES = new Set(['pem', 'xml', 'html', 'sh', 'rtf']);

function fileType(u8) {
  let best = null;
  for (const [name, ext, , magic, off] of SIGNATURES) {
    if (off + magic.length > u8.length) continue;
    let ok = true;
    for (let i = 0; i < magic.length; i++) if (u8[off + i] !== magic[i]) { ok = false; break; }
    if (!ok) continue;
    if (ext === 'webp' && String.fromCharCode(...u8.subarray(8, 12)) !== 'WEBP') continue;
    if (ext === 'zlib' && (((u8[0] << 8) | u8[1]) % 31 !== 0 || u8.length < 8)) continue;
    // One- and two-byte signatures match random data far too often to count as strong evidence.
    let strength = off > 0 || magic.length >= 4 ? 0.92 : magic.length === 3 ? 0.8 : magic.length === 2 ? 0.3 : 0;
    if (ext === 'exe' && u8.length >= 0x40) {
      // "MZ" alone is two bytes; the PE signature it points to settles it.
      const pe = u8[0x3c] | (u8[0x3d] << 8) | (u8[0x3e] << 16);
      if (pe + 4 <= u8.length && u8[pe] === 0x50 && u8[pe + 1] === 0x45 && !u8[pe + 2] && !u8[pe + 3]) strength = 0.92;
    }
    // A signature with almost nothing after it (e.g. the four bytes of "cafebabe") is not a file.
    if (u8.length < off + magic.length + 8) strength *= 0.3;
    if (strength && (!best || strength > best.strength)) best = { name, ext, strength };
  }
  return best;
}

export function entropy(u8) {
  if (!u8.length) return 0;
  const counts = new Uint32Array(256);
  for (const b of u8) counts[b]++;
  let h = 0;
  for (const c of counts) if (c) { const p = c / u8.length; h -= p * Math.log2(p); }
  return Math.max(0, h);
}

const ENCODED_TOKEN = /^[A-Za-z0-9+/=_-]{16,}$/;
const SCRIPTS = [/\p{Script=Latin}/u, /\p{Script=Cyrillic}/u, /\p{Script=Greek}/u, /\p{Script=Arabic}/u, /\p{Script=Hebrew}/u,
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u, /\p{Script=Thai}/u, /\p{Script=Devanagari}/u,
  /\p{Script=Armenian}/u, /\p{Script=Georgian}/u, /\p{Script=Ethiopic}/u, /\p{Script=Bengali}/u, /\p{Script=Tamil}/u];
const STRUCTURE = [
  [/^\s*[a-z][a-z0-9+.-]{1,12}:\/\/[^\s]{3,}/i, 0.5, 'URL'],
  [/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/, 0.45, 'Email address'],
  [/^(?:flag|ctf|htb|thm|pico\w*)\{[^{}\n]{2,}\}$/i, 0.55, 'Flag'],
  [/^\w{2,12}\{[^{}\n]{4,}\}$/, 0.25, 'Flag-like token'],
  [/^-----BEGIN [A-Z0-9 ]+-----/, 0.6, 'PEM block'],
  [/^(?:[\w.-]+=[^&\s]*&)+[\w.-]+=[^&\s]*$/, 0.4, 'Query string'],
  [/^(?:[A-Za-z]:\\|\/)[^\0<>|]{3,}$/, 0.3, 'File path'],
];

export function assess(u8) {
  if (!u8.length) return { q: 0, kind: 'Empty' };
  const file = fileType(u8);
  const sample = u8.subarray(0, SAMPLE), whole = u8.length <= SAMPLE;
  let text = null;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(sample, { stream: !whole }); } catch { /* not UTF-8 */ }

  if (file && !TEXT_SIGNATURES.has(file.ext)) {
    if (COMPRESSED.has(file.ext)) return { q: Math.min(0.5, file.strength), kind: `Compressed data (${file.name})`, file };
    if (file.strength >= 0.8) return { q: file.strength, kind: file.name, file };
  }

  if (text === null || !text.length) {
    // Not UTF-8. Mostly-ASCII data with a few high bytes is probably single-byte text (Latin-1 / Windows-125x).
    let printable = 0, control = 0;
    for (const c of sample) { if ((c >= 32 && c < 127) || c === 9 || c === 10 || c === 13) printable++; else if (c < 32 || c === 127) control++; }
    const ratio = printable / sample.length;
    if (!control && ratio >= 0.85) return { q: 0.25 + 0.3 * language(decodeLatin1(sample)), kind: 'Single-byte text (not UTF-8)', text: true };
    if (file) return { q: file.strength, kind: `Possibly ${file.name}`, file };
    return { q: 0.02 + 0.06 * ratio, kind: 'Binary data' };
  }

  let control = 0, letters = 0, foreign = 0, spaces = 0, other = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13 || c === 32) spaces++;
    else if (c < 32 || (c >= 127 && c < 160) || c === 0xfffd || (c >= 0xe000 && c <= 0xf8ff) || (c >= 0xfff0 && c <= 0xffff)) control++;
    else if (c < 128) { if ((c | 32) >= 97 && (c | 32) <= 122) letters++; else other++; }
    else if (/\p{L}|\p{M}/u.test(ch)) foreign++;
    else other++;
  }
  const length = [...text].length;
  if (control / length > 0.02) {
    if (file) return { q: file.strength, kind: `Possibly ${file.name}`, file };
    return { q: 0.03 + 0.1 * (1 - Math.min(1, control / length * 4)), kind: 'Binary data' };
  }

  const trimmed = text.trim(), lang = language(text);
  if (whole && /^[[{]/.test(trimmed) && /[\]}]$/.test(trimmed) && trimmed.length >= 2) {
    try { const v = JSON.parse(trimmed); if (v && typeof v === 'object' && Object.keys(v).length) return { q: 0.72 + 0.25 * lang, kind: 'JSON', text: true, lang }; } catch { /* not JSON */ }
  }
  if (/^<(?:\?xml|!DOCTYPE|[a-zA-Z][\w:-]*(?:\s[^<>]*)?>)/.test(trimmed) && /<\/[\w:-]+>|\/>/.test(trimmed)) return { q: 0.7 + 0.25 * lang, kind: 'XML / HTML markup', text: true, lang };
  if (foreign >= 4 && foreign / length >= 0.2) {
    // Real text stays within one writing system; bytes that merely happen to be valid UTF-8 wander across many.
    const letters = [...text].filter(ch => ch.codePointAt(0) > 127 && /\p{L}/u.test(ch));
    const dominant = Math.max(...SCRIPTS.map(rx => letters.filter(ch => rx.test(ch)).length));
    if (letters.length && dominant / letters.length < 0.7) return { q: 0.2, kind: 'Text in mixed scripts (probably not real text)', text: true, lang: 0 };
    return { q: 0.92, kind: 'Text (UTF-8)', text: true, lang: 1 };
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  let q = 0.35 + 0.5 * lang, kind = lang >= 0.5 ? 'Readable text' : 'Printable text';
  if (tokens.length >= 3 && trimmed.length / tokens.length <= 16) q += 0.1;
  for (const [rx, bonus, label] of STRUCTURE) if (rx.test(trimmed)) { q += bonus; kind = label; break; }
  if (file && TEXT_SIGNATURES.has(file.ext)) { q = Math.max(q, file.strength); kind = file.name; }
  // A long single token drawn only from an encoding alphabet is most likely another encoded layer.
  if (tokens.length === 1 && ENCODED_TOKEN.test(trimmed) && lang < 0.5 && kind === 'Printable text') { q = Math.min(q, 0.3); kind = 'Printable text (looks encoded)'; }
  else if (!letters && !foreign && kind === 'Printable text') q = Math.min(q, 0.3);
  return { q: Math.min(0.96, q), kind, text: true, lang };
}

// ---- Structural fit of each candidate encoding --------------------------------------------------

const B64_STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const B64_URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=';
function base64Fit(body, pad) {
  const n = body.length + pad;
  if (body.length < 6 || (pad ? n % 4 !== 0 : n % 4 === 1)) return 0;
  let fit = pad || n % 4 === 0 ? 0.9 : 0.72;
  if (/^[0-9a-fA-F]+$/.test(body)) fit *= 0.3;                      // far more likely to be hex
  else if (/^[a-z]+$/.test(body) || /^[A-Z]+$/.test(body) || /^\d+$/.test(body)) fit *= 0.45;   // a plain word or number
  return fit;
}

// Core formats: returns [{ name, args, fit, weak?, speculative?, label? }] for operations whose input format the data matches.
function coreCandidates(u8, a) {
  const out = [];
  const add = (name, args, fit, extra) => { if (fit > 0 && MODULES[name]) out.push({ name, args, fit, ...extra }); };
  const full = u8.length <= FULL_CHECK_LIMIT;
  const head = full ? u8 : u8.subarray(0, 65536);

  // Binary containers, recognised by header.
  if (u8.length >= 6) {
    if (u8[0] === 0x1f && u8[1] === 0x8b && u8[2] === 8) add('Gunzip', [], 0.99);
    if ((u8[0] & 0x0f) === 8 && (u8[0] >> 4) <= 7 && ((u8[0] << 8) | u8[1]) % 31 === 0) add('Zlib Inflate', [], 0.9);
    if (u8[0] === 0x42 && u8[1] === 0x5a && u8[2] === 0x68 && u8[3] >= 0x31 && u8[3] <= 0x39) add('Bzip2 Decompress', [], 0.97);
    if (u8[0] === 0x28 && u8[1] === 0xb5 && u8[2] === 0x2f && u8[3] === 0xfd) add('Zstandard Decompress', [], 0.97);
    if (u8[0] === 0x04 && u8[1] === 0x22 && u8[2] === 0x4d && u8[3] === 0x18) add('LZ4 Decompress', [0], 0.97);
    if (u8[0] === 0x5d && u8[1] === 0 && u8[2] === 0 && u8.length > 13) add('LZMA Decompress', [], 0.85);
    if (u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 3 && u8[3] === 4) add('Unzip', [], 0.95);
    if (u8.length > 262 && String.fromCharCode(...u8.subarray(257, 262)) === 'ustar') add('Untar', [], 0.95);
  }
  if (u8.length >= 4 && u8.length % 2 === 0) {
    if (u8[0] === 0xff && u8[1] === 0xfe) add('Decode text', ['UTF-16'], 0.97, { label: 'Decode text (UTF-16)' });
    else if (u8[0] === 0xfe && u8[1] === 0xff) add('Decode text', ['UTF-16'], 0.97, { label: 'Decode text (UTF-16)' });
    else {
      let even = 0, odd = 0; const n = Math.min(head.length & ~1, 2048);
      for (let i = 0; i < n; i += 2) { if (!head[i]) even++; if (!head[i + 1]) odd++; }
      const pairs = n / 2;
      if (odd / pairs >= 0.7 && even / pairs <= 0.1) add('Decode text', ['UTF-16LE'], 0.93, { label: 'Decode text (UTF-16LE)' });
      else if (even / pairs >= 0.7 && odd / pairs <= 0.1) add('Decode text', ['UTF-16BE'], 0.93, { label: 'Decode text (UTF-16BE)' });
    }
  }
  const binary = !a.text;
  if (binary) {
    // Compression formats without a header: each is tried, and only believed if the result is meaningful.
    if (!out.length && u8.length >= 8 && !a.file) {
      const headerless = [['Raw Inflate', 0.5], ['Snappy Decompress', 0.4], ['LZF Decompress', 0.4], ['LZNT1 Decompress', 0.35], ['XPRESS Decompress', 0.35], ['Brotli Decompress', 0.4]];
      for (const [name, fit] of headerless) add(name, [], fit, { needsQuality: true, fallback: name !== 'Raw Inflate' });
    }
    return out;
  }

  let ascii = true;
  for (const c of head) if (c > 126) { ascii = false; break; }
  const t = decodeLatin1(head).trim();
  if (!t.length) return out;

  // Escapes embedded in otherwise readable text (may contain non-ASCII around them).
  const pct = t.match(/%[0-9A-Fa-f]{2}/g);
  if (pct) add('URL Decode', [], pct.length >= 2 ? 0.92 : 0.75);
  if (/&(?:#\d{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,30});/.test(t)) add('From HTML Entity', [], 0.9);
  if (/\\u[0-9a-fA-F]{4}/.test(t)) add('Unescape Unicode Characters', ['\\u'], 0.92);
  else if (/%u[0-9a-fA-F]{4}/.test(t)) add('Unescape Unicode Characters', ['%u'], 0.9, { label: 'Unescape Unicode Characters (%u)' });
  else if (/U\+[0-9a-fA-F]{4,6}/.test(t)) add('Unescape Unicode Characters', ['U+'], 0.8, { label: 'Unescape Unicode Characters (U+)' });
  if (!ascii) return out;

  const compact = t.replace(/[\r\n]+/g, '');
  const single = !/\s/.test(compact);

  if (/^[0-9a-fA-F]{6,8}:?\s+(?:[0-9a-fA-F]{2}\s+){2,}/m.test(t)) add('From Hexdump', [], 0.95);
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(compact)) add('JWT Decode', [], 0.97);

  // Hex: contiguous, or even-length groups split by common separators / 0x / \x prefixes.
  const hexTokens = t.split(/(?:0x|\\x|[\s,:;-])+/i).filter(Boolean);
  if (hexTokens.length && hexTokens.every(x => /^[0-9a-fA-F]+$/.test(x) && x.length % 2 === 0)) {
    const digits = hexTokens.join('');
    if (digits.length >= 4) {
      let fit = hexTokens.length > 1 ? (hexTokens.every(x => x.length === 2) ? 0.97 : 0.9) : digits.length >= 8 ? 0.95 : 0.7;
      if (/^\d+$/.test(digits)) fit *= hexTokens.length > 1 && hexTokens.every(x => x.length === 2) ? 0.8 : 0.35;
      else if (/[a-f]/.test(digits) && /[A-F]/.test(digits)) fit *= 0.85;
      add('From Hex', ['Auto'], fit);
    }
  }

  const numeric = t.split(/[\s,;:]+/).filter(Boolean);
  const delimiter = delimiterOf(t);
  if (/^[01\s,;:]+$/.test(t)) {
    const bits = t.replace(/[^01]/g, '');
    if (bits.length >= 16 && bits.length % 8 === 0 && (numeric.length === 1 || numeric.every(x => x.length === 8)))
      add('From Binary', [numeric.length === 1 ? 'None' : delimiter || 'Space', 8], 0.98);
  }
  if (numeric.length >= 4 && numeric.every(x => /^\d{1,3}$/.test(x))) {
    if (numeric.every(x => +x <= 255)) add('From Decimal', [delimiter || 'Auto', false], 0.9);
    if (delimiter && numeric.every(x => /^[0-7]+$/.test(x) && parseInt(x, 8) <= 255)) add('From Octal', [delimiter], numeric.every(x => x.length === 3) ? 0.88 : 0.8);
  }

  if (/^[.\-_/|\s]+$/.test(t) && /\./.test(t) && /[-_]/.test(t) && t.replace(/\s/g, '').length >= 5) {
    const word = t.includes('/') ? 'Forward slash' : /\n/.test(t) ? 'Line feed' : 'Space';
    add('From Morse Code', [t.includes('_') && !t.includes('-') ? '_/.' : '-/.', 'Space', word], 0.9);
  }

  if (single) {
    const m = /^([A-Za-z0-9+/]+)(={0,2})$/.exec(compact);
    if (m) add('From Base64', [B64_STD, true, false], full ? base64Fit(m[1], m[2].length) : 0.85);
    else {
      const url = /^([A-Za-z0-9_-]+)(={0,2})$/.exec(compact);
      if (url) add('From Base64', [B64_URL, true, false], (full ? base64Fit(url[1], url[2].length) : 0.85) * 0.95, { label: 'From Base64 (URL-safe)' });
    }
    const b32 = /^([A-Z2-7]+)(=*)$/.exec(compact);
    if (b32 && compact.length >= 8) {
      const padded = b32[2].length && compact.length % 8 === 0;
      const fit = padded ? 0.93 : !b32[2].length && [0, 2, 4, 5, 7].includes(compact.length % 8) ? 0.6 : 0;
      add('From Base32', [], /^[A-Z]+$/.test(compact) ? fit * 0.6 : fit);
    }
    const a85 = /^(?:<~)?([!-uz]+)(?:~>)?$/.exec(compact);
    if (a85 && a85[1].length >= 10 && /[^A-Za-z0-9+/=]/.test(a85[1])) add('From Base85', [], compact.startsWith('<~') ? 0.95 : 0.6);
    // Base58 and Base62 treat the input as one big number: used for short identifiers, and far too slow on large blobs.
    if (compact.length >= 12 && compact.length <= 4096 && !/^[0-9a-fA-F]+$/.test(compact)) {
      if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(compact)) add('From Base58', [], 0.5);
      if (/^[0-9A-Za-z]+$/.test(compact)) add('From Base62', [], 0.35);
    }
    if (compact.length >= 8 && /^[!#-_a-}]+$/.test(compact) && !out.some(c => c.fit >= 0.8)) add('From Base92', [], 0.25);
    if (m && compact.length >= 16) add('LZString Decompress', ['Base64'], 0.3, { needsQuality: true });
  }
  if (/^[0-9A-Z $%*+\-./:]+$/.test(compact) && compact.length >= 6 && compact.length % 3 !== 1 && /[G-Z $%*+./:]/.test(compact) && !/^[A-Z ]+$/.test(compact))
    add('From Base45', [], 0.5);

  // Quoted-printable: a soft line break, or several =XX escapes (a lone "limit=20" is just text).
  if (!/=(?![0-9A-F]{2}|\r?\n|$)/.test(t) && !out.some(c => c.name === 'From Base64')
    && (/=\r?\n/.test(t) || /=3D|(?:=[0-9A-F]{2}){2}/.test(t) || (t.match(/=[0-9A-F]{2}/g) || []).length >= 3)) add('From Quoted Printable', [], 0.8);
  if (/\\(?:x[0-9a-fA-F]{2}|[nrt0])/.test(t) && !out.some(c => c.name === 'From Hex')) add('Unescape string', [], 0.7);

  // Weak text-to-text ciphers: only kept by the search when the result is clearly more meaningful.
  const solid = t.replace(/\s/g, '');
  if (solid.length >= 4) {
    if (solid.replace(/[^A-Za-z]/g, '').length / solid.length >= 0.5 && new Set(solid.toLowerCase().replace(/[^a-z]/g, '')).size >= 7 && !/looks encoded/.test(a.kind)) {
      add('ROT13', [], 0.75, { weak: true, variants: Array.from({ length: 25 }, (_, i) => ({ args: [true, true, false, i + 1], label: i === 12 ? 'ROT13' : `ROT13 (amount ${i + 1})` })) });
      add('Atbash Cipher', [], 0.6, { weak: true });
    }
    add('ROT47', [47], 0.7, { weak: true });
  }
  add('Reverse', ['Character'], 0.6, { weak: true, speculative: single && compact.length >= 8 });
  return out;
}

// ---- Hints declared by operations ---------------------------------------------------------------

function context(u8, a) {
  const full = u8.length <= FULL_CHECK_LIMIT;
  const view = full ? u8 : u8.subarray(0, 65536);
  const isText = !!a.text;
  let ascii = isText;
  if (isText) for (const c of view) if (c > 126) { ascii = false; break; }
  const text = isText ? decodeLatin1(view).trim() : '';
  const compact = text.replace(/[\r\n]+/g, '');
  let utf8 = null;
  if (isText) { try { utf8 = new TextDecoder('utf-8', { fatal: true }).decode(u8.subarray(0, SAMPLE), { stream: u8.length > SAMPLE }); } catch { /* not UTF-8 */ } }
  return {
    bytes: u8, isText, ascii, text, head: text.slice(0, SAMPLE), utf8, compact, single: !!compact && !/\s/.test(compact), file: fileType(u8)?.ext || '',
    at(signature, offset = 0) {
      if (offset + signature.length > u8.length) return false;
      for (let i = 0; i < signature.length; i++) if (u8[offset + i] !== signature.charCodeAt(i)) return false;
      return true;
    },
  };
}

function hinted(ctx, kind) {
  const out = [];
  for (const [name, hints] of Object.entries(MAGIC_HINTS)) {
    if (!MODULES[name]) continue;
    for (const hint of hints) {
      if (hint.kind !== kind) continue;
      let found;
      try { found = hint.detect(ctx); } catch { continue; }
      for (const f of Array.isArray(found) ? found : [found]) {
        const c = typeof f === 'number' ? { fit: f } : f;
        if (c && c.fit > 0) out.push({ name, args: [], ...c, requires: hint.requires });
      }
    }
  }
  return out;
}

// Core formats first, then whatever operations registered for themselves; strongest fit first.
function candidates(u8, a) {
  const core = coreCandidates(u8, a);
  const known = new Set(core.map(c => c.name));
  const all = [...core, ...hinted(context(u8, a), 'decode').filter(c => !known.has(c.name) || c.label)];
  return all.map((c, i) => [c, i]).sort((x, y) => (x[0].fallback ? 1 : 0) - (y[0].fallback ? 1 : 0) || y[0].fit - x[0].fit || x[1] - y[1]).map(x => x[0]);
}

// Operations worth running on this data next: reported as suggestions, never executed by the search.
function suggestions(u8, a) {
  const best = new Map();
  for (const c of hinted(context(u8, a), 'analyse')) if (!best.has(c.name) || best.get(c.name).fit < c.fit) best.set(c.name, c);
  return [...best.values()].sort((x, y) => y.fit - x.fit).slice(0, 6)
    .map(c => ({ name: c.name, args: c.args, fit: c.fit, requires: c.requires || null, label: (c.label || c.name) + (c.requires ? ` (needs ${c.requires})` : '') }));
}

// ---- Search ------------------------------------------------------------------------------------

function fingerprint(u8) {
  let a = 0x811c9dc5, b = 0x9747b28c;
  for (let i = 0; i < u8.length; i++) { a = Math.imul(a ^ u8[i], 0x01000193); b = Math.imul(b ^ u8[i], 0x5bd1e995) ^ (b >>> 13); }
  return `${u8.length}:${a >>> 0}:${b >>> 0}`;
}

function sameBytes(x, y) {
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

function stepLabel(c) {
  if (c.label) return c.label;
  if (c.name === 'XOR') return `XOR (key 0x${c.args[0].string})`;
  return c.name;
}

// What the data appears to be when it cannot be (or has not been) decoded.
function identify(u8, a) {
  const notes = [];
  if (u8.length <= 200) {
    const t = decodeLatin1(u8).trim();
    if (/^[0-9a-fA-F]+$/.test(t) && HASH_LENGTHS[t.length]) notes.push(`${t.length} hex characters, which is the length of ${HASH_LENGTHS[t.length]} hashes. A hash cannot be decoded.`);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) notes.push('This is a UUID, an identifier rather than encoded data.');
    if (/^\$(?:2[aby]|argon2\w*|5|6|1|y)\$/.test(t)) notes.push('This looks like a password hash (crypt format), which cannot be decoded.');
  }
  if (!a.text && !a.file && u8.length >= 32) {
    // No structure and near-uniform byte values: encrypted, or compressed without a header.
    const sample = u8.subarray(0, 65536), h = entropy(sample), n = sample.length;
    const expected = n >= 256 ? 8 - 184 / n : Math.log2(n) - 0.15;   // what uniformly random bytes give for a sample this size
    if (h >= expected - 0.35) {
      const block = u8.length % 16 === 0 ? 'a multiple of 16 bytes, as a 128-bit block cipher (AES, Camellia, Twofish, SM4) produces'
        : u8.length % 8 === 0 ? 'a multiple of 8 bytes, as a 64-bit block cipher (DES, Triple DES, Blowfish) produces'
          : 'not block-aligned, which fits a stream cipher, an AEAD mode or headerless compression';
      notes.push(`High-entropy data with no recognisable structure (${h.toFixed(2)} bits/byte, ${u8.length} bytes): probably encrypted (or compressed without a header). Its length is ${block}. Encrypted data cannot be decoded without the key.`);
    }
  }
  if (a.text && (a.lang || 0) < 0.4) {
    // Letter statistics separate simple substitution / transposition from polyalphabetic ciphers.
    const letters = decodeLatin1(u8.subarray(0, 20000)).toUpperCase().replace(/[^A-Z]/g, '');
    const solid = decodeLatin1(u8.subarray(0, 20000)).replace(/\s/g, '').length;
    if (letters.length >= 80 && letters.length / solid >= 0.9) {
      const counts = new Array(26).fill(0);
      for (const ch of letters) counts[ch.charCodeAt(0) - 65]++;
      const ic = counts.reduce((sum, c) => sum + c * (c - 1), 0) / (letters.length * (letters.length - 1));
      if (ic >= 0.058) notes.push(`Letters only, with English-like letter frequencies (index of coincidence ${ic.toFixed(3)}): probably a monoalphabetic substitution or a transposition cipher. A substitution needs its key; frequency analysis is the usual way in.`);
      else if (ic <= 0.05) notes.push(`Letters only, with flattened letter frequencies (index of coincidence ${ic.toFixed(3)}): probably a polyalphabetic cipher such as Vigenère, Beaufort or Autokey, which needs its key.`);
    }
  }
  return notes;
}

// A self-validating decode (for example a verified checksum) is trusted even when its output is not readable.
const confidenceOf = n => n.path.length ? Math.max(n.a.q, n.trust || 0) * (0.75 + 0.25 * n.minFit) * Math.pow(0.985, n.path.length - 1) : n.a.q;

export async function search(data, depth = 3, intensive = false, crib = null, beam = 14, limitNodes = 600) {
  let cribRe = null;
  if (crib) { try { cribRe = new RegExp(crib, 'i'); } catch { throw new Error('Crib is not a valid regular expression'); } }
  const started = Date.now();
  const root = { data, path: [], labels: [], parent: null, children: [], minFit: 1, a: assess(data), depth: 0 };
  const seen = new Set([fingerprint(data)]);
  const all = [root];
  let level = [root], executed = 0, exhausted = false;

  const run = async (name, args, input) => {
    executed++;
    const mod = MODULES[name];
    const [out, html] = await callModule(mod, input, resolveArgs(mod, args, new Map()));
    return html ? null : out;
  };

  for (let d = 0; d < depth && level.length && !exhausted; d++) {
    const next = [];
    for (const node of level) {
      if (node.data.length > MAX_EXPAND_BYTES) continue;
      const push = (c, out, a) => {
        const child = { data: out, path: [...node.path, [c.name, c.args]], labels: [...node.labels, stepLabel(c)], parent: node, children: [],
          minFit: Math.min(node.minFit, c.fit), a, depth: node.depth + 1, weak: !!c.weak, speculative: false, trust: c.trust || 0 };
        node.children.push(child); next.push(child); all.push(child);
        return child;
      };
      const accept = async (c, out, speculative = false) => {
        if (!out || !out.length || sameBytes(out, node.data)) return;
        const key = fingerprint(out);
        if (seen.has(key)) return;
        const a = assess(out);
        // A weak cipher is only believable when its output is clearly more meaningful than its input.
        const improves = a.q >= 0.6 && (a.q - node.a.q >= 0.2 || (a.lang || 0) - (node.a.lang || 0) >= 0.3);
        if (c.weak && !improves && !speculative) return;
        // Trying hundreds of keys always finds one that scores well by luck; real words are the evidence that counts.
        if (c.needsWords && knownWords(decodeLatin1(out.subarray(0, SAMPLE))) < c.needsWords) return;
        if (c.verify && !c.verify(out)) return;
        // Headerless formats "succeed" on junk now and then, so the output has to stand on its own.
        if (c.needsQuality && (out.length < Math.max(8, node.data.length / 4) || (a.q < 0.5 && !candidates(out, a).some(x => !x.weak && !x.needsQuality && x.fit >= 0.85)))) return;
        seen.add(key);
        push(c, out, a).speculative = c.weak && !improves;
      };

      for (const c of candidates(node.data, node.a)) {
        if (executed >= limitNodes || Date.now() - started > TIME_BUDGET_MS) { exhausted = true; break; }
        if (c.weak && (node.weak || node.speculative)) continue;
        if (c.fallback && node.children.length) continue;
        try {
          if (c.variants) {
            // A small keyspace: score every key on a sample and only keep the best one.
            if (c.whole && node.data.length > 6000) continue;
            const sample = c.whole ? node.data : node.data.subarray(0, 400);
            const mod = MODULES[c.name];
            let best = null, bestScore = -1;
            for (const v of c.variants) {
              let out;
              try { [out] = await callModule(mod, sample, resolveArgs(mod, v.args, new Map())); } catch { continue; }
              if (!out || !out.length) continue;
              const r = assess(out), score = r.q + (r.lang || 0);
              if (score > bestScore) { bestScore = score; best = v; }
            }
            if (best) { const chosen = { ...c, args: best.args, label: best.label }; await accept(chosen, await run(chosen.name, chosen.args, node.data)); }
          } else if (c.speculative && node.depth === 0) {
            // Kept provisionally: it only survives if what follows decodes into something meaningful.
            await accept(c, await run(c.name, c.args, node.data), true);
          } else {
            await accept(c, await run(c.name, c.args, node.data));
          }
        } catch { /* this operation rejected the data */ }
      }

      if (intensive && node.a.q < 0.5 && node.data.length >= 4) {
        const head = node.data.subarray(0, 256);
        for (let k = 1; k < 256; k++) {
          let printable = 0;
          for (const b of head) { const c = b ^ k; if ((c >= 32 && c < 127) || c === 9 || c === 10 || c === 13) printable++; }
          if (printable / head.length < 0.95) continue;
          const key = k.toString(16).padStart(2, '0');
          await accept({ name: 'XOR', args: [{ string: key, option: 'Hex' }, 'Standard', false], fit: 0.6, weak: true }, node.data.map(b => b ^ k));
        }
      }
    }
    // Keep the nodes that are either meaningful already or strongly look like another encoded layer.
    for (const n of next) {
      const pending = n.depth < depth ? Math.max(0, ...candidates(n.data, n.a).filter(c => !c.weak).map(c => c.fit)) : 0;
      n.promise = Math.max(n.a.q, 0.9 * pending, n.speculative ? 0.5 : 0);
    }
    next.sort((x, y) => y.promise - x.promise);
    level = next.slice(0, beam);
  }

  // Confidence, then demote layers that decode further into something at least as meaningful.
  for (const n of all) n.conf = confidenceOf(n);
  for (let i = all.length - 1; i >= 0; i--) {
    const n = all[i];
    n.best = Math.max(n.conf, ...n.children.map(c => c.best));
    n.deeper = Math.max(0, ...n.children.map(c => c.best));
  }
  const results = [];
  for (const n of all) {
    if (n.speculative && n.deeper < 0.6) continue;
    let conf = n.conf;
    const intermediate = n.deeper >= 0.5 && n.deeper >= conf * 0.85;
    if (intermediate) conf *= 0.5;
    if (n.speculative) conf = Math.min(conf, 0.3);
    n.intermediate = intermediate;
    n.matchesCrib = !!cribRe && cribRe.test(decodeLatin1(n.data.subarray(0, 1 << 20)));
    if (n.matchesCrib) conf = 1 - (1 - conf) * 0.25;
    n.final = conf;
    results.push(n);
  }
  results.sort((x, y) => (y.final - x.final) || (x.path.length - y.path.length));

  const stagesOf = n => {
    const chain = [];
    for (let p = n; p.parent; p = p.parent) chain.unshift(p);
    return chain.map((p, i) => ({ name: p.path[i][0], args: p.path[i][1], label: p.labels[i], data: p.data, kind: p.a.kind, text: !!p.a.text, quality: Math.round(p.a.q * 100) }));
  };
  return results.map((n, i) => ({
    data: n.data, path: n.path, score: Math.round(n.final * 1000) / 10, kind: n.a.kind, text: !!n.a.text, intermediate: n.intermediate,
    matchesCrib: n.matchesCrib, stages: stagesOf(n),
    // Follow-up analysis and identification are worked out for the input and the leading results only.
    ...(i < 8 || !n.parent ? { analyses: suggestions(n.data, n.a), notes: identify(n.data, n.a) } : { analyses: [], notes: [] }),
    ...(n.parent ? {} : { truncated: exhausted }),
  }));
}

export function verdict(score) {
  return score >= 80 ? 'Very likely' : score >= 60 ? 'Likely' : score >= 40 ? 'Possible' : score >= 20 ? 'Unlikely' : 'Very unlikely';
}
