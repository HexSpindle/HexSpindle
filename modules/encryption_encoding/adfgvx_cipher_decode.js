import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { buildSquare, SQ_LETTERS } from './adfgvx_cipher_encode.js';

module('ADFGVX Cipher Decode', 'Decodes ADFGVX / ADFGX ciphertext.',
  [A.string('Square key (fills a 6x6 or 5x5 grid)', 'PH0QG64MEA1YL2NOFDXKR3CVS5ZW7I89UTB'), A.string('Transposition keyword', 'GERMAN'), A.boolean('ADFGX (letters only, 5x5)', false)],
  (t, squareKey, transKey, adfgx) => {
    const size = adfgx ? 5 : 6;
    const labels = adfgx ? 'ADFGX' : SQ_LETTERS;
    const alphabet = adfgx ? 'ABCDEFGHIKLMNOPQRSTUVWXYZ' : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const sq = buildSquare(adfgx ? squareKey.toUpperCase().replace(/J/g, 'I') : squareKey, alphabet).slice(0, size * size);
    const cipher = [...t.toUpperCase()].filter(c => labels.includes(c));
    const key = transKey.toUpperCase();
    const nk = key.length;
    const nrows = Math.floor(cipher.length / nk);
    const extra = cipher.length % nk;
    const order = key.split('').map((_, i) => i).sort((a, b) => key[a] < key[b] ? -1 : key[a] > key[b] ? 1 : a - b);
    const colLens = [...Array(nk).keys()].map(i => nrows + (i < extra ? 1 : 0));
    const cols = new Array(nk).fill(null);
    let pos = 0;
    for (const i of order) {
      cols[i] = cipher.slice(pos, pos + colLens[i]);
      pos += colLens[i];
    }
    const rows = [];
    for (let r = 0; r < nrows + 1; r++) {
      for (let c = 0; c < nk; c++) {
        if (r < cols[c].length) rows.push(cols[c][r]);
      }
    }
    const pairs = rows.join('');
    const out = [];
    for (let i = 0; i < pairs.length - 1; i += 2) {
      const r = labels.indexOf(pairs[i]), c = labels.indexOf(pairs[i + 1]);
      out.push(sq[r * size + c]);
    }
    return out.join('');
  }, { text: true });
