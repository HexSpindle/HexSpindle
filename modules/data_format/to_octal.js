import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('To Octal', 'Converts the input to octal.', [A.select('Delimiter', DELIMS)],
  (data, d) => [...data].map(b => b.toString(8)).join(delim(d)));
