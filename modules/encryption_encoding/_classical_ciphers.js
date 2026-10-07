/*
 * Shared, dependency-free implementations for HexSpindle's classical ciphers.
 * Historical ciphers are provided for analysis, interoperability, and education;
 * they are not suitable for modern security.
 */

export const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHA25_IJ = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
const ALPHA25_NOQ = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';

export function mod(n, m) { return ((n % m) + m) % m; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
function az(s) { return [...String(s).toUpperCase()].filter(c => c >= 'A' && c <= 'Z'); }
function uniqueChars(s) { const out = []; for (const c of s) if (!out.includes(c)) out.push(c); return out; }
function requireKeyLetters(key, label = 'Key') {
  const k = az(key);
  if (!k.length) throw new Error(`${label} must contain at least one A-Z letter`);
  return k;
}
function stableColumnOrder(key) {
  const k = [...String(key).toUpperCase()].filter(c => /[A-Z0-9]/.test(c));
  if (!k.length) throw new Error('Transposition key must contain at least one letter or digit');
  return k.map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c) || a.i - b.i).map(x => x.i);
}
function columnarEncrypt(text, key) {
  const k = [...String(key).toUpperCase()].filter(c => /[A-Z0-9]/.test(c)).join('');
  if (!k.length) throw new Error('Transposition key must contain at least one letter or digit');
  const cols = Array.from({ length: k.length }, () => '');
  for (let i = 0; i < text.length; i++) cols[i % k.length] += text[i];
  return stableColumnOrder(k).map(i => cols[i]).join('');
}
function columnarDecrypt(text, key) {
  const k = [...String(key).toUpperCase()].filter(c => /[A-Z0-9]/.test(c)).join('');
  if (!k.length) throw new Error('Transposition key must contain at least one letter or digit');
  const n = k.length, base = Math.floor(text.length / n), extra = text.length % n;
  const lens = Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
  const cols = new Array(n); let p = 0;
  for (const i of stableColumnOrder(k)) { cols[i] = text.slice(p, p + lens[i]); p += lens[i]; }
  let out = '';
  for (let r = 0; r < base + (extra ? 1 : 0); r++) for (let c = 0; c < n; c++) if (r < cols[c].length) out += cols[c][r];
  return out;
}

// ---------------------------------------------------------------------------
// Playfair
export function playfairSquare(keyword = '') {
  const key = String(keyword).toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
  return uniqueChars(key + ALPHA25_IJ);
}
export function playfairPrepare(text, filler = 'X', alternateFiller = 'Q') {
  filler = (az(filler)[0] || 'X').replace(/J/g, 'I');
  alternateFiller = (az(alternateFiller)[0] || 'Q').replace(/J/g, 'I');
  if (filler === alternateFiller) alternateFiller = filler === 'X' ? 'Q' : 'X';
  const letters = az(text).map(c => c === 'J' ? 'I' : c);
  const out = [];
  for (let i = 0; i < letters.length;) {
    const a = letters[i];
    if (i + 1 >= letters.length) { out.push(a, a === filler ? alternateFiller : filler); i++; continue; }
    const b = letters[i + 1];
    if (a === b) { out.push(a, a === filler ? alternateFiller : filler); i++; }
    else { out.push(a, b); i += 2; }
  }
  return out.join('');
}
export function playfairTransform(text, keyword = '', decrypt = false) {
  const sq = playfairSquare(keyword);
  let s = decrypt ? az(text).map(c => c === 'J' ? 'I' : c).join('') : playfairPrepare(text);
  if (s.length % 2) throw new Error('Playfair ciphertext must contain an even number of letters');
  let out = '';
  const d = decrypt ? -1 : 1;
  for (let i = 0; i < s.length; i += 2) {
    const a = sq.indexOf(s[i]), b = sq.indexOf(s[i + 1]);
    if (a < 0 || b < 0) throw new Error('Playfair input contains a letter not present in the 5x5 square');
    const ar = Math.floor(a / 5), ac = a % 5, br = Math.floor(b / 5), bc = b % 5;
    if (ar === br) out += sq[ar * 5 + mod(ac + d, 5)] + sq[br * 5 + mod(bc + d, 5)];
    else if (ac === bc) out += sq[mod(ar + d, 5) * 5 + ac] + sq[mod(br + d, 5) * 5 + bc];
    else out += sq[ar * 5 + bc] + sq[br * 5 + ac];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hill
export function parseHillMatrix(s, n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 2 || n > 5) throw new Error('Matrix size must be an integer from 2 through 5');
  const nums = (String(s).match(/-?\d+/g) || []).map(Number);
  if (nums.length !== n * n) throw new Error(`Key must contain exactly ${n * n} integers for a ${n}x${n} matrix`);
  return Array.from({ length: n }, (_, i) => nums.slice(i * n, (i + 1) * n).map(v => mod(v, 26)));
}
function determinant(m) {
  if (m.length === 1) return m[0][0];
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let d = 0;
  for (let c = 0; c < m.length; c++) {
    const minor = m.slice(1).map(row => row.filter((_, j) => j !== c));
    d += (c % 2 ? -1 : 1) * m[0][c] * determinant(minor);
  }
  return d;
}
function modInverse(a, m) {
  a = mod(a, m);
  for (let x = 1; x < m; x++) if (mod(a * x, m) === 1) return x;
  throw new Error(`Value ${a} is not invertible modulo ${m}`);
}
export function hillInverseMatrix(mat) {
  const n = mat.length, det = mod(determinant(mat), 26);
  if (gcd(det, 26) !== 1) throw new Error('Key matrix is not invertible modulo 26 (determinant must be coprime with 26)');
  const invDet = modInverse(det, 26);
  const cof = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const minor = mat.filter((_, i) => i !== r).map(row => row.filter((_, j) => j !== c));
    cof[r][c] = (r + c) % 2 ? -determinant(minor) : determinant(minor);
  }
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => mod(cof[c][r] * invDet, 26)));
}
function hillMul(mat, vec) { return mat.map(row => mod(row.reduce((s, v, i) => s + v * vec[i], 0), 26)); }
export function hillTransform(text, n, key, decrypt = false) {
  const mat = parseHillMatrix(key, n); // validate before any work
  const use = decrypt ? hillInverseMatrix(mat) : (hillInverseMatrix(mat), mat); // encryption keys must also be invertible
  const letters = az(text);
  if (decrypt && letters.length % n) throw new Error(`Hill ciphertext length must be a multiple of ${n}`);
  if (!decrypt) while (letters.length % n) letters.push('X');
  let out = '';
  for (let i = 0; i < letters.length; i += n) {
    const vec = letters.slice(i, i + n).map(c => c.charCodeAt(0) - 65);
    out += hillMul(use, vec).map(v => String.fromCharCode(65 + v)).join('');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Trifid
export const TRIFID_DEFAULT_KEY = 'FELIX MARIE DELASTELLE';
export function trifidCube(keyword = TRIFID_DEFAULT_KEY) {
  const key = String(keyword).toUpperCase().replace(/[^A-Z+]/g, '');
  return uniqueChars(key + ALPHA + '+').slice(0, 27);
}
export function trifidTransform(text, keyword = TRIFID_DEFAULT_KEY, period = 5, decrypt = false) {
  period = Number(period);
  if (!Number.isInteger(period) || period < 1) throw new Error('Trifid period must be a positive integer');
  const cube = trifidCube(keyword);
  const chars = [...String(text).toUpperCase()].filter(c => cube.includes(c));
  const coords = chars.map(c => { const i = cube.indexOf(c); return [Math.floor(i / 9) + 1, Math.floor(i / 3) % 3 + 1, i % 3 + 1]; });
  let out = '';
  for (let i = 0; i < coords.length; i += period) {
    const grp = coords.slice(i, i + period), p = grp.length;
    if (!decrypt) {
      const seq = [...grp.map(v => v[0]), ...grp.map(v => v[1]), ...grp.map(v => v[2])];
      for (let j = 0; j < seq.length; j += 3) out += cube[(seq[j] - 1) * 9 + (seq[j + 1] - 1) * 3 + seq[j + 2] - 1];
    } else {
      const seq = grp.flat();
      for (let j = 0; j < p; j++) out += cube[(seq[j] - 1) * 9 + (seq[p + j] - 1) * 3 + seq[2 * p + j] - 1];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Four-square
function fourSquareAlphabet(variant) { return String(variant).toLowerCase().includes('omit') ? ALPHA25_NOQ : ALPHA25_IJ; }
function normalizeFourSquare(text, variant) {
  const omitQ = String(variant).toLowerCase().includes('omit');
  let chars = az(text);
  if (omitQ) {
    if (chars.includes('Q')) throw new Error('The “omit Q” Four-square convention cannot represent Q');
  } else chars = chars.map(c => c === 'J' ? 'I' : c);
  return chars;
}
export function fourSquareKey(keyword, variant = 'I/J combined') {
  const alphabet = fourSquareAlphabet(variant);
  let key = az(keyword).join('');
  if (alphabet === ALPHA25_IJ) key = key.replace(/J/g, 'I');
  else key = key.replace(/Q/g, '');
  return uniqueChars(key + alphabet);
}
export function fourSquareTransform(text, key1 = 'EXAMPLE', key2 = 'KEYWORD', variant = 'I/J combined', decrypt = false) {
  const plain = [...fourSquareAlphabet(variant)], sq1 = fourSquareKey(key1, variant), sq2 = fourSquareKey(key2, variant);
  const letters = normalizeFourSquare(text, variant);
  if (!decrypt && letters.length % 2) letters.push('X');
  if (decrypt && letters.length % 2) throw new Error('Four-square ciphertext must contain an even number of letters');
  let out = '';
  for (let i = 0; i < letters.length; i += 2) {
    if (!decrypt) {
      const a = plain.indexOf(letters[i]), b = plain.indexOf(letters[i + 1]);
      out += sq1[Math.floor(a / 5) * 5 + b % 5] + sq2[Math.floor(b / 5) * 5 + a % 5];
    } else {
      const a = sq1.indexOf(letters[i]), b = sq2.indexOf(letters[i + 1]);
      if (a < 0 || b < 0) throw new Error('Ciphertext contains a symbol not present in the keyed squares');
      out += plain[Math.floor(a / 5) * 5 + b % 5] + plain[Math.floor(b / 5) * 5 + a % 5];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Nihilist
export function nihilistSquare(keyword = 'ZEBRAS') {
  const key = az(keyword).map(c => c === 'J' ? 'I' : c).join('');
  return uniqueChars(key + ALPHA25_IJ);
}
function nihilistCodeMap(square) {
  const m = new Map();
  square.forEach((c, i) => m.set(c, 11 + Math.floor(i / 5) * 10 + (i % 5)));
  return m;
}
export function nihilistEncode(text, squareKey = 'ZEBRAS', additiveKey = 'RUSSIAN') {
  const square = nihilistSquare(squareKey), map = nihilistCodeMap(square);
  const key = requireKeyLetters(additiveKey, 'Additive key').map(c => c === 'J' ? 'I' : c).map(c => map.get(c));
  const pt = az(text).map(c => c === 'J' ? 'I' : c);
  return pt.map((c, i) => map.get(c) + key[i % key.length]).join(' ');
}
export function nihilistDecode(text, squareKey = 'ZEBRAS', additiveKey = 'RUSSIAN') {
  const square = nihilistSquare(squareKey), map = nihilistCodeMap(square), rev = new Map([...map].map(([c, n]) => [n, c]));
  const key = requireKeyLetters(additiveKey, 'Additive key').map(c => c === 'J' ? 'I' : c).map(c => map.get(c));
  const nums = (String(text).match(/\d+/g) || []).map(Number);
  let out = '';
  nums.forEach((n, i) => { const v = n - key[i % key.length]; if (!rev.has(v)) throw new Error(`Invalid Nihilist value ${n} at position ${i + 1}`); out += rev.get(v); });
  return out;
}

// ---------------------------------------------------------------------------
// ADFGX / ADFGVX
function fractionatingSquare(squareKey, variant) {
  if (variant === 'ADFGX') {
    const raw = String(squareKey).toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    return uniqueChars(raw + ALPHA25_IJ).slice(0, 25);
  }
  const alphabet = ALPHA + '0123456789';
  const raw = String(squareKey).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return uniqueChars(raw + alphabet).slice(0, 36);
}
export const ADFGX_REFERENCE_SQUARE = 'BTALPDHOZKQFVSNGICUXMREWY';
export const ADFGVX_REFERENCE_SQUARE = 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ';
export function adfgxEncode(text, squareKey = ADFGX_REFERENCE_SQUARE, transKey = 'CARGO') {
  return adfgTransform(text, squareKey, transKey, 'ADFGX', false);
}
export function adfgxDecode(text, squareKey = ADFGX_REFERENCE_SQUARE, transKey = 'CARGO') {
  return adfgTransform(text, squareKey, transKey, 'ADFGX', true);
}
export function adfgvxEncode(text, squareKey = ADFGVX_REFERENCE_SQUARE, transKey = 'PRIVACY') {
  return adfgTransform(text, squareKey, transKey, 'ADFGVX', false);
}
export function adfgvxDecode(text, squareKey = ADFGVX_REFERENCE_SQUARE, transKey = 'PRIVACY') {
  return adfgTransform(text, squareKey, transKey, 'ADFGVX', true);
}
function adfgTransform(text, squareKey, transKey, variant, decrypt) {
  const labels = variant === 'ADFGX' ? 'ADFGX' : 'ADFGVX', size = labels.length, sq = fractionatingSquare(squareKey, variant);
  const tk = String(transKey).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!tk.length) throw new Error('Transposition key must not be empty');
  if (!decrypt) {
    let input = String(text).toUpperCase();
    input = variant === 'ADFGX' ? input.replace(/J/g, 'I').replace(/[^A-Z]/g, '') : input.replace(/[^A-Z0-9]/g, '');
    let fractionated = '';
    for (const c of input) { const i = sq.indexOf(c); if (i < 0) throw new Error(`Character ${c} is not present in the square`); fractionated += labels[Math.floor(i / size)] + labels[i % size]; }
    return columnarEncrypt(fractionated, tk);
  }
  const cipher = [...String(text).toUpperCase()].filter(c => labels.includes(c)).join('');
  const fractionated = columnarDecrypt(cipher, tk);
  if (fractionated.length % 2) throw new Error('Fractionated ADFG ciphertext must contain an even number of symbols');
  let out = '';
  for (let i = 0; i < fractionated.length; i += 2) {
    const r = labels.indexOf(fractionated[i]), c = labels.indexOf(fractionated[i + 1]);
    if (r < 0 || c < 0) throw new Error('Invalid ADFG coordinate');
    out += sq[r * size + c];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Beaufort
export function beaufortTransform(text, key = 'FORTIFICATION') {
  const k = requireKeyLetters(key);
  let ki = 0, out = '';
  for (const ch of String(text)) {
    if (/[A-Za-z]/.test(ch)) {
      const p = ch.toUpperCase().charCodeAt(0) - 65, q = k[ki++ % k.length].charCodeAt(0) - 65;
      const v = mod(q - p, 26), letter = String.fromCharCode(65 + v);
      out += ch === ch.toLowerCase() ? letter.toLowerCase() : letter;
    } else out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vigenere plaintext-autokey
export function autokeyEncode(text, primer = 'QUEENLY') {
  const seed = requireKeyLetters(primer, 'Primer').map(c => c.charCodeAt(0) - 65);
  const plain = [];
  let out = '';
  for (const ch of String(text)) {
    if (/[A-Za-z]/.test(ch)) {
      const p = ch.toUpperCase().charCodeAt(0) - 65, i = plain.length, k = i < seed.length ? seed[i] : plain[i - seed.length];
      const v = mod(p + k, 26), letter = String.fromCharCode(65 + v); plain.push(p);
      out += ch === ch.toLowerCase() ? letter.toLowerCase() : letter;
    } else out += ch;
  }
  return out;
}
export function autokeyDecode(text, primer = 'QUEENLY') {
  const seed = requireKeyLetters(primer, 'Primer').map(c => c.charCodeAt(0) - 65), plain = [];
  let out = '';
  for (const ch of String(text)) {
    if (/[A-Za-z]/.test(ch)) {
      const c = ch.toUpperCase().charCodeAt(0) - 65, i = plain.length, k = i < seed.length ? seed[i] : plain[i - seed.length];
      const v = mod(c - k, 26), letter = String.fromCharCode(65 + v); plain.push(v);
      out += ch === ch.toLowerCase() ? letter.toLowerCase() : letter;
    } else out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Porta
export function portaTransform(text, key = 'FORTIFICATION') {
  const k = requireKeyLetters(key);
  let ki = 0, out = '';
  for (const ch of String(text)) {
    if (!/[A-Za-z]/.test(ch)) { out += ch; continue; }
    const p = ch.toUpperCase().charCodeAt(0) - 65, row = Math.floor((k[ki++ % k.length].charCodeAt(0) - 65) / 2);
    const v = p < 13 ? 13 + mod(p + row, 13) : mod((p - 13) - row, 13);
    const letter = String.fromCharCode(65 + v); out += ch === ch.toLowerCase() ? letter.toLowerCase() : letter;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Chaocipher
export const CHAOCIPHER_LEFT = 'HXUCZVAMDSLKPEFJRIGTWOBNYQ';
export const CHAOCIPHER_RIGHT = 'PTLNBQDEOYSFAVZKGJRIHWXUMC';
function validateChaocipherAlphabet(s, label) {
  s = String(s).toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length !== 26 || new Set(s).size !== 26 || [...ALPHA].some(c => !s.includes(c))) throw new Error(`${label} alphabet must contain each A-Z letter exactly once`);
  return s;
}
function rotate(s, n) { n = mod(n, s.length); return s.slice(n) + s.slice(0, n); }
function chaocipherPermute(left, right, pos) {
  left = rotate(left, pos);
  left = left[0] + left.slice(2, 14) + left[1] + left.slice(14);
  right = rotate(right, pos + 1);
  right = right.slice(0, 2) + right.slice(3, 14) + right[2] + right.slice(14);
  return [left, right];
}
export function chaocipherTransform(text, leftAlphabet = CHAOCIPHER_LEFT, rightAlphabet = CHAOCIPHER_RIGHT, decrypt = false) {
  let left = validateChaocipherAlphabet(leftAlphabet, 'Left'), right = validateChaocipherAlphabet(rightAlphabet, 'Right'), out = '';
  for (const ch0 of String(text)) {
    const ch = ch0.toUpperCase();
    if (!/[A-Z]/.test(ch)) { out += ch0; continue; }
    const pos = decrypt ? left.indexOf(ch) : right.indexOf(ch), mapped = decrypt ? right[pos] : left[pos];
    out += ch0 === ch0.toLowerCase() ? mapped.toLowerCase() : mapped;
    [left, right] = chaocipherPermute(left, right, pos);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Solitaire / Pontifex
function cardCount(v) { return v >= 53 ? 53 : v; }
function moveJoker(deck, joker, times) {
  for (let t = 0; t < times; t++) {
    const i = deck.indexOf(joker);
    if (i === deck.length - 1) { deck.splice(i, 1); deck.splice(1, 0, joker); }
    else { [deck[i], deck[i + 1]] = [deck[i + 1], deck[i]]; }
  }
}
function tripleCut(deck) {
  const a = deck.indexOf(53), b = deck.indexOf(54), lo = Math.min(a, b), hi = Math.max(a, b);
  return deck.slice(hi + 1).concat(deck.slice(lo, hi + 1), deck.slice(0, lo));
}
function countCut(deck, count) {
  count = cardCount(count);
  if (count <= 0 || count >= deck.length) return deck;
  const bottom = deck[deck.length - 1];
  return deck.slice(count, -1).concat(deck.slice(0, count), [bottom]);
}
function solitaireRound(deck) {
  moveJoker(deck, 53, 1); moveJoker(deck, 54, 2); deck = tripleCut(deck); deck = countCut(deck, deck[deck.length - 1]); return deck;
}
export function solitaireKeyedDeck(passphrase = '') {
  let deck = Array.from({ length: 54 }, (_, i) => i + 1);
  for (const c of az(passphrase)) { deck = solitaireRound(deck); deck = countCut(deck, c.charCodeAt(0) - 64); }
  return deck;
}
export function solitaireKeystream(length, passphrase = '') {
  let deck = solitaireKeyedDeck(passphrase), out = [];
  while (out.length < length) {
    deck = solitaireRound(deck);
    const top = cardCount(deck[0]), card = deck[top];
    if (card >= 53) continue;
    out.push(((card - 1) % 26) + 1);
  }
  return out;
}
export function solitaireEncode(text, passphrase = '', padToFive = true) {
  const chars = az(text); if (padToFive) while (chars.length % 5) chars.push('X');
  const ks = solitaireKeystream(chars.length, passphrase);
  return chars.map((c, i) => String.fromCharCode(65 + mod((c.charCodeAt(0) - 64) + ks[i] - 1, 26))).join('');
}
export function solitaireDecode(text, passphrase = '') {
  const chars = az(text), ks = solitaireKeystream(chars.length, passphrase);
  return chars.map((c, i) => String.fromCharCode(65 + mod((c.charCodeAt(0) - 64) - ks[i] - 1, 26))).join('');
}

// ---------------------------------------------------------------------------
// Homophonic substitution
const HOMO_COUNTS = { E:11,T:8,A:8,O:8,I:7,N:7,S:6,H:6,R:6,D:4,L:4,U:3,C:3,M:2,F:2,W:2,G:2,Y:2,P:2,B:1,V:1,K:1,J:1,X:1,Q:1,Z:1 };
export function defaultHomophonicMapping() {
  let n = 0, lines = [];
  for (const c of Object.keys(HOMO_COUNTS)) {
    const vals = Array.from({ length: HOMO_COUNTS[c] }, () => String(n++).padStart(2, '0'));
    lines.push(`${c}=${vals.join(' ')}`);
  }
  return lines.join('\n');
}
export function parseHomophonicMapping(mapping) {
  const enc = new Map(), dec = new Map();
  for (const raw of String(mapping).split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z])\s*[:=]\s*(.+)$/); if (!m) throw new Error(`Invalid homophonic mapping line: ${raw}`);
    const letter = m[1].toUpperCase(), symbols = m[2].trim().split(/[\s,]+/).filter(Boolean);
    if (!symbols.length) throw new Error(`No symbols supplied for ${letter}`);
    if (enc.has(letter)) throw new Error(`Duplicate mapping for ${letter}`);
    for (const s of symbols) { if (dec.has(s)) throw new Error(`Cipher symbol ${s} is assigned to more than one plaintext letter`); dec.set(s, letter); }
    enc.set(letter, symbols);
  }
  if (!enc.size) throw new Error('Homophonic mapping is empty');
  return { enc, dec };
}
function randomIndex(n) {
  if (globalThis.crypto?.getRandomValues) { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] % n; }
  return Math.floor(Math.random() * n);
}
export function homophonicEncode(text, mapping = defaultHomophonicMapping(), mode = 'Random', separator = ' ') {
  const { enc } = parseHomophonicMapping(mapping), counters = new Map(), out = [];
  for (const c of az(text)) {
    const choices = enc.get(c); if (!choices) throw new Error(`No homophonic mapping for ${c}`);
    let i;
    if (String(mode).toLowerCase().startsWith('cycle')) { i = counters.get(c) || 0; counters.set(c, i + 1); i %= choices.length; }
    else i = randomIndex(choices.length);
    out.push(choices[i]);
  }
  return out.join(String(separator));
}
export function homophonicDecode(text, mapping = defaultHomophonicMapping()) {
  const { dec } = parseHomophonicMapping(mapping), allSingle = [...dec.keys()].every(s => [...s].length === 1);
  let toks = String(text).trim().split(/[\s,]+/).filter(Boolean);
  if (toks.length === 1 && allSingle && !dec.has(toks[0])) toks = [...toks[0]];
  let out = '';
  for (const t of toks) { if (!dec.has(t)) throw new Error(`Unknown homophonic symbol: ${t}`); out += dec.get(t); }
  return out;
}

// ---------------------------------------------------------------------------
// Straddling checkerboard
export const STRADDLING_SYMBOLS = 'ETAONRISBCDFGHJKLMPQ/UVWXYZ.';
export function straddlingBoard(headerDigits = '0123456789', rowPrefixes = '26', symbols = STRADDLING_SYMBOLS) {
  const header = String(headerDigits).replace(/\D/g, '');
  const prefixes = String(rowPrefixes).replace(/\D/g, '');
  symbols = String(symbols).toUpperCase().replace(/\s/g, '');
  if (header.length !== 10 || new Set(header).size !== 10 || [...'0123456789'].some(d => !header.includes(d))) throw new Error('Header digits must be a permutation of 0123456789');
  if (prefixes.length !== 2 || prefixes[0] === prefixes[1] || !header.includes(prefixes[0]) || !header.includes(prefixes[1])) throw new Error('Row prefixes must be two distinct header digits');
  if (symbols.length !== 28 || new Set(symbols).size !== 28) throw new Error('Symbol order must contain exactly 28 unique symbols');
  const topCols = [...header].map((d, i) => prefixes.includes(d) ? -1 : i).filter(i => i >= 0);
  const enc = new Map(), dec = new Map(); let p = 0;
  for (const col of topCols) { const s = symbols[p++], code = header[col]; enc.set(s, code); dec.set(code, s); }
  for (const pref of prefixes) for (let col = 0; col < 10; col++) { const s = symbols[p++], code = pref + header[col]; enc.set(s, code); dec.set(code, s); }
  return { header, prefixes, symbols, enc, dec };
}
export function straddlingEncode(text, header = '0123456789', prefixes = '26', symbols = STRADDLING_SYMBOLS, digitMode = 'Single-digit escape') {
  const board = straddlingBoard(header, prefixes, symbols), slash = board.enc.get('/');
  if (!slash) throw new Error('Symbol order must include / for digit encoding');
  const triple = String(digitMode).toLowerCase().includes('triple');
  let out = '';
  const s = String(text).toUpperCase();
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/\d/.test(c)) {
      if (triple) { out += slash; while (i < s.length && /\d/.test(s[i])) { out += s[i].repeat(3); i++; } out += slash; }
      else { out += slash + c; i++; }
      continue;
    }
    if (board.enc.has(c)) out += board.enc.get(c);
    i++;
  }
  return out;
}
export function straddlingDecode(text, header = '0123456789', prefixes = '26', symbols = STRADDLING_SYMBOLS, digitMode = 'Single-digit escape') {
  const board = straddlingBoard(header, prefixes, symbols), slash = board.enc.get('/'), digits = String(text).replace(/\D/g, ''), triple = String(digitMode).toLowerCase().includes('triple');
  let out = '', i = 0;
  const readSymbol = () => {
    if (i >= digits.length) return null;
    const len = board.prefixes.includes(digits[i]) ? 2 : 1;
    if (i + len > digits.length) throw new Error('Truncated straddling checkerboard code');
    const code = digits.slice(i, i + len); i += len;
    if (!board.dec.has(code)) throw new Error(`Unknown checkerboard code ${code}`);
    return board.dec.get(code);
  };
  while (i < digits.length) {
    const start = i, sym = readSymbol();
    if (sym !== '/') { out += sym; continue; }
    if (!triple) { if (i >= digits.length) throw new Error('Digit escape at end of checkerboard text'); out += digits[i++]; continue; }
    // In triple mode a slash followed by ddd opens numeric mode; otherwise treat it literally.
    if (i + 2 >= digits.length || !(digits[i] === digits[i + 1] && digits[i] === digits[i + 2])) { out += '/'; continue; }
    while (i < digits.length) {
      if (digits.startsWith(slash, i)) { i += slash.length; break; }
      if (i + 2 >= digits.length || !(digits[i] === digits[i + 1] && digits[i] === digits[i + 2])) throw new Error(`Invalid triple-digit sequence near position ${i + 1}`);
      out += digits[i]; i += 3;
    }
    if (i === start) throw new Error('Invalid checkerboard numeric shift');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Myszkowski transposition
export function myszkowskiRanks(keyword) {
  const key = az(keyword); if (!key.length) throw new Error('Keyword must contain at least one letter');
  const uniques = [...new Set(key)].sort();
  return key.map(c => uniques.indexOf(c) + 1);
}
function myszkowskiPositions(length, keyword) {
  const ranks = myszkowskiRanks(keyword), n = ranks.length, rows = Math.ceil(length / n), out = [];
  for (let rank = 1; rank <= Math.max(...ranks); rank++) {
    const cols = ranks.map((v, i) => v === rank ? i : -1).filter(i => i >= 0);
    if (cols.length === 1) {
      for (let r = 0; r < rows; r++) { const p = r * n + cols[0]; if (p < length) out.push(p); }
    } else {
      for (let r = 0; r < rows; r++) for (const c of cols) { const p = r * n + c; if (p < length) out.push(p); }
    }
  }
  return out;
}
export function myszkowskiEncode(text, keyword = 'TOMATO', stripWhitespace = true) {
  const s = stripWhitespace ? String(text).replace(/\s+/g, '') : String(text), pos = myszkowskiPositions(s.length, keyword);
  return pos.map(i => s[i]).join('');
}
export function myszkowskiDecode(text, keyword = 'TOMATO') {
  const s = String(text), pos = myszkowskiPositions(s.length, keyword), grid = new Array(s.length);
  pos.forEach((p, i) => { grid[p] = s[i]; }); return grid.join('');
}

// ---------------------------------------------------------------------------
// VIC cipher
function digitsOf(s) { return [...String(s).replace(/\D/g, '')].map(Number); }
export function vicSequence(source, digits = false, modTen = true) {
  const arr = Array.from(source);
  const sortable = arr.map((v, i) => ({ v, i, key: digits ? (Number(v) === 0 ? 10 : Number(v)) : String(v) }));
  sortable.sort((a, b) => digits ? a.key - b.key || a.i - b.i : a.key.localeCompare(b.key) || a.i - b.i);
  const out = new Array(arr.length);
  sortable.forEach((x, rank) => { const r = rank + 1; out[x.i] = modTen ? r % 10 : r; });
  return out;
}
export function vicChain(seed, length) {
  const out = Array.from(seed, Number); if (out.length < 2) throw new Error('Chain addition requires at least two seed digits');
  let i = 0; while (out.length < length) out.push((out[i] + out[i + 1]) % 10), i++;
  return out.slice(0, length);
}
export function vicDeriveKeys(phrase, date, personalNumber, keygroup) {
  const p = az(phrase).slice(0, 20); if (p.length < 20) throw new Error('VIC phrase must contain at least 20 letters');
  const dateDigits = digitsOf(date); if (dateDigits.length < 6) throw new Error('VIC date must provide at least six digits (example: 139195)');
  const kg = digitsOf(keygroup); if (kg.length !== 5) throw new Error('VIC keygroup must contain exactly five digits');
  const pn = Number(personalNumber); if (!Number.isInteger(pn) || pn < 1 || pn > 99) throw new Error('VIC personal number must be an integer from 1 through 99');
  const B = dateDigits.slice(0, 5), C = kg.map((d, i) => mod(d - B[i], 10));
  const E1 = vicSequence(p.slice(0, 10), false, true), E2 = vicSequence(p.slice(10, 20), false, true);
  const F = vicChain(C, 10), G = E1.map((d, i) => (d + F[i]) % 10);
  const H = G.map(d => E2[d === 0 ? 9 : d - 1]), J = vicSequence(H, true, true);
  const chain60 = vicChain(H, 60), block = Array.from({ length: 5 }, (_, r) => chain60.slice(10 + r * 10, 20 + r * 10));
  const P = block[4], last = P[9]; let prev = last;
  for (let i = 8; i >= 0; i--) if (P[i] !== last) { prev = P[i]; break; }
  if (prev === last) throw new Error('VIC key schedule produced no unequal final digits for transposition widths');
  const width1 = pn + prev, width2 = pn + last;
  if (width1 < 1 || width2 < 1 || width1 > 60 || width2 > 60 || width1 + width2 > 50) throw new Error('VIC personal number produces unusable transposition widths for this key schedule');
  const stream = [];
  for (let rank = 1; rank <= 10; rank++) {
    const digitRank = rank === 10 ? 0 : rank, col = J.indexOf(digitRank);
    for (let r = 0; r < 5; r++) stream.push(block[r][col]);
  }
  const Q = stream.slice(0, width1), R = stream.slice(width1, width1 + width2), S = vicSequence(P, true, true);
  const k1 = vicSequence(Q, true, false), k2 = vicSequence(R, true, false);
  return { A: kg, B, C, E1, E2, F, G, H, J, K:block[0], L:block[1], M:block[2], N:block[3], P, Q, R, S, k1, k2, width1, width2, indicatorDigit: dateDigits[5] };
}
function vicCheckerboard(keys) {
  const header = keys.S.join(''), mnemonic = 'ATONESIR';
  const blankCols = [2, 6], prefixes = blankCols.map(i => header[i]).join('');
  const remaining = [...ALPHA].filter(c => !mnemonic.includes(c)).join('') + './';
  return straddlingBoard(header, prefixes, mnemonic + remaining);
}
export function vicCheckerboardEncode(text, keys) {
  const board = vicCheckerboard(keys), slash = board.enc.get('/');
  const s = String(text).toUpperCase(); let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/\d/.test(c)) { out += slash; while (i < s.length && /\d/.test(s[i])) { out += s[i].repeat(3); i++; } out += slash; continue; }
    if (board.enc.has(c)) out += board.enc.get(c);
    i++;
  }
  return out;
}
export function vicCheckerboardDecode(text, keys) {
  const board = vicCheckerboard(keys), slash = board.enc.get('/'), raw = String(text).replace(/\D/g, ''); let i = 0, out = '';
  function readCode() {
    const len = board.prefixes.includes(raw[i]) ? 2 : 1, code = raw.slice(i, i + len); if (code.length !== len || !board.dec.has(code)) throw new Error(`Invalid VIC checkerboard code near digit ${i + 1}`); i += len; return board.dec.get(code);
  }
  while (i < raw.length) {
    const sym = readCode();
    if (sym !== '/') { out += sym; continue; }
    // A slash followed by a valid triple-digit run is numeric shift; otherwise keep it as a literal bisection marker.
    if (i + 2 >= raw.length || !(raw[i] === raw[i + 1] && raw[i] === raw[i + 2])) { out += '/'; continue; }
    while (i < raw.length) {
      if (raw.startsWith(slash, i)) { i += slash.length; break; }
      if (i + 2 >= raw.length || raw[i] !== raw[i + 1] || raw[i] !== raw[i + 2]) throw new Error(`Invalid VIC numeric triple near digit ${i + 1}`);
      out += raw[i]; i += 3;
    }
  }
  return out;
}
function keyOrderFromRanks(ranks) { return ranks.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v || a.i - b.i).map(x => x.i); }
function vicSimpleTranspose(source, columns) {
  const n = columns.length, matrix = [];
  for (let i = 0; i < source.length; i += n) matrix.push(source.slice(i, i + n).split(''));
  let out = '';
  for (const c of keyOrderFromRanks(columns)) for (const row of matrix) if (c < row.length) out += row[c];
  return out;
}
function vicUnSimpleTranspose(source, columns) {
  const n = columns.length, rows = Math.ceil(source.length / n), last = source.length % n;
  const lens = Array.from({ length:n }, (_, c) => last === 0 || c < last ? rows : rows - 1), cols = Array(n), order = keyOrderFromRanks(columns); let p = 0;
  for (const c of order) { cols[c] = source.slice(p, p + lens[c]); p += lens[c]; }
  let out = ''; for (let r=0;r<rows;r++) for (let c=0;c<n;c++) if (r < cols[c].length) out += cols[c][r]; return out;
}
function vicDisruptedPositions(columns, sourceLen) {
  const colLen = columns.length, rows = Math.ceil(sourceLen / colLen), last = sourceLen % colLen, positions = [];
  function buildTriangle(startColumn, startRow) {
    let row = startRow;
    for (let limit = startColumn; limit < colLen && row < rows; limit++, row++) {
      const max = row === rows - 1 && last ? Math.min(last, limit) : limit;
      for (let c = 0; c < max; c++) positions.push({ x:c, y:row });
    }
    if (row !== rows) {
      const sorted = columns.slice().sort((a,b)=>a-b), rankIndex = sorted.indexOf(columns[startColumn]), nextVal = sorted[rankIndex + 1], nextCol = columns.indexOf(nextVal);
      buildTriangle(nextCol, row);
    }
  }
  const min = Math.min(...columns); buildTriangle(columns.indexOf(min), 0);
  const occupied = new Set(positions.map(p => `${p.x},${p.y}`));
  const fullRows = last === 0 ? rows : rows - 1;
  for (let r=0;r<fullRows;r++) for (let c=0;c<colLen;c++) if (!occupied.has(`${c},${r}`)) positions.push({x:c,y:r});
  if (last) for (let c=0;c<last;c++) if (!occupied.has(`${c},${rows-1}`)) positions.push({x:c,y:rows-1});
  return positions;
}
function vicDisruptedTranspose(source, columns) {
  const n=columns.length, rows=Math.ceil(source.length/n), pos=vicDisruptedPositions(columns, source.length), matrix=Array.from({length:rows},()=>[]);
  pos.forEach((p,i)=>{matrix[p.y][p.x]=source[i];}); let out='';
  for (const c of keyOrderFromRanks(columns)) for(let r=0;r<rows;r++) if(matrix[r][c] !== undefined) out += matrix[r][c]; return out;
}
function vicUnDisruptedTranspose(source, columns) {
  const n=columns.length, rows=Math.ceil(source.length/n), last=source.length%n, lens=Array.from({length:n},(_,c)=>last===0||c<last?rows:rows-1), matrix=Array.from({length:rows},()=>[]), order=keyOrderFromRanks(columns); let p=0;
  for(const c of order) for(let r=0;r<lens[c];r++) matrix[r][c]=source[p++];
  return vicDisruptedPositions(columns, source.length).map(q=>matrix[q.y][q.x]).join('');
}
function vicIndicatorGroups(d) { return d === 0 ? 10 : d; }
export function vicEncode(text, phrase = "'Twas the night before Christmas", date = '139195', personalNumber = 6, keygroup = '72401', historicalPadding = false, bisectionPosition = 0) {
  const keys = vicDeriveKeys(phrase, date, personalNumber, keygroup);
  let normalized = String(text).toUpperCase().replace(/[^A-Z0-9.]/g, '');
  const cut = Number(bisectionPosition);
  if (Number.isInteger(cut) && cut > 0 && cut < normalized.length) normalized = normalized.slice(cut) + normalized.slice(0, cut);
  let digits = vicCheckerboardEncode(normalized, keys);
  if (historicalPadding) {
    const board = vicCheckerboard(keys), padDigit = board.enc.get('E');
    while (digits.length % 5) digits += padDigit;
  }
  const first = vicSimpleTranspose(digits, keys.k1), second = vicDisruptedTranspose(first, keys.k2), kg = keys.A.join('');
  const groups = vicIndicatorGroups(keys.indicatorDigit), idx = Math.max(0, second.length - 5 * (groups - 1));
  return second.slice(0, idx) + kg + second.slice(idx);
}
export function vicDecode(text, phrase = "'Twas the night before Christmas", date = '139195', personalNumber = 6, bisectionPosition = 0) {
  const cipher = String(text).replace(/\D/g, '');
  const dd = digitsOf(date); if (dd.length < 6) throw new Error('VIC date must provide at least six digits');
  const groups = vicIndicatorGroups(dd[5]), idx = cipher.length - 5 * groups;
  if (idx < 0 || idx + 5 > cipher.length) throw new Error('Ciphertext is too short to contain the VIC keygroup at the date-indicated position');
  const keygroup = cipher.slice(idx, idx + 5), body = cipher.slice(0, idx) + cipher.slice(idx + 5), keys = vicDeriveKeys(phrase, date, personalNumber, keygroup);
  const first = vicUnDisruptedTranspose(body, keys.k2), checkerDigits = vicUnSimpleTranspose(first, keys.k1);
  let plain = vicCheckerboardDecode(checkerDigits, keys);
  const cut = Number(bisectionPosition);
  if (Number.isInteger(cut) && cut > 0 && cut < plain.length) plain = plain.slice(plain.length - cut) + plain.slice(0, plain.length - cut);
  return plain;
}
