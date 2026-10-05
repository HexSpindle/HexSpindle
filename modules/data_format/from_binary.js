import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delimRegex } from '../../core/util.js';

module('From Binary', 'Converts binary text back to bytes.', [A.select('Delimiter', [...DELIMS, 'None']), A.number('Byte length', 8, 1, 64)],
  (t, d, bl) => {
    bl = Number(bl) || 8;
    if (bl < 1 || Math.round(bl) !== bl) throw new Error('Byte length must be a positive integer');
    t = t.replace(delimRegex(d), '');
    const out = [];
    for (let i = 0; i < t.length; i += bl) out.push(parseInt(t.substr(i, bl), 2));
    return Uint8Array.from(out);
  }, { text: true });
