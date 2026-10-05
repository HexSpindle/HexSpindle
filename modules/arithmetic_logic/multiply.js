import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';
import { parseNumbers } from './_num.js';

module('Multiply', 'Multiplies a list of numbers.', [A.select('Delimiter', DELIMS, 'Line feed')],
  (t, d) => String(parseNumbers(t, d).reduce((a, b) => a * b, 1)), { text: true });
