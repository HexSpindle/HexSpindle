import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';
import { parseNumbers } from './_num.js';

module('Subtract', 'Subtracts the following numbers from the first.', [A.select('Delimiter', DELIMS, 'Line feed')],
  (t, d) => {
    const n = parseNumbers(t, d);
    if (!n.length) return 'NaN';
    return String(n[0] - n.slice(1).reduce((a, b) => a + b, 0));
  }, { text: true });
