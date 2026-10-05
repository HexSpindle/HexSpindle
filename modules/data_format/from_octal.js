import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';

module('From Octal', 'Converts octal text back to bytes.', [A.select('Delimiter', DELIMS)],
  (t) => new Uint8Array((t.match(/[0-7]+/g) || []).map(x => parseInt(x, 8) & 255)), { text: true });
