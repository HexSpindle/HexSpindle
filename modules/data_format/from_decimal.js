import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';

module('From Decimal', 'Converts decimal byte values back to bytes.', [A.select('Delimiter', DELIMS), A.boolean('Support signed values', false)],
  (t) => new Uint8Array((t.match(/-?\d+/g) || []).map(x => parseInt(x, 10) & 255)), { text: true });
