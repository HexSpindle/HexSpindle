import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('File Tree', "Builds an ASCII file tree from a list of file paths, similar to the Unix 'tree' command.",
  [A.string('Path delimiter', '/'), A.select('Entry delimiter', DELIMS, 'Line feed')],
  (t, pathDelim, entryDelimName) => {
    const entryDelim = delim(entryDelimName);
    const ARROW = '|---', PIPE = '|   ';
    const seen = [];
    const out = [];
    const paths = [...new Set(t.split(entryDelim))].sort();
    for (const full of paths) {
      let segs = full.split(pathDelim);
      if (segs[0] === '') segs = segs.slice(1);
      for (let j = 0; j < segs.length; j++) {
        const key = segs.slice(0, j + 1).join('/');
        if (seen.includes(key)) continue;
        seen.push(key);
        out.push(j === 0 ? segs[j] : PIPE.repeat(j - 1) + ARROW + segs[j]);
      }
    }
    return out.join('\n');
  }, { text: true });
