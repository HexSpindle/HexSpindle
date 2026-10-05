const kNumBitModelTotalBits = 11;
const kBitModelTotal = 1 << kNumBitModelTotalBits;
const kNumMoveBits = 5;
const kTopValue = 1 << 24;
const PROB_INIT = kBitModelTotal >> 1;

const kNumPosBitsMax = 4;
const kNumStates = 12;
const kNumLenToPosStates = 4;
const kNumAlignBits = 4;
const kEndPosModelIndex = 14;
const kNumFullDistances = 1 << (kEndPosModelIndex >> 1);
const kMatchMinLen = 2;

function newProbs(n) { return new Uint16Array(n).fill(PROB_INIT); }

class RangeDecoder {
  constructor(data, pos) {
    this.data = data;
    this.pos = pos + 1; // first byte is always 0 and is skipped
    this.range = 0xFFFFFFFF;
    this.code = 0;
    for (let i = 0; i < 4; i++) this.code = ((this.code << 8) | this.readByte()) >>> 0;
  }
  readByte() { return this.pos < this.data.length ? this.data[this.pos++] : 0; }
  normalize() {
    if ((this.range >>> 0) < kTopValue) {
      this.range = (this.range << 8) >>> 0;
      this.code = ((this.code << 8) | this.readByte()) >>> 0;
    }
  }
  decodeBit(probs, index) {
    const v = probs[index];
    const bound = (this.range >>> kNumBitModelTotalBits) * v;
    let bit;
    if ((this.code >>> 0) < bound) {
      this.range = bound;
      probs[index] = v + ((kBitModelTotal - v) >> kNumMoveBits);
      bit = 0;
    } else {
      this.range = (this.range - bound) >>> 0;
      this.code = (this.code - bound) >>> 0;
      probs[index] = v - (v >> kNumMoveBits);
      bit = 1;
    }
    this.normalize();
    return bit;
  }
  decodeDirectBits(numBits) {
    let res = 0;
    for (let i = 0; i < numBits; i++) {
      this.range = this.range >>> 1;
      this.code = (this.code - this.range) >>> 0;
      const t = 0 - (this.code >>> 31);
      this.code = (this.code + (this.range & t)) >>> 0;
      this.normalize();
      res = ((res << 1) + t + 1) >>> 0;
    }
    return res >>> 0;
  }
}

function bitTreeDecode(rc, probs, numBits) {
  let m = 1;
  for (let i = 0; i < numBits; i++) m = (m << 1) + rc.decodeBit(probs, m);
  return m - (1 << numBits);
}
function bitTreeReverseDecode(rc, probs, offset, numBits) {
  let m = 1, symbol = 0;
  for (let i = 0; i < numBits; i++) {
    const bit = rc.decodeBit(probs, offset + m);
    m = (m << 1) + bit;
    symbol |= bit << i;
  }
  return symbol;
}

class LenDecoder {
  constructor() {
    this.choice = newProbs(2);
    this.low = Array.from({ length: 1 << kNumPosBitsMax }, () => newProbs(8));
    this.mid = Array.from({ length: 1 << kNumPosBitsMax }, () => newProbs(8));
    this.high = newProbs(256);
  }
  decode(rc, posState) {
    if (rc.decodeBit(this.choice, 0) === 0) return bitTreeDecode(rc, this.low[posState], 3);
    if (rc.decodeBit(this.choice, 1) === 0) return 8 + bitTreeDecode(rc, this.mid[posState], 3);
    return 16 + bitTreeDecode(rc, this.high, 8);
  }
}

class OutWindow {
  constructor(size) { this.buf = new Uint8Array(Math.max(size, 4096)); this.pos = 0; }
  ensure(extra) {
    if (this.pos + extra > this.buf.length) {
      const next = new Uint8Array(Math.max(this.buf.length * 2, this.pos + extra));
      next.set(this.buf);
      this.buf = next;
    }
  }
  putByte(b) { this.ensure(1); this.buf[this.pos++] = b; }
  getByte(dist) { return this.buf[this.pos - dist]; }
  copyMatch(dist, len) { this.ensure(len); for (let i = 0; i < len; i++) { this.buf[this.pos] = this.buf[this.pos - dist]; this.pos++; } }
}

export function lzmaDecodeRaw(data, startPos, lc, lp, pb, outSize) {
  const rc = new RangeDecoder(data, startPos);
  const win = new OutWindow(outSize >= 0 ? outSize : 1 << 16);
  const pbMask = (1 << pb) - 1;
  const lpMask = (1 << lp) - 1;

  const isMatch = newProbs(kNumStates << kNumPosBitsMax);
  const isRep = newProbs(kNumStates);
  const isRepG0 = newProbs(kNumStates);
  const isRepG1 = newProbs(kNumStates);
  const isRepG2 = newProbs(kNumStates);
  const isRep0Long = newProbs(kNumStates << kNumPosBitsMax);
  const posSlotDecoder = Array.from({ length: kNumLenToPosStates }, () => newProbs(1 << 6));
  const specPos = newProbs(kNumFullDistances - kEndPosModelIndex);
  const alignDecoder = newProbs(1 << kNumAlignBits);
  const lenDecoder = new LenDecoder();
  const repLenDecoder = new LenDecoder();
  const litProbs = Array.from({ length: 1 << (lc + lp) }, () => newProbs(0x300));

  let state = 0, rep0 = 0, rep1 = 0, rep2 = 0, rep3 = 0;

  const decodeLiteral = (posState) => {
    const prevByte = win.pos > 0 ? win.getByte(1) : 0;
    const litState = ((posState & lpMask) << lc) | (prevByte >>> (8 - lc));
    const probs = litProbs[litState];
    let symbol = 1;
    if (state >= 7) {
      let matchByte = win.getByte(rep0 + 1);
      do {
        const matchBit = (matchByte >> 7) & 1;
        matchByte = (matchByte << 1) & 0xFF;
        const bit = rc.decodeBit(probs, ((1 + matchBit) << 8) + symbol);
        symbol = (symbol << 1) | bit;
        if (matchBit !== bit) break;
      } while (symbol < 0x100);
    }
    while (symbol < 0x100) symbol = (symbol << 1) | rc.decodeBit(probs, symbol);
    return symbol & 0xFF;
  };

  const decodeDistance = (len) => {
    const lenState = Math.min(len, kNumLenToPosStates - 1);
    const posSlot = bitTreeDecode(rc, posSlotDecoder[lenState], 6);
    if (posSlot < 4) return posSlot;
    const numDirectBits = (posSlot >> 1) - 1;
    let dist = (2 | (posSlot & 1)) << numDirectBits;
    if (posSlot < kEndPosModelIndex) {
      dist += bitTreeReverseDecode(rc, specPos, dist - posSlot - 1, numDirectBits);
    } else {
      dist = (dist + rc.decodeDirectBits(numDirectBits - kNumAlignBits) * (1 << kNumAlignBits)) >>> 0;
      dist = (dist + bitTreeReverseDecode(rc, alignDecoder, 0, kNumAlignBits)) >>> 0;
    }
    return dist >>> 0;
  };

  while (outSize < 0 || win.pos < outSize) {
    const posState = win.pos & pbMask;
    if (rc.decodeBit(isMatch, (state << kNumPosBitsMax) + posState) === 0) {
      const b = decodeLiteral(win.pos);
      win.putByte(b);
      state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
      continue;
    }
    let len;
    if (rc.decodeBit(isRep, state) === 0) {
      rep3 = rep2; rep2 = rep1; rep1 = rep0;
      len = lenDecoder.decode(rc, posState);
      state = state < 7 ? 7 : 10;
      rep0 = decodeDistance(len);
      if (rep0 === 0xFFFFFFFF) break; // end-of-stream marker
    } else {
      if (rc.decodeBit(isRepG0, state) === 0) {
        if (rc.decodeBit(isRep0Long, (state << kNumPosBitsMax) + posState) === 0) {
          state = state < 7 ? 9 : 11;
          win.copyMatch(rep0 + 1, 1);
          continue;
        }
      } else {
        let dist;
        if (rc.decodeBit(isRepG1, state) === 0) {
          dist = rep1;
        } else if (rc.decodeBit(isRepG2, state) === 0) {
          dist = rep2; rep2 = rep1;
        } else {
          dist = rep3; rep3 = rep2; rep2 = rep1;
        }
        rep1 = rep0;
        rep0 = dist;
      }
      len = repLenDecoder.decode(rc, posState);
      state = state < 7 ? 8 : 11;
    }
    const matchLen = len + kMatchMinLen;
    win.copyMatch(rep0 + 1, outSize >= 0 ? Math.min(matchLen, outSize - win.pos) : matchLen);
  }
  return win.buf.subarray(0, win.pos);
}

class RangeEncoder {
  constructor() { this.low = 0n; this.range = 0xFFFFFFFFn; this.cacheSize = 1n; this.cache = 0; this.out = []; }
  shiftLow() {
    if (this.low < 0xFF000000n || this.low > 0xFFFFFFFFn) {
      let temp = this.cache;
      const carry = Number(this.low >> 32n);
      do { this.out.push((temp + carry) & 0xFF); temp = 0xFF; } while (--this.cacheSize > 0n);
      this.cache = Number((this.low >> 24n) & 0xFFn);
    }
    this.cacheSize++;
    this.low = (this.low << 8n) & 0xFFFFFFFFn;
  }
  normalize() { while (this.range < BigInt(kTopValue)) { this.range <<= 8n; this.shiftLow(); } }
  encodeBit(probs, index, bit) {
    const v = probs[index];
    const bound = (this.range >> BigInt(kNumBitModelTotalBits)) * BigInt(v);
    if (bit === 0) { this.range = bound; probs[index] = v + ((kBitModelTotal - v) >> kNumMoveBits); }
    else { this.low += bound; this.range -= bound; probs[index] = v - (v >> kNumMoveBits); }
    this.normalize();
  }
  encodeDirectBits(v, numBits) {
    for (let i = numBits - 1; i >= 0; i--) {
      this.range >>= 1n;
      if ((v >>> i) & 1) this.low += this.range;
      this.normalize();
    }
  }
  flush() { for (let i = 0; i < 5; i++) this.shiftLow(); }
}

function bitTreeEncode(rc, probs, numBits, symbol) {
  let m = 1;
  for (let i = numBits - 1; i >= 0; i--) {
    const bit = (symbol >> i) & 1;
    rc.encodeBit(probs, m, bit);
    m = (m << 1) | bit;
  }
}
function bitTreeReverseEncode(rc, probs, offset, numBits, symbol) {
  let m = 1;
  for (let i = 0; i < numBits; i++) {
    const bit = symbol & 1; symbol >>>= 1;
    rc.encodeBit(probs, offset + m, bit);
    m = (m << 1) | bit;
  }
}

class LenEncoder {
  constructor() {
    this.choice = newProbs(2);
    this.low = Array.from({ length: 1 << kNumPosBitsMax }, () => newProbs(8));
    this.mid = Array.from({ length: 1 << kNumPosBitsMax }, () => newProbs(8));
    this.high = newProbs(256);
  }
  encode(rc, len, posState) {
    if (len < 8) { rc.encodeBit(this.choice, 0, 0); bitTreeEncode(rc, this.low[posState], 3, len); }
    else if (len < 16) { rc.encodeBit(this.choice, 0, 1); rc.encodeBit(this.choice, 1, 0); bitTreeEncode(rc, this.mid[posState], 3, len - 8); }
    else { rc.encodeBit(this.choice, 0, 1); rc.encodeBit(this.choice, 1, 1); bitTreeEncode(rc, this.high, 8, len - 16); }
  }
}

function getPosSlot(dist) {
  if (dist < 4) return dist;
  const n = 32 - Math.clz32(dist);
  const bit = (dist >>> (n - 2)) & 1;
  return 2 * (n - 1) + bit;
}

const MAX_MATCH_LEN = 16 + 255 + kMatchMinLen; // 273: the longest length the length coder can represent
function readU32(data, i) { return ((data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0); }

export function lzmaEncodeRaw(data, lc, lp, pb) {
  const rc = new RangeEncoder();
  const pbMask = (1 << pb) - 1, lpMask = (1 << lp) - 1;
  const isMatch = newProbs(kNumStates << kNumPosBitsMax);
  const isRep = newProbs(kNumStates);
  const posSlotEncoder = Array.from({ length: kNumLenToPosStates }, () => newProbs(1 << 6));
  const specPos = newProbs(kNumFullDistances - kEndPosModelIndex);
  const alignEncoder = newProbs(1 << kNumAlignBits);
  const lenEncoder = new LenEncoder();
  const litProbs = Array.from({ length: 1 << (lc + lp) }, () => newProbs(0x300));

  const encodeDistance = (dist, len) => {
    const lenState = Math.min(len, kNumLenToPosStates - 1);
    const posSlot = getPosSlot(dist);
    bitTreeEncode(rc, posSlotEncoder[lenState], 6, posSlot);
    if (posSlot >= 4) {
      const numDirectBits = (posSlot >> 1) - 1;
      const base = (2 | (posSlot & 1)) << numDirectBits;
      const footer = dist - base;
      if (posSlot < kEndPosModelIndex) {
        bitTreeReverseEncode(rc, specPos, base - posSlot - 1, numDirectBits, footer);
      } else {
        rc.encodeDirectBits(Math.floor(footer / (1 << kNumAlignBits)), numDirectBits - kNumAlignBits);
        bitTreeReverseEncode(rc, alignEncoder, 0, kNumAlignBits, footer & ((1 << kNumAlignBits) - 1));
      }
    }
  };

  const encodeLiteral = (pos, byte, prevByte, matchByte, useMatch) => {
    const litState = ((pos & lpMask) << lc) | (prevByte >>> (8 - lc));
    const probs = litProbs[litState];
    let symbol = 1, bitIdx = 7;
    if (useMatch) {
      for (; bitIdx >= 0; bitIdx--) {
        const matchBit = (matchByte >> bitIdx) & 1;
        const bit = (byte >> bitIdx) & 1;
        rc.encodeBit(probs, ((1 + matchBit) << 8) + symbol, bit);
        symbol = (symbol << 1) | bit;
        if (matchBit !== bit) { bitIdx--; break; }
      }
    }
    for (; bitIdx >= 0; bitIdx--) {
      const bit = (byte >> bitIdx) & 1;
      rc.encodeBit(probs, symbol, bit);
      symbol = (symbol << 1) | bit;
    }
  };

  let state = 0, rep0 = 0;
  const n = data.length;
  const hash = new Map();
  let pos = 0;

  while (pos < n) {
    let matchLen = 0, matchDist = 0;
    if (pos + 4 <= n) {
      const key = readU32(data, pos);
      const cand = hash.get(key);
      if (cand !== undefined && readU32(data, cand) === key) {
        const max = Math.min(n - pos, MAX_MATCH_LEN);
        let l = 0;
        while (l < max && data[cand + l] === data[pos + l]) l++;
        if (l >= kMatchMinLen) { matchLen = l; matchDist = pos - cand; }
      }
      hash.set(key, pos);
    }
    const posState = pos & pbMask;
    if (matchLen >= kMatchMinLen) {
      rc.encodeBit(isMatch, (state << kNumPosBitsMax) + posState, 1);
      rc.encodeBit(isRep, state, 0);
      const lenMinus = matchLen - kMatchMinLen;
      lenEncoder.encode(rc, lenMinus, posState);
      const distMinus1 = matchDist - 1;
      encodeDistance(distMinus1, lenMinus);
      rep0 = distMinus1;
      for (let k = 1; k < matchLen && pos + k + 4 <= n; k++) hash.set(readU32(data, pos + k), pos + k);
      state = state < 7 ? 7 : 10;
      pos += matchLen;
    } else {
      rc.encodeBit(isMatch, (state << kNumPosBitsMax) + posState, 0);
      const byte = data[pos];
      const prevByte = pos > 0 ? data[pos - 1] : 0;
      const matchByte = state >= 7 ? data[pos - rep0 - 1] : 0;
      encodeLiteral(pos, byte, prevByte, matchByte, state >= 7);
      state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
      pos++;
    }
  }

  const posState = pos & pbMask;
  rc.encodeBit(isMatch, (state << kNumPosBitsMax) + posState, 1);
  rc.encodeBit(isRep, state, 0);
  lenEncoder.encode(rc, 0, posState);
  encodeDistance(0xFFFFFFFF, 0);
  rc.flush();
  return Uint8Array.from(rc.out);
}

export function lzmaAloneCompress(data) {
  const lc = 3, lp = 0, pb = 2;
  const body = lzmaEncodeRaw(data, lc, lp, pb);
  const header = new Uint8Array(13);
  header[0] = (pb * 5 + lp) * 9 + lc;
  const dictSize = Math.max(1 << 16, data.length); // a real dict size large enough to cover whole input
  header[1] = dictSize & 0xFF; header[2] = (dictSize >>> 8) & 0xFF; header[3] = (dictSize >>> 16) & 0xFF; header[4] = (dictSize >>> 24) & 0xFF;
  for (let i = 0; i < 8; i++) header[5 + i] = 0xFF; // unknown size: terminated by the end-of-stream marker
  return concatBytes(header, body);
}

function concatBytes(a, b) { const out = new Uint8Array(a.length + b.length); out.set(a, 0); out.set(b, a.length); return out; }

export function lzmaAloneDecompress(data) {
  if (data.length < 13) throw new Error('Not valid LZMA (alone) data: header too short');
  const props = data[0];
  if (props >= 9 * 5 * 5) throw new Error('Not valid LZMA (alone) data: bad properties byte');
  const lc = props % 9;
  const rem = (props / 9) | 0;
  const lp = rem % 5;
  const pb = (rem / 5) | 0;
  let size = 0n;
  for (let i = 0; i < 8; i++) size |= BigInt(data[5 + i]) << BigInt(8 * i);
  const unknown = size === 0xFFFFFFFFFFFFFFFFn;
  const outSize = unknown ? -1 : Number(size);
  return lzmaDecodeRaw(data, 13, lc, lp, pb, outSize);
}
