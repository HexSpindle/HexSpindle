import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('Mean', 'Averages a delimited list of numbers.', [A.select('Delimiter', DELIMS)],
  (t, d) => { const nums = t.split(delim(d)).map(Number).filter(n => !Number.isNaN(n)); if (!nums.length) return '0'; return String(nums.reduce((a, b) => a + b, 0) / nums.length); }, { text: true });
