import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delimRegex } from '../../core/util.js';

module('From Decimal', 'Converts decimal byte values back to bytes.', [A.select('Delimiter', [...DELIMS, 'Auto']), A.boolean('Support signed values', false)],
  (t, d, signed) => {
    const parts = t.split(d === 'Auto' ? /[^\d-]+/ : delimRegex(d)).filter(s => s !== '');
    let vals = parts.map(s => parseInt(s, 10));
    if (signed) vals = vals.map(v => v < 0 ? 0xFF + v + 1 : v);
    return Uint8Array.from(vals);
  }, { text: true });
