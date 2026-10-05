import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DEFAULT_L, DEFAULT_R, step } from './chaocipher_encode.js';

module('Chaocipher Decode', 'Decodes a Chaocipher message.',
  [A.string('Left alphabet (26 letters)', DEFAULT_L), A.string('Right alphabet (26 letters)', DEFAULT_R)],
  (t, leftS, rightS) => {
    let left = [...leftS.toUpperCase()], right = [...rightS.toUpperCase()];
    if (new Set(left).size !== 26 || new Set(right).size !== 26) throw new Error('Both alphabets must contain all 26 letters exactly once');
    const out = [];
    for (const c of t.toUpperCase()) {
      if (/[A-Z]/.test(c)) {
        const [l2, r2, pt] = step(left, right, c, false);
        left = l2; right = r2;
        out.push(pt);
      } else out.push(c);
    }
    return out.join('');
  }, { text: true });
