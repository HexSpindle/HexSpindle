import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const STD = 'ABCDEFGHIKLMNOPQRSTUWXYZ';
const COMPLETE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHABETS = ['Standard (I=J and U=V)', 'Complete'];

function table(alpha, tr) {
  const a = alpha.startsWith('Standard') ? STD : COMPLETE;
  const sym = tr === '0/1' ? ['0', '1'] : ['A', 'B'];
  const tb = {};
  for (let i = 0; i < a.length; i++) {
    const bits = i.toString(2).padStart(5, '0');
    tb[a[i]] = [...bits].map(b => b === '0' ? sym[0] : sym[1]).join('');
  }
  return tb;
}

module('Bacon Cipher Encode', 'Encodes letters as 5-bit groups of A/B (or 0/1).',
  [A.select('Alphabet', ALPHABETS), A.select('Translation', ['0/1', 'A/B']), A.boolean('Invert translation', false),
   A.boolean('Keep extra characters', false)],
  (t, alpha, tr, invert, keep) => {
    const tb = table(alpha, '0/1');
    let out = '';
    for (let c of t) {
      let u = c.toUpperCase();
      if (u.length !== 1 || u < 'A' || u > 'Z') { out += c; continue; }
      if (alpha.startsWith('Standard')) u = { J: 'I', V: 'U' }[u] ?? u;
      out += tb[u];
    }
    if (invert) out = out.replace(/[01]/g, b => (b === '0' ? '1' : '0'));
    if (!keep) out = (out.replace(/[^01]/g, '').match(/.{5}/g) || []).join(' ');
    if (tr === 'A/B') out = out.replace(/[01]/g, b => (b === '0' ? 'A' : 'B'));
    return out;
  }, { text: true });

export { table, ALPHABETS };
