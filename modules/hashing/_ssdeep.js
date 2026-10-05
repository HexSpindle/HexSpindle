const HASH_PRIME = 16777619;
const HASH_INIT = 671226215;
const ROLLING_WINDOW = 7;
const MAX_LENGTH = 64;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function safeAdd(x, y) {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

function safeMultiply(x, y) {
  const xlsw = x & 0xffff;
  const xmsw = (x >> 16) + (xlsw >> 16);
  const ylsw = y & 0xffff;
  const ymsw = (y >> 16) + (ylsw >> 16);
  const a16 = xmsw, a00 = xlsw, b16 = ymsw, b00 = ylsw;
  let c00 = a00 * b00;
  let c16 = c00 >>> 16;
  c16 += a16 * b00;
  c16 &= 0xffff;
  c16 += a00 * b16;
  const lo = c00 & 0xffff, hi = c16 & 0xffff;
  return (hi << 16) | (lo & 0xffff);
}

function fnv(h, c) { return (safeMultiply(h, HASH_PRIME) ^ c) >>> 0; }

class RollHash {
  constructor() { this.window = new Array(ROLLING_WINDOW); this.h1 = 0; this.h2 = 0; this.h3 = 0; this.n = 0; }
  update(c) {
    this.h2 = safeAdd(this.h2, -this.h1);
    this.h2 = safeAdd(this.h2, ROLLING_WINDOW * c) >>> 0;
    this.h1 = safeAdd(this.h1, c);
    const val = this.window[this.n % ROLLING_WINDOW] || 0;
    this.h1 = safeAdd(this.h1, -val) >>> 0;
    this.window[this.n % ROLLING_WINDOW] = c;
    this.n++;
    this.h3 = this.h3 << 5;
    this.h3 = (this.h3 ^ c) >>> 0;
  }
  sum() { return (this.h1 + this.h2 + this.h3) >>> 0; }
}

function piecewiseHash(bytes, triggerValue) {
  const signatures = ['', '', triggerValue];
  if (bytes.length === 0) return signatures;
  let h1 = HASH_INIT, h2 = HASH_INIT;
  const rh = new RollHash();
  for (let i = 0; i < bytes.length; i++) {
    const thisByte = bytes[i];
    h1 = fnv(h1, thisByte);
    h2 = fnv(h2, thisByte);
    rh.update(thisByte);
    if (signatures[0].length < MAX_LENGTH - 1 && rh.sum() % triggerValue === triggerValue - 1) {
      signatures[0] += B64.charAt(h1 & 63);
      h1 = HASH_INIT;
    }
    if (signatures[1].length < MAX_LENGTH / 2 - 1 && rh.sum() % (triggerValue * 2) === triggerValue * 2 - 1) {
      signatures[1] += B64.charAt(h2 & 63);
      h2 = HASH_INIT;
    }
  }
  signatures[0] += B64.charAt(h1 & 63);
  signatures[1] += B64.charAt(h2 & 63);
  return signatures;
}

export function ssdeepDigest(bytes) {
  let bi = 3;
  while (bi * MAX_LENGTH < bytes.length) bi *= 2;
  let signatures;
  do {
    signatures = piecewiseHash(bytes, bi);
    bi = Math.trunc(bi / 2);
  } while (bi > 3 && signatures[0].length < MAX_LENGTH / 2);
  return signatures[2] + ':' + signatures[0] + ':' + signatures[1];
}

function levenshtein(str1, str2) {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  const prevRow = new Array(str2.length + 1);
  let curCol, nextCol, j;
  for (let i = 0; i < prevRow.length; ++i) prevRow[i] = i;
  for (let i = 0; i < str1.length; ++i) {
    nextCol = i + 1;
    for (j = 0; j < str2.length; ++j) {
      curCol = nextCol;
      nextCol = prevRow[j] + (str1.charAt(i) === str2.charAt(j) ? 0 : 1);
      let tmp = curCol + 1;
      if (nextCol > tmp) nextCol = tmp;
      tmp = prevRow[j + 1] + 1;
      if (nextCol > tmp) nextCol = tmp;
      prevRow[j] = curCol;
    }
    prevRow[j] = nextCol;
  }
  return nextCol;
}

function matchScore(s1, s2) {
  const e = levenshtein(s1, s2);
  return (1 - e / Math.max(s1.length, s2.length)) * 100;
}

export function ssdeepSimilarity(d1, d2) {
  const b1 = B64.indexOf(d1.charAt(0));
  const b2 = B64.indexOf(d2.charAt(0));
  if (b1 > b2) return ssdeepSimilarity(d2, d1);
  if (Math.abs(b1 - b2) > 1) return 0;
  if (b1 === b2) return matchScore(d1.split(':')[1], d2.split(':')[1]);
  return matchScore(d1.split(':')[2], d2.split(':')[1]);
}
