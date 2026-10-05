import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const DEFAULT_SQ = 'EPSWKMORIAJGTHFCLNVZQUYDXB';

function buildCube(keyword) {
  const seen = [];
  for (const c of (keyword.toUpperCase() + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ+')) {
    if (/[A-Z]/.test(c) || c === '+') {
      if (!seen.includes(c)) seen.push(c);
    }
  }
  return seen.slice(0, 27);
}

module('Trifid Cipher Encode', "Félix Delastelle's Trifid cipher: a 3x3x3 Polybius cube, period-grouped fractionation.",
  [A.string('Keyword (fills the 27-cell cube; default has no keyword)', DEFAULT_SQ), A.number('Period', 5, 1)],
  (t, keyword, period) => {
    const cube = buildCube(keyword);
    const letters = [...t.toUpperCase()].filter(c => /[A-Z]/.test(c) || c === '+');
    const coords = letters.map(c => {
      const idx = cube.indexOf(c);
      return [Math.floor(idx / 9) + 1, Math.floor(idx / 3) % 3 + 1, idx % 3 + 1];
    });
    const out = [];
    for (let i = 0; i < coords.length; i += period) {
      const grp = coords.slice(i, i + period);
      const seq = [...grp.map(x => x[0]), ...grp.map(x => x[1]), ...grp.map(x => x[2])];
      for (let j = 0; j < seq.length; j += 3) {
        const [a, b, c] = seq.slice(j, j + 3);
        out.push(cube[(a - 1) * 9 + (b - 1) * 3 + (c - 1)]);
      }
    }
    return out.join('');
  }, { text: true });

export { DEFAULT_SQ, buildCube };
