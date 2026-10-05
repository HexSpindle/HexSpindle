import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('From Octal', 'Converts octal text back to bytes.', [A.select('Delimiter', DELIMS)],
  (t, d) => {
    if (!t.length) return new Uint8Array();
    return Uint8Array.from(t.split(delim(d)).map(v => parseInt(v, 8)));
  }, { text: true });
