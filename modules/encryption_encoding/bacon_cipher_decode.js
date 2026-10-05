import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { table, ALPHABETS } from './bacon_cipher_encode.js';

module('Bacon Cipher Decode', 'Decodes Bacon cipher text (5-symbol groups of A/B or 0/1).',
  [A.select('Alphabet', ALPHABETS), A.select('Translation', ['0/1', 'A/B']), A.boolean('Invert translation', false)],
  (t, alpha, tr, invert) => {
    const tb = Object.fromEntries(Object.entries(table(alpha, tr)).map(([k, v]) => [v, k]));
    const sym = tr === '0/1' ? '01' : 'AB';
    let s = [...t.toUpperCase()].filter(c => sym.includes(c)).join('');
    if (invert) {
      const rev = [...sym].reverse().join('');
      s = [...s].map(c => rev[sym.indexOf(c)]).join('');
    }
    const n = s.length - (s.length % 5);
    const out = [];
    for (let i = 0; i < n; i += 5) out.push(tb[s.slice(i, i + 5)] ?? '?');
    return out.join('');
  }, { text: true });
