import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Escape Unicode Characters', 'Converts characters to \\uXXXX style escapes.',
  [A.select('Prefix', ['\\u', '%u', 'U+']), A.boolean('Encode all chars', false), A.number('Padding', 4, 1, 8), A.boolean('Uppercase hex', true)],
  (t, prefix, everything, pad, upper) => {
    let out = '';
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (!everything && /[ -~]/.test(c)) { out += c; continue; }
      let h = c.codePointAt(0).toString(16);
      if (upper) h = h.toUpperCase();
      out += prefix + h.padStart(pad, '0');
    }
    return out;
  }, { text: true });
