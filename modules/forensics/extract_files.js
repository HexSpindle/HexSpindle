import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodeUtf8 } from '../../core/util.js';

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DEXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CLORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

function buildHuffman(lengths) {
  let maxBits = 0;
  for (const l of lengths) if (l > maxBits) maxBits = l;
  const blCount = new Array(maxBits + 1).fill(0);
  for (const l of lengths) if (l) blCount[l]++;
  const nextCode = new Array(maxBits + 1).fill(0);
  let code = 0;
  for (let bits = 1; bits <= maxBits; bits++) { code = (code + blCount[bits - 1]) << 1; nextCode[bits] = code; }
  const map = new Map();
  for (let sym = 0; sym < lengths.length; sym++) {
    const len = lengths[sym];
    if (len) { map.set(len + ':' + nextCode[len], sym); nextCode[len]++; }
  }
  return { map, maxBits: maxBits || 1 };
}

let FIXED_LIT = null, FIXED_DIST = null;
function fixedTables() {
  if (!FIXED_LIT) {
    const lit = new Array(288);
    for (let i = 0; i < 144; i++) lit[i] = 8;
    for (let i = 144; i < 256; i++) lit[i] = 9;
    for (let i = 256; i < 280; i++) lit[i] = 7;
    for (let i = 280; i < 288; i++) lit[i] = 8;
    FIXED_LIT = buildHuffman(lit);
    FIXED_DIST = buildHuffman(new Array(30).fill(5));
  }
  return [FIXED_LIT, FIXED_DIST];
}

function deflateEnd(data, startByte) {
  let bitPos = startByte * 8;
  const limit = data.length * 8;
  function bits(n) {
    if (bitPos + n > limit) throw new RangeError('truncated deflate stream');
    let v = 0;
    for (let i = 0; i < n; i++) { const bi = bitPos >> 3, bo = bitPos & 7; v |= ((data[bi] >> bo) & 1) << i; bitPos++; }
    return v;
  }
  function sym(h) {
    let code = 0, len = 0;
    while (len < h.maxBits) { code = (code << 1) | bits(1); len++; const s = h.map.get(len + ':' + code); if (s !== undefined) return s; }
    throw new Error('invalid Huffman code');
  }
  for (;;) {
    const bfinal = bits(1), btype = bits(2);
    if (btype === 0) {
      bitPos = (bitPos + 7) & ~7;
      const len = bits(16); bits(16);
      if (bitPos + len * 8 > limit) throw new RangeError('truncated stored block');
      bitPos += len * 8;
    } else if (btype === 1 || btype === 2) {
      let litTree, distTree;
      if (btype === 1) { [litTree, distTree] = fixedTables(); }
      else {
        const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
        const clLens = new Array(19).fill(0);
        for (let i = 0; i < hclen; i++) clLens[CLORDER[i]] = bits(3);
        const clTree = buildHuffman(clLens);
        const lens = [];
        while (lens.length < hlit + hdist) {
          const s = sym(clTree);
          if (s < 16) lens.push(s);
          else if (s === 16) { const r = bits(2) + 3, prev = lens[lens.length - 1]; for (let k = 0; k < r; k++) lens.push(prev); }
          else if (s === 17) { const r = bits(3) + 3; for (let k = 0; k < r; k++) lens.push(0); }
          else { const r = bits(7) + 11; for (let k = 0; k < r; k++) lens.push(0); }
        }
        litTree = buildHuffman(lens.slice(0, hlit));
        distTree = buildHuffman(lens.slice(hlit, hlit + hdist));
      }
      for (;;) {
        const s = sym(litTree);
        if (s === 256) break;
        if (s > 256) { bits(LEXTRA[s - 257]); const ds = sym(distTree); bits(DEXTRA[ds]); }
      }
    } else {
      throw new Error('invalid block type');
    }
    if (bfinal) break;
  }
  return Math.ceil(bitPos / 8);
}

function gzipMemberEnd(data, s) {
  try {
    if (!(data[s] === 0x1f && data[s + 1] === 0x8b && data[s + 2] === 8)) return -1;
    const flg = data[s + 3];
    let off = s + 10;
    if (flg & 4) { if (off + 2 > data.length) return -1; const xlen = data[off] | (data[off + 1] << 8); off += 2 + xlen; }
    if (flg & 8) { while (off < data.length && data[off] !== 0) off++; off++; }
    if (flg & 16) { while (off < data.length && data[off] !== 0) off++; off++; }
    if (flg & 2) off += 2;
    const end = deflateEnd(data, off) + 8; // + CRC32 + ISIZE trailer
    return end <= data.length ? end : -1;
  } catch { return -1; }
}

// --- Byte carving -----------------------------------------------------------------------------
function matchesLit(data, i, pat) {
  if (i + pat.length > data.length) return false;
  for (let j = 0; j < pat.length; j++) if (data[i + j] !== pat[j]) return false;
  return true;
}
function indexOfBytes(data, pat, from) {
  outer: for (let i = from; i <= data.length - pat.length; i++) {
    for (let j = 0; j < pat.length; j++) if (data[i + j] !== pat[j]) continue outer;
    return i;
  }
  return -1;
}
function findAllNonOverlap(data, testAt) {
  const out = [];
  let i = 0;
  while (i <= data.length) {
    const len = testAt(i);
    if (len) { out.push([i, len]); i += len; } else i++;
  }
  return out;
}

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_END = new Uint8Array([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
const PDF_SIG = encodeUtf8('%PDF-');
const PDF_END = encodeUtf8('%%EOF');
const ZIP_SIG = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const EOCD_SIG = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
const GZ_SIG = new Uint8Array([0x1f, 0x8b, 0x08]);

function carve(data) {
  const defs = [
    ['JPEG image', 'jpg', (i) => (data[i] === 0xff && data[i + 1] === 0xd8 && data[i + 2] === 0xff) ? 3 : 0, new Uint8Array([0xff, 0xd9])],
    ['PNG image', 'png', (i) => matchesLit(data, i, PNG_SIG) ? PNG_SIG.length : 0, PNG_END],
    ['GIF image', 'gif', (i) => (data[i] === 0x47 && data[i + 1] === 0x49 && data[i + 2] === 0x46 && data[i + 3] === 0x38 && (data[i + 4] === 0x37 || data[i + 4] === 0x39) && data[i + 5] === 0x61) ? 6 : 0, new Uint8Array([0x00, 0x3b])],
    ['PDF document', 'pdf', (i) => matchesLit(data, i, PDF_SIG) ? PDF_SIG.length : 0, PDF_END],
    ['ZIP archive', 'zip', (i) => matchesLit(data, i, ZIP_SIG) ? ZIP_SIG.length : 0, null],
    ['GZIP archive', 'gz', (i) => matchesLit(data, i, GZ_SIG) ? GZ_SIG.length : 0, null],
  ];
  const res = [];
  for (const [name, ext, test, end] of defs) {
    for (const [s, mlen] of findAllNonOverlap(data, test)) {
      let e;
      if (end !== null) {
        e = indexOfBytes(data, end, s + mlen);
        if (e === -1) continue;
        e += end.length;
      } else if (ext === 'zip') {
        e = indexOfBytes(data, EOCD_SIG, s);
        if (e === -1) continue;
        e += (e + 22 <= data.length) ? 22 + (data[e + 20] | (data[e + 21] << 8)) : data.length;
      } else {
        e = gzipMemberEnd(data, s);
        if (e === -1) continue;
      }
      res.push([s, e, name, ext]);
    }
  }
  res.sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0) || (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0));
  return res;
}

module('Extract Files', 'Carves embedded JPEG/PNG/GIF/PDF/ZIP/GZIP files out of the input. Lists them, or outputs one by index.',
  [A.number('Extract file number (0 = list)', 0, 0)],
  (data, idx) => {
    const files = carve(data);
    if (idx) {
      if (!(idx >= 1 && idx <= files.length)) throw new Error(`No file #${idx}: ${files.length} file(s) were found (use 0 to list them)`);
      const [s, e] = files[idx - 1];
      return data.subarray(s, Math.min(e, data.length));
    }
    return files.map(([s, e, n], i) => `#${i + 1}: ${n} at offset ${s} (0x${s.toString(16)}), ${Math.min(e, data.length) - s} bytes`).join('\n');
  });
