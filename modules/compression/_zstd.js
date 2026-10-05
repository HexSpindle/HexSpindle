import { concat } from './_bytes.js';

const MAGIC = 0xFD2FB528;
const MAX_BLOCK_SIZE = 1 << 17; // 128KB, the zstd format's block size ceiling

export function zstdDecompress(data) {
  if (data.length < 4) throw new Error('Not valid Zstandard data: too short');
  const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (d.getUint32(0, true) !== MAGIC) throw new Error('Not valid Zstandard data: bad magic number (skippable frames / dictionaries are not supported)');
  let p = 4;
  const fhd = data[p++];
  const dictIdFlag = fhd & 0x3;
  const checksumFlag = (fhd >> 2) & 1;
  const singleSegment = (fhd >> 5) & 1;
  const fcsFlag = (fhd >> 6) & 3;
  if (!singleSegment) p += 1; // window descriptor
  const dictIdSize = [0, 1, 2, 4][dictIdFlag];
  p += dictIdSize;
  const fcsSize = singleSegment ? [1, 2, 4, 8][fcsFlag] : [0, 2, 4, 8][fcsFlag];
  let contentSize = -1;
  if (fcsSize > 0) {
    let v = 0n;
    for (let i = 0; i < fcsSize; i++) v |= BigInt(data[p + i]) << BigInt(8 * i);
    if (fcsSize === 2) v += 256n;
    contentSize = Number(v);
    p += fcsSize;
  }

  const chunks = [];
  for (;;) {
    const h = data[p] | (data[p + 1] << 8) | (data[p + 2] << 16);
    p += 3;
    const lastBlock = h & 1;
    const blockType = (h >> 1) & 3;
    const blockSize = h >>> 3;
    if (blockType === 0) {
      chunks.push(data.subarray(p, p + blockSize));
      p += blockSize;
    } else if (blockType === 1) {
      const b = data[p]; p += 1;
      chunks.push(new Uint8Array(blockSize).fill(b));
    } else {
      throw new Error("This frame uses Zstandard's 'Compressed' block type (Huffman/FSE entropy coding), which isn't implemented in this browser-side port - only Raw and RLE blocks are supported");
    }
    if (lastBlock) break;
  }
  if (checksumFlag) p += 4;
  const out = concat(...chunks);
  if (contentSize >= 0 && out.length !== contentSize) throw new Error(`Corrupt Zstandard frame: decoded ${out.length} bytes but header declared ${contentSize}`);
  return out;
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
