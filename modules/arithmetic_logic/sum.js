import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';
import { parseNumbers } from './_num.js';

module('Sum', 'Adds a delimited list of numbers.', [A.select('Delimiter', DELIMS, 'Line feed')],
  (t, d) => { const n = parseNumbers(t, d); return n.length ? String(n.reduce((a, b) => a + b)) : 'NaN'; }, { text: true });
