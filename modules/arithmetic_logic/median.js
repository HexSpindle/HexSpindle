import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';
import { parseNumbers } from './_num.js';

module('Median', 'Median of a list of numbers.', [A.select('Delimiter', DELIMS, 'Line feed')],
  (t, d) => {
    const n = parseNumbers(t, d);
    if (!n.length) throw new Error('no median for empty data');
    const s = [...n].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return String(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
  }, { text: true });
