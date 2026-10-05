export const LETTERS = "_abcdefghijklmnopqrstuvwxyz.0123456789,-+*/:?!'()";

function rotateDown(key, col, n) {
  const lines = [];
  for (let i = 0; i < 7; i++) lines.push(key.slice(i * 7, (i + 1) * 7));
  const lefts = [], mids = [], rights = [];
  for (const line of lines) { lefts.push(line.slice(0, col)); mids.push(line.charAt(col)); rights.push(line.slice(col + 1)); }
  n = (7 - n % 7) % 7;
  const rotated = mids.slice(n).concat(mids.slice(0, n));
  let result = '';
  for (let i = 0; i < 7; i++) result += lefts[i] + rotated[i] + rights[i];
  return result;
}

function rotateRight(key, row, n) {
  const mid = key.slice(row * 7, (row + 1) * 7);
  n = (7 - n % 7) % 7;
  return key.slice(0, 7 * row) + mid.slice(n) + mid.slice(0, n) + key.slice(7 * (row + 1));
}

function findIx(letter) {
  const i = LETTERS.indexOf(letter);
  if (i < 0) throw new Error(`Letter ${letter} is not included in LS47`);
  return [Math.floor(i / 7), i % 7];
}

export function deriveKey(password) {
  let i = 0, k = LETTERS;
  for (const c of password) {
    const [row, col] = findIx(c);
    k = rotateDown(rotateRight(k, i, col), i, row);
    i = (i + 1) % 7;
  }
  return k;
}

function checkKey(key) {
  if (key.length !== LETTERS.length) throw new Error('Wrong key size');
  const seen = new Set();
  for (const c of key) {
    if (!LETTERS.includes(c)) throw new Error(`Letter ${c} not in LS47`);
    if (seen.has(c)) throw new Error('Letter duplicated in the key');
    seen.add(c);
  }
}

function findPos(key, letter) {
  const i = key.indexOf(letter);
  if (i < 0) throw new Error(`Letter ${letter} is not in the key`);
  return [Math.floor(i / 7), i % 7];
}
function findAtPos(key, pos) { return key.charAt(pos[1] + pos[0] * 7); }
function addPos(a, b) { return [(a[0] + b[0]) % 7, (a[1] + b[1]) % 7]; }
function subPos(a, b) {
  const da = a[0] - b[0], db = a[1] - b[1];
  return [da - Math.floor(da / 7) * 7, db - Math.floor(db / 7) * 7];
}

export function encrypt(key, plaintext) {
  checkKey(key);
  let mp = [0, 0], ciphertext = '';
  for (const p of plaintext) {
    const pp = findPos(key, p);
    const mix = findIx(findAtPos(key, mp));
    let cp = addPos(pp, mix);
    const c = findAtPos(key, cp);
    ciphertext += c;
    key = rotateRight(key, pp[0], 1);
    cp = findPos(key, c);
    key = rotateDown(key, cp[1], 1);
    mp = addPos(mp, findIx(c));
  }
  return ciphertext;
}

export function decrypt(key, ciphertext) {
  checkKey(key);
  let mp = [0, 0], plaintext = '';
  for (const c of ciphertext) {
    let cp = findPos(key, c);
    const mix = findIx(findAtPos(key, mp));
    const pp = subPos(cp, mix);
    const p = findAtPos(key, pp);
    plaintext += p;
    key = rotateRight(key, pp[0], 1);
    cp = findPos(key, c);
    key = rotateDown(key, cp[1], 1);
    mp = addPos(mp, findIx(c));
  }
  return plaintext;
}

/** Random LS47-alphabet padding + "---" separator + signature, matching encryptPad()/decryptPad(). */
export function encryptPad(key, plaintext, signature, paddingSize) {
  checkKey(key);
  let padding = '';
  for (let i = 0; i < paddingSize; i++) padding += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  return encrypt(key, padding + plaintext + '---' + signature);
}

export function decryptPad(key, ciphertext, paddingSize) {
  checkKey(key);
  return decrypt(key, ciphertext).slice(paddingSize);
}
