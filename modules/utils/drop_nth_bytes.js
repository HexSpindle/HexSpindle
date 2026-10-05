import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines, joinLines } from './_bytes.js';

module('Drop every nth byte', 'Removes every Nth byte.', [A.number('Drop every', 4, 1), A.number('Starting at', 0, 0), A.boolean('Apply to each line', false)],
  (data, n, start, perLine) => {
    const f = b => new Uint8Array([...b].filter((x, i) => i < start || (i - start) % n !== 0));
    return perLine ? joinLines(splitLines(data).map(f)) : f(data);
  });
