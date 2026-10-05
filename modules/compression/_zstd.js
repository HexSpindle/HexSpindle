import { concat } from './_bytes.js';
import { decompress as fzstdDecompress } from './_fzstd.mjs';

const MAGIC = 0xFD2FB528;
const MAX_BLOCK_SIZE = 1 << 17; // 128KB, the zstd format's block size ceiling

const M64 = (1n << 64n) - 1n;
const P1 = 11400714785074694791n, P2 = 14029467366897019727n, P3 = 1609587929392839161n, P4 = 9650029242287828579n, P5 = 2870177450012600261n;
const rotl = (x, r) => ((x << BigInt(r)) | (x >> BigInt(64 - r))) & M64;
const round = (acc, v) => (rotl((acc + v * P2) & M64, 31) * P1) & M64;
const merge = (acc, v) => (((acc ^ round(0n, v)) * P1) + P4) & M64;
function xxh64(b) {
  const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = b.length;
  let p = 0, h;
  if (n >= 32) {
    let v1 = (P1 + P2) & M64, v2 = P2, v3 = 0n, v4 = (M64 + 1n - P1) & M64;
    for (; p + 32 <= n; p += 32) {
      v1 = round(v1, d.getBigUint64(p, true)); v2 = round(v2, d.getBigUint64(p + 8, true));
      v3 = round(v3, d.getBigUint64(p + 16, true)); v4 = round(v4, d.getBigUint64(p + 24, true));
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) & M64;
    h = merge(merge(merge(merge(h, v1), v2), v3), v4);
  } else h = P5;
  h = (h + BigInt(n)) & M64;
  for (; p + 8 <= n; p += 8) h = (rotl(h ^ round(0n, d.getBigUint64(p, true)), 27) * P1 + P4) & M64;
  if (p + 4 <= n) { h = (rotl(h ^ ((BigInt(d.getUint32(p, true)) * P1) & M64), 23) * P2 + P3) & M64; p += 4; }
  for (; p < n; p++) h = (rotl(h ^ ((BigInt(b[p]) * P5) & M64), 11) * P1) & M64;
  h = ((h ^ (h >> 33n)) * P2) & M64;
  h = ((h ^ (h >> 29n)) * P3) & M64;
  return h ^ (h >> 32n);
}

const truncated = () => new Error('Corrupt Zstandard frame: unexpected end of data');

export function zstdDecompress(data) {
  if (data.length < 4) throw new Error('Not valid Zstandard data: too short');
  const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const out = [];
  let p = 0;
  while (p < data.length) {
    if (data.length - p < 4) throw truncated();
    const magic = d.getUint32(p, true);
    if ((magic & 0xFFFFFFF0) === 0x184D2A50) { // skippable frame
      if (data.length - p < 8) throw truncated();
      p += 8 + d.getUint32(p + 4, true);
      if (p > data.length) throw truncated();
      continue;
    }
    if (magic !== MAGIC) throw new Error(p === 0 ? 'Not valid Zstandard data: bad magic number' : 'Corrupt Zstandard data: trailing bytes after the last frame');
    const frameStart = p;
    p += 4;
    if (p >= data.length) throw truncated();
    const fhd = data[p++];
    if (fhd & 0x08) throw new Error('Corrupt Zstandard frame: reserved header bit set');
    const dictIdFlag = fhd & 0x3;
    const checksumFlag = (fhd >> 2) & 1;
    const singleSegment = (fhd >> 5) & 1;
    const fcsFlag = (fhd >> 6) & 3;
    if (!singleSegment) p += 1; // window descriptor
    const dictIdSize = [0, 1, 2, 4][dictIdFlag];
    let dictId = 0;
    for (let i = 0; i < dictIdSize; i++) dictId |= data[p + i] << (8 * i);
    p += dictIdSize;
    const fcsSize = singleSegment ? [1, 2, 4, 8][fcsFlag] : [0, 2, 4, 8][fcsFlag];
    if (p + fcsSize > data.length) throw truncated();
    let contentSize = -1;
    if (fcsSize > 0) {
      let v = 0n;
      for (let i = 0; i < fcsSize; i++) v |= BigInt(data[p + i]) << BigInt(8 * i);
      if (fcsSize === 2) v += 256n;
      contentSize = Number(v);
      p += fcsSize;
    }
    if (dictId) throw new Error(`This Zstandard frame needs dictionary ${dictId >>> 0}, which isn't supported`);
    for (;;) {
      if (p + 3 > data.length) throw truncated();
      const h = data[p] | (data[p + 1] << 8) | (data[p + 2] << 16);
      p += 3;
      const blockType = (h >> 1) & 3;
      if (blockType === 3) throw new Error('Corrupt Zstandard frame: reserved block type');
      p += blockType === 1 ? 1 : h >>> 3;
      if (p > data.length) throw truncated();
      if (h & 1) break;
    }
    const frameEnd = p + (checksumFlag ? 4 : 0);
    if (frameEnd > data.length) throw truncated();
    let frameOut;
    try {
      frameOut = fzstdDecompress(data.subarray(frameStart, frameEnd));
    } catch (e) {
      throw new Error(`Corrupt Zstandard frame: ${e.message}`);
    }
    if (contentSize >= 0 && frameOut.length !== contentSize) throw new Error(`Corrupt Zstandard frame: decoded ${frameOut.length} bytes but header declared ${contentSize}`);
    if (checksumFlag && Number(xxh64(frameOut) & 0xFFFFFFFFn) !== d.getUint32(p, true)) throw new Error('Corrupt Zstandard frame: content checksum mismatch');
    out.push(frameOut);
    p = frameEnd;
  }
  return concat(...out);
}

export function zstdStoreCompress(data) {
  const n = data.length;
  let fcsFlag, fcsSize;
  if (n < 256) { fcsFlag = 0; fcsSize = 1; }
  else if (n < 65536 + 256) { fcsFlag = 1; fcsSize = 2; }
  else if (n < 0x100000000) { fcsFlag = 2; fcsSize = 4; }
  else { fcsFlag = 3; fcsSize = 8; }
  const fhd = (fcsFlag << 6) | (1 << 5); // single-segment, no checksum, no dictionary
  const header = new Uint8Array(1 + fcsSize);
  header[0] = fhd;
  let stored = fcsSize === 2 ? BigInt(n) - 256n : BigInt(n);
  for (let i = 0; i < fcsSize; i++) { header[1 + i] = Number(stored & 0xFFn); stored >>= 8n; }
  const magic = new Uint8Array([MAGIC & 0xFF, (MAGIC >>> 8) & 0xFF, (MAGIC >>> 16) & 0xFF, (MAGIC >>> 24) & 0xFF]);

  const blocks = [];
  let off = 0;
  if (n === 0) {
    blocks.push(Uint8Array.from([1, 0, 0])); // one empty, last, Raw block
  }
  while (off < n) {
    const end = Math.min(off + MAX_BLOCK_SIZE, n);
    const chunk = data.subarray(off, end);
    const isLast = end === n;
    const allSame = chunk.every((b) => b === chunk[0]);
    if (allSame && chunk.length > 0) {
      const h = (isLast ? 1 : 0) | (1 << 1) | (chunk.length << 3);
      blocks.push(Uint8Array.from([h & 0xFF, (h >>> 8) & 0xFF, (h >>> 16) & 0xFF, chunk[0]]));
    } else {
      const h = (isLast ? 1 : 0) | (0 << 1) | (chunk.length << 3);
      blocks.push(Uint8Array.from([h & 0xFF, (h >>> 8) & 0xFF, (h >>> 16) & 0xFF]), chunk);
    }
    off = end;
  }
  return concat(magic, header, ...blocks);
}
