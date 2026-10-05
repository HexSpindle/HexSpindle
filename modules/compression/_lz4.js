import { xxh32 } from './_xxhash.js';
import { concat } from './_bytes.js';

const MINMATCH = 4;

export function lz4BlockCompress(data) {
  const n = data.length;
  const out = [];
  const hash = new Map();
  let anchor = 0, i = 0;
  const matchEndLimit = n - 5;
  const mfLimit = matchEndLimit - MINMATCH;

  while (i <= mfLimit) {
    const key = readU32(data, i);
    const cand = hash.get(key);
    hash.set(key, i);
    if (cand !== undefined && i - cand < 0xFFFF && readU32(data, cand) === key) {
      let mlen = MINMATCH;
      const max = matchEndLimit - i;
      while (mlen < max && data[cand + mlen] === data[i + mlen]) mlen++;
      emitSequence(out, data, anchor, i, i - cand, mlen - MINMATCH);
      let j = i + 1;
      const end = i + mlen;
      while (j < end && j <= mfLimit) { hash.set(readU32(data, j), j); j++; }
      i += mlen;
      anchor = i;
    } else {
      i++;
    }
  }
  emitLastLiterals(out, data, anchor, n);
  return Uint8Array.from(out);
}

function readU32(data, i) { return (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0; }

function pushLen(out, len) {
  while (len >= 255) { out.push(255); len -= 255; }
  out.push(len);
}

function emitSequence(out, data, litStart, matchStart, offset, extraMatchLen) {
  const litLen = matchStart - litStart;
  out.push((Math.min(litLen, 15) << 4) | Math.min(extraMatchLen, 15));
  if (litLen >= 15) pushLen(out, litLen - 15);
  for (let k = 0; k < litLen; k++) out.push(data[litStart + k]);
  out.push(offset & 0xFF, (offset >> 8) & 0xFF);
  if (extraMatchLen >= 15) pushLen(out, extraMatchLen - 15);
}

function emitLastLiterals(out, data, start, end) {
  const litLen = end - start;
  const tokenIdx = out.length;
  out.push(Math.min(litLen, 15) << 4);
  if (litLen >= 15) pushLen(out, litLen - 15);
  for (let k = start; k < end; k++) out.push(data[k]);
}

export function lz4BlockDecompress(data, expectedSize = -1) {
  const out = expectedSize >= 0 ? new Uint8Array(expectedSize) : [];
  let o = 0;
  const outArr = expectedSize >= 0 ? out : [];
  let i = 0;
  const n = data.length;
  while (i < n) {
    const token = data[i++];
    let litLen = token >> 4;
    if (litLen === 15) { let b; do { b = data[i++]; litLen += b; } while (b === 255); }
    for (let k = 0; k < litLen; k++) { if (expectedSize >= 0) out[o++] = data[i + k]; else outArr.push(data[i + k]); }
    i += litLen;
    if (i >= n) break; // last sequence: literals only
    const offset = data[i] | (data[i + 1] << 8);
    i += 2;
    let matchLen = (token & 0x0F) + MINMATCH;
    if ((token & 0x0F) === 15) { let b; do { b = data[i++]; matchLen += b; } while (b === 255); }
    let from = expectedSize >= 0 ? o - offset : outArr.length - offset;
    for (let k = 0; k < matchLen; k++) {
      if (expectedSize >= 0) { out[o] = out[from]; o++; from++; }
      else { outArr.push(outArr[from]); from++; }
    }
  }
  return expectedSize >= 0 ? out.subarray(0, o) : Uint8Array.from(outArr);
}

const FRAME_MAGIC = 0x184D2204;

export function lz4FrameCompress(data) {
  const BLOCK_MAX = 4 << 20; // 4MB, well above our use, so always a single block
  const flg = 0b01100000; // version=01, block independence=1, rest off
  const bd = 0x40; // block max size code 4 (64KB..4MB bucket, unchecked by decoders when indep=1)
  const headerTail = Uint8Array.from([flg, bd]);
  const hc = (xxh32(headerTail, 0) >> 8) & 0xFF;
  const parts = [u32leArr(FRAME_MAGIC), headerTail, Uint8Array.from([hc])];
  for (let off = 0; off < data.length || data.length === 0; off += BLOCK_MAX) {
    const chunk = data.subarray(off, Math.min(off + BLOCK_MAX, data.length));
    const comp = lz4BlockCompress(chunk);
    if (comp.length < chunk.length) {
      parts.push(u32leArr(comp.length), comp);
    } else {
      parts.push(u32leArr(chunk.length | 0x80000000), chunk);
    }
    if (data.length === 0) break;
  }
  parts.push(u32leArr(0)); // end mark
  return concat(...parts);
}

export function lz4FrameDecompress(data) {
  const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (d.getUint32(0, true) !== FRAME_MAGIC) throw new Error('Not a valid LZ4 frame (bad magic number)');
  const flg = data[4], bd = data[5];
  const version = (flg >> 6) & 0x3;
  if (version !== 1) throw new Error('Unsupported LZ4 frame version');
  const blockChecksumFlag = (flg >> 4) & 1;
  const contentSizeFlag = (flg >> 3) & 1;
  const contentChecksumFlag = (flg >> 2) & 1;
  const dictIdFlag = flg & 1;
  let p = 6;
  if (contentSizeFlag) p += 8;
  if (dictIdFlag) p += 4;
  p += 1; // header checksum byte
  const chunks = [];
  while (p < data.length) {
    const blockSize = d.getUint32(p, true); p += 4;
    if (blockSize === 0) break;
    const uncompressedFlag = (blockSize & 0x80000000) !== 0;
    const size = blockSize & 0x7FFFFFFF;
    const block = data.subarray(p, p + size); p += size;
    if (blockChecksumFlag) p += 4;
    chunks.push(uncompressedFlag ? block : lz4BlockDecompress(block));
  }
  return concat(...chunks);
}

function u32leArr(n) { return Uint8Array.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
