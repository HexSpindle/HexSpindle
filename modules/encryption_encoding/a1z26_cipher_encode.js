import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('A1Z26 Cipher Encode', 'Replaces letters with their position in the alphabet (A=1 ... Z=26).', [A.select('Delimiter', DELIMS)],
  (t, d) => [...t.toUpperCase()].filter(c => c >= 'A' && c <= 'Z').map(c => c.charCodeAt(0) - 64).join(delim(d)), { text: true });
