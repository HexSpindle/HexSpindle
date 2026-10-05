import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines, joinLines, pySlice } from './_bytes.js';

module('Drop bytes', 'Removes a range of bytes.', [A.number('Start', 0), A.number('Length', 5), A.boolean('Apply to each line', false)],
  (data, start, length, perLine) => {
    const f = b => {
      const left = pySlice(b, 0, start), right = pySlice(b, start + length, undefined);
      const out = new Uint8Array(left.length + right.length);
      out.set(left, 0); out.set(right, left.length);
      return out;
    };
    return perLine ? joinLines(splitLines(data).map(f)) : f(data);
  });
