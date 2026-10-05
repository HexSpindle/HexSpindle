import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DEFAULT_SQ, buildCube } from './trifid_cipher_encode.js';

module('Trifid Cipher Decode', 'Decodes a Trifid cipher.',
  [A.string('Keyword (fills the 27-cell cube; default has no keyword)', DEFAULT_SQ), A.number('Period', 5, 1)],
  (t, keyword, period) => {
    const cube = buildCube(keyword);
    const letters = [...t.toUpperCase()].filter(c => cube.includes(c));
    const coords = letters.map(c => {
      const idx = cube.indexOf(c);
      return [Math.floor(idx / 9) + 1, Math.floor(idx / 3) % 3 + 1, idx % 3 + 1];
    });
    const out = [];
    for (let i = 0; i < coords.length; i += period) {
      const grp = coords.slice(i, i + period);
      const p = grp.length;
      const seq = [].concat(...grp);
      const aVals = seq.slice(0, p), bVals = seq.slice(p, 2 * p), cVals = seq.slice(2 * p, 3 * p);
      for (let k = 0; k < p; k++) {
        const a = aVals[k], b = bVals[k], c = cVals[k];
        out.push(cube[(a - 1) * 9 + (b - 1) * 3 + (c - 1)]);
      }
    }
    return out.join('');
  }, { text: true });
