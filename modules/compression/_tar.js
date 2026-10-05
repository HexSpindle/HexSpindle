import { encodeUtf8, decodeLatin1 } from '../../core/util.js';
import { concat } from './_bytes.js';

export const BLOCK = 512;

function octal(n, width) { return n.toString(8).padStart(width - 1, '0') + '\0'; }

export function buildHeader(name, size, typeflag = '0') {
  const h = new Uint8Array(BLOCK);
  const set = (str, off) => { const b = encodeUtf8(str); h.set(b.subarray(0, Math.min(b.length, 100)), off); };
  set(name, 0);
  h.set(encodeUtf8(octal(0o644, 8)), 100);
  h.set(encodeUtf8(octal(0, 8)), 108);
  h.set(encodeUtf8(octal(0, 8)), 116);
  h.set(encodeUtf8(octal(size, 12)), 124);
  h.set(encodeUtf8(octal(0, 12)), 136);
  h.fill(0x20, 148, 156); // checksum field spaces during calculation
  h[156] = typeflag.charCodeAt(0);
  h.set(encodeUtf8('ustar'), 257);
  h[262] = 0;
  h.set(encodeUtf8('00'), 263);
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += h[i];
  h.set(encodeUtf8(sum.toString(8).padStart(6, '0') + '\0 '), 148);
  return h;
}

export function padTo512(u8) {
  const rem = u8.length % BLOCK;
  return rem === 0 ? u8 : concat(u8, new Uint8Array(BLOCK - rem));
}

function cstr(u8) {
  const nul = u8.indexOf(0);
  return decodeLatin1(nul < 0 ? u8 : u8.subarray(0, nul));
}

function octalField(u8) {
  const s = cstr(u8).trim();
  if (!s) return 0;
  return parseInt(s, 8) || 0;
}

function parsePax(text) {
  const kv = {};
  let pos = 0;
  while (pos < text.length) {
    const sp = text.indexOf(' ', pos);
    if (sp < 0) break;
    const len = parseInt(text.slice(pos, sp), 10);
    if (!len || len <= sp - pos) break;
    const rec = text.slice(pos, pos + len);
    const eq = rec.indexOf('=');
    if (eq > 0) kv[rec.slice(sp - pos + 1, eq)] = rec.slice(eq + 1, len - 1);
    pos += len;
  }
  return kv;
}

export function parseTar(data) {
  const entries = [];
  let i = 0;
  let longName = null, pax = null;
  while (i + BLOCK <= data.length) {
    const block = data.subarray(i, i + BLOCK);
    if (block.every(b => b === 0)) break;
    const magic = decodeLatin1(block.subarray(257, 263));
    let name = cstr(block.subarray(0, 100));
    const prefix = magic.startsWith('ustar') ? cstr(block.subarray(345, 500)) : '';
    if (prefix) name = prefix + '/' + name;
    let size = octalField(block.subarray(124, 136));
    const typeflag = String.fromCharCode(block[156] || 0x30);
    i += BLOCK;
    const content = data.subarray(i, i + size);
    i += Math.ceil(size / BLOCK) * BLOCK;
    if (typeflag === 'L') { longName = decodeLatin1(content).replace(/\0+$/, ''); continue; }
    if (typeflag === 'x') { pax = parsePax(decodeLatin1(content)); continue; }
    if (typeflag === 'g') continue; // global pax header: rarely used, not applied
    if (pax) {
      if (pax.path) name = pax.path;
      if (pax.size) size = parseInt(pax.size, 10) || size;
      pax = null;
    }
    if (longName) { name = longName; longName = null; }
    entries.push({ name, size, typeflag, content: content.subarray(0, size) });
  }
  return entries;
}
