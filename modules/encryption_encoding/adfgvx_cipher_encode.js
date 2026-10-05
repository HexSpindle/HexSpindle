import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const SQ_LETTERS = 'ADFGVX';

function buildSquare(keyword, alphabet) {
  const seen = [];
  for (const c of (keyword.toUpperCase() + alphabet)) {
    if (/[A-Z0-9]/.test(c) && !seen.includes(c)) seen.push(c);
  }
  return seen;
}

function adfgvxEncode(t, squareKey, transKey, adfgx) {
  const size = adfgx ? 5 : 6;
  const labels = adfgx ? SQ_LETTERS.slice(1) : SQ_LETTERS;
  const alphabet = adfgx ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const sq = buildSquare(squareKey, alphabet).slice(0, size * size);
  if (sq.length < size * size) throw new Error(`Square key must cover all ${size * size} symbols`);
  let letters = [...t.toUpperCase()].filter(c => /[A-Z0-9]/.test(c));
  if (adfgx) letters = letters.filter(c => /[A-Z]/.test(c));
  const coords = [];
  for (const c of letters) {
    const idx = sq.indexOf(c);
    coords.push(labels[Math.floor(idx / size)] + labels[idx % size]);
  }
  const rows = coords.join('');
  const key = transKey.toUpperCase();
  const order = key.split('').map((_, i) => i).sort((a, b) => key[a] < key[b] ? -1 : key[a] > key[b] ? 1 : a - b);
  const cols = key.split('').map(() => '');
  for (let i = 0; i < rows.length; i++) cols[i % key.length] += rows[i];
  return order.map(i => cols[i]).join('');
}

module('ADFGVX Cipher Encode', 'WWI German field cipher: Polybius square over A-Z0-9 (or ADFGX for letters only) with coordinates read off, then columnar transposition by a keyword.',
  [A.string('Square key (fills a 6x6 or 5x5 grid)', 'PH0QG64MEA1YL2NOFDXKR3CVS5ZW7I89UTB'), A.string('Transposition keyword', 'GERMAN'), A.boolean('ADFGX (letters only, 5x5)', false)],
  (t, squareKey, transKey, adfgx) => adfgvxEncode(t, squareKey, transKey, adfgx), { text: true });

export { buildSquare, SQ_LETTERS };
