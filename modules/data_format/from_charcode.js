import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';

module('From Charcode', 'Converts Unicode character codes back to text.', [A.select('Delimiter', DELIMS), A.number('Base', 16, 2, 36)],
  (t, d, base) => (t.match(/[0-9a-zA-Z]+/g) || []).map(x => String.fromCodePoint(parseInt(x, base))).join(''), { text: true });
