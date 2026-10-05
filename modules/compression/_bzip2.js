class BitReader {
  constructor(data) { this.data = data; this.bytePos = 0; this.bitPos = 0; }
  readBit() {
    const byte = this.data[this.bytePos] || 0;
    const bit = (byte >> (7 - this.bitPos)) & 1;
    this.bitPos++;
    if (this.bitPos === 8) { this.bitPos = 0; this.bytePos++; }
    return bit;
  }
  readBits(n) {
    let v = 0;
    for (let i = 0; i < n; i++) v = v * 2 + this.readBit();
    return v;
  }
  atEnd() { return this.bytePos >= this.data.length; }
}

function buildCanonical(lengths) {
  let maxLen = 0;
  for (const l of lengths) if (l > maxLen) maxLen = l;
  const blCount = new Array(maxLen + 1).fill(0);
  for (const l of lengths) if (l > 0) blCount[l]++;
  const nextCode = new Array(maxLen + 1).fill(0);
  let code = 0;
  for (let bits = 1; bits <= maxLen; bits++) {
    code = (code + (blCount[bits - 1] || 0)) << 1;
    nextCode[bits] = code;
  }
  const table = new Map();
  for (let sym = 0; sym < lengths.length; sym++) {
    const len = lengths[sym];
    if (len === 0) continue;
    const c = nextCode[len]++;
    table.set(len * (1 << 21) + c, sym);
  }
  return table;
}

function decodeSymbol(br, table) {
  let code = 0, len = 0;
  for (;;) {
    code = code * 2 + br.readBit();
    len++;
    const sym = table.get(len * (1 << 21) + code);
    if (sym !== undefined) return sym;
    if (len > 23) throw new Error('Corrupt bzip2 data: no matching Huffman code');
  }
}

const BLOCK_MAGIC = 0x314159265359;
const END_MAGIC = 0x177245385090;

function decodeBlock(br, blockSize100k) {
  br.readBits(32); // block CRC (not verified)
  if (br.readBits(1)) throw new Error('Randomized blocks (a deprecated, pre-0.9.5 bzip2 feature) are not supported');
  const origPtr = br.readBits(24);

  const used16 = br.readBits(16);
  const symMap = [];
  for (let i = 0; i < 16; i++) {
    if (used16 & (1 << (15 - i))) {
      const bits = br.readBits(16);
      for (let j = 0; j < 16; j++) if (bits & (1 << (15 - j))) symMap.push(i * 16 + j);
    }
  }
  const nUsed = symMap.length;
  const alphaSize = nUsed + 2;
  const eob = alphaSize - 1;

  const nGroups = br.readBits(3);
  if (nGroups < 2 || nGroups > 6) throw new Error('Corrupt bzip2 data: bad number of Huffman groups');
  const nSelectors = br.readBits(15);

  const selectorMtf = [];
  for (let i = 0; i < nSelectors; i++) {
    let j = 0;
    while (br.readBit() === 1) j++;
    selectorMtf.push(j);
  }
  const pos = Array.from({ length: nGroups }, (_, i) => i);
  const selectors = selectorMtf.map((v) => {
    const sym = pos[v];
    pos.splice(v, 1);
    pos.unshift(sym);
    return sym;
  });

  const tables = [];
  for (let g = 0; g < nGroups; g++) {
    let curr = br.readBits(5);
    const lengths = new Array(alphaSize);
    for (let sym = 0; sym < alphaSize; sym++) {
      for (;;) {
        if (br.readBit() === 0) break;
        if (br.readBit() === 0) curr++; else curr--;
      }
      lengths[sym] = curr;
    }
    tables.push(buildCanonical(lengths));
  }

  const bwt = [];
  let mtf = symMap.slice();
  let groupPos = 0, groupIdx = -1, currentTable = null;
  let runLength = 0, runBit = 0;
  const flushRun = () => { if (runLength > 0) { const v = mtf[0]; for (let k = 0; k < runLength; k++) bwt.push(v); runLength = 0; runBit = 0; } };

  for (;;) {
    if (groupPos === 0) { groupIdx++; currentTable = tables[selectors[groupIdx]]; groupPos = 50; }
    groupPos--;
    const sym = decodeSymbol(br, currentTable);
    if (sym === eob) { flushRun(); break; }
    if (sym === 0 || sym === 1) {
      runLength += (sym === 0 ? 1 : 2) << runBit;
      runBit++;
      continue;
    }
    flushRun();
    const idx = sym - 1;
    const v = mtf[idx];
    mtf.splice(idx, 1);
    mtf.unshift(v);
    bwt.push(v);
  }

  if (bwt.length === 0) return new Uint8Array(0);
  const n = bwt.length;
  const counts = new Uint32Array(256);
  for (const b of bwt) counts[b]++;
  const base = new Uint32Array(256);
  let sum = 0;
  for (let c = 0; c < 256; c++) { base[c] = sum; sum += counts[c]; }
  const next = new Uint32Array(n);
  const running = base.slice();
  for (let i = 0; i < n; i++) { const b = bwt[i]; next[running[b]] = i; running[b]++; }
  const t = new Uint8Array(n);
  let p = next[origPtr];
  for (let i = 0; i < n; i++) { t[i] = bwt[p]; p = next[p]; }

  const out = [];
  let i = 0;
  while (i < n) {
    const b = t[i];
    let runLen = 1;
    while (i + runLen < n && t[i + runLen] === b && runLen < 4) runLen++;
    for (let k = 0; k < runLen; k++) out.push(b);
    i += runLen;
    if (runLen === 4) {
      const extra = t[i]; i++;
      for (let k = 0; k < extra; k++) out.push(b);
    }
  }
  void blockSize100k;
  return Uint8Array.from(out);
}

export function bzip2Decompress(data) {
  if (data.length < 4 || data[0] !== 0x42 || data[1] !== 0x5A || data[2] !== 0x68) throw new Error('Not valid bzip2 data (missing "BZh" header)');
  const level = data[3] - 0x30;
  if (level < 1 || level > 9) throw new Error('Not valid bzip2 data (bad block-size digit)');
  const br = new BitReader(data);
  br.readBits(32); // consume header bytes already inspected above
  const blocks = [];
  for (;;) {
    const magic = br.readBits(48);
    if (magic === BLOCK_MAGIC) {
      blocks.push(decodeBlock(br, level));
    } else if (magic === END_MAGIC) {
      br.readBits(32); // combined stream CRC (not verified)
      break;
    } else {
      throw new Error('Corrupt bzip2 data: bad block magic number');
    }
  }
  const total = blocks.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of blocks) { out.set(b, off); off += b.length; }
  return out;
}
