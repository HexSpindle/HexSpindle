const HASH_PRIME = 0x01000193;
const HASH_INIT = 0x28021967;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function fnv(base, b) { return ((base * HASH_PRIME) ^ b) >>> 0; }

class RollHash {
  constructor() { this.x = 0; this.y = 0; this.z = 0; this.c = 0; this.window = new Array(7); }
  update(d) {
    this.y -= this.x;
    this.y += 7 * d;
    this.x += d;
    this.x -= this.window[this.c % 7] || 0;
    this.window[this.c % 7] = d;
    this.c++;
    this.z = (this.z << 5) >>> 0;
    this.z = (this.z ^ d) >>> 0;
  }
  sum() { return (this.x + this.y + this.z) >>> 0; }
}

function piecewiseHash(bytes, triggerValue) {
  const signatures = ['', ''];
  let h1 = HASH_INIT, h2 = HASH_INIT;
  const rh = new RollHash();
  for (let i = 0, len = bytes.length; i < len; i++) {
    h1 = fnv(h1, bytes[i]);
    h2 = fnv(h2, bytes[i]);
    rh.update(bytes[i]);
    if (i === len - 1 || rh.sum() % triggerValue === triggerValue - 1) {
      signatures[0] += B64.charAt(h1 & 63);
      h1 = HASH_INIT;
    }
    if (i === len - 1 || rh.sum() % (triggerValue * 2) === triggerValue * 2 - 1) {
      signatures[1] += B64.charAt(h2 & 63);
      h2 = HASH_INIT;
    }
  }
  return signatures;
}

export function ctphDigest(bytes) {
  const minb = 3;
  let bi = Math.ceil(Math.log(bytes.length / (64 * minb)) / Math.log(2));
  bi = Math.max(3, bi);
  let signatures = piecewiseHash(bytes, minb << bi);
  while (bi > 0 && signatures[0].length < 32) {
    bi--;
    signatures = piecewiseHash(bytes, minb << bi);
  }
  return B64.charAt(bi) + ':' + signatures[0] + ':' + signatures[1];
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

export function ctphSimilarity(d1, d2) {
  const b1 = B64.indexOf(d1.charAt(0));
  const b2 = B64.indexOf(d2.charAt(0));
  if (b1 > b2) return ctphSimilarity(d2, d1);
  if (Math.abs(b1 - b2) > 1) return 0;
  if (b1 === b2) return matchScore(d1.split(':')[1], d2.split(':')[1]);
  return matchScore(d1.split(':')[2], d2.split(':')[1]);
}
