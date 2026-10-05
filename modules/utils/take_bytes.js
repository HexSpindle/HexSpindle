import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines, joinLines, pySlice } from './_bytes.js';

module('Take bytes', 'Keeps a range of bytes.', [A.number('Start', 0), A.number('Length', 5), A.boolean('Apply to each line', false)],
  (data, start, length, perLine) => {
    const f = b => pySlice(b, start, start + length);
    return perLine ? joinLines(splitLines(data).map(f)) : f(data);
  });
