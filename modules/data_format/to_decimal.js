import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('To Decimal', 'Converts the input to decimal byte values.', [A.select('Delimiter', DELIMS), A.boolean('Support signed values', false)],
  (data, d, signed) => [...data].map(b => String(signed && b > 127 ? b - 256 : b)).join(delim(d)));
