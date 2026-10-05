import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';
import { parseNumbers } from './_num.js';

module('Divide', 'Divides the first number by each following number.', [A.select('Delimiter', DELIMS, 'Line feed')],
  (t, d) => {
    const n = parseNumbers(t, d);
    if (!n.length) throw new Error('No numbers found in the input');
    let r = n[0];
    for (let i = 1; i < n.length; i++) r /= n[i];
    return String(r);
  }, { text: true });
