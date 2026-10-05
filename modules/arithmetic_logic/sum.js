import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('Sum', 'Adds a delimited list of numbers.', [A.select('Delimiter', DELIMS)],
  (t, d) => String(t.split(delim(d)).map(Number).filter(n => !Number.isNaN(n)).reduce((a, b) => a + b, 0)), { text: true });
