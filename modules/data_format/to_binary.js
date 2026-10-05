import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('To Binary', 'Displays the input as binary (base 2).', [A.select('Delimiter', DELIMS), A.number('Byte length', 8, 1, 64)],
  (data, d, bl) => [...data].map(b => b.toString(2).padStart(bl, '0')).join(delim(d)));
