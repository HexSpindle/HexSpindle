import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

module('Split', 'Replaces one delimiter with another.', [A.string('Split delimiter', ','), A.string('Join delimiter', '\\n')],
  (t, s, j) => t.split(delim(s)).join(delim(j)), { text: true });
