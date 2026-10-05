import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines, joinLines } from './_bytes.js';

module('Take every nth byte', 'Keeps every Nth byte.', [A.number('Take every', 4, 1), A.number('Starting at', 0, 0), A.boolean('Apply to each line', false)],
  (data, n, start, perLine) => {
    const f = b => { const out = []; for (let i = start; i < b.length; i += n) out.push(b[i]); return new Uint8Array(out); };
    return perLine ? joinLines(splitLines(data).map(f)) : f(data);
  });
