import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const DEFAULT_L = 'HXUCZVAMDSLKPEFJRIGTWOBNYQ';
const DEFAULT_R = 'PTLNBQDEOYSFAVZKGJRIHWXUMC';

function step(left, right, idx, encrypt) {
  let pos, ct;
  if (encrypt) {
    pos = right.indexOf(idx);
    ct = left[pos];
  } else {
    pos = left.indexOf(idx);
    ct = right[pos];
  }
  left = left.slice(pos).concat(left.slice(0, pos));
  left = [left[0]].concat(left.slice(2, 14), [left[1]], left.slice(14));
  right = right.slice(pos).concat(right.slice(0, pos));
  right = right.slice(1).concat(right.slice(0, 1));
  right = right.slice(0, 2).concat(right.slice(3, 14), [right[2]], right.slice(14));
  return [left, right, ct];
}

module('Chaocipher Encode', "J.F. Byrne's Chaocipher: two mutating alphabet wheels (left/right) that permute after every character.",
  [A.string('Left alphabet (26 letters)', DEFAULT_L), A.string('Right alphabet (26 letters)', DEFAULT_R)],
  (t, leftS, rightS) => {
    let left = [...leftS.toUpperCase()], right = [...rightS.toUpperCase()];
    if (new Set(left).size !== 26 || new Set(right).size !== 26) throw new Error('Both alphabets must contain all 26 letters exactly once');
    const out = [];
    for (const c of t.toUpperCase()) {
      if (/[A-Z]/.test(c)) {
        const [l2, r2, ct] = step(left, right, c, true);
        left = l2; right = r2;
        out.push(ct);
      } else out.push(c);
    }
    return out.join('');
  }, { text: true });

export { DEFAULT_L, DEFAULT_R, step };
