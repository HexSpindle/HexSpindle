import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Caesar Box Cipher', 'Writes the text in rows of the given box size and reads it by columns.', [A.number('Box height', 1, 1)],
  (t, h) => {
    const w = Math.ceil(t.length / h);
    let s = t.replace(/ /g, '');
    s += '\0'.repeat(Math.max(0, h * w - s.length));
    let out = '';
    for (let i = 0; i < h; i++) for (let j = i; j < s.length; j += h) if (s[j] !== '\0') out += s[j];
    return out;
  }, { text: true });
