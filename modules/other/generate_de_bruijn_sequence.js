import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Generate De Bruijn Sequence', 'Generates a De Bruijn sequence B(k, n): the shortest cyclic sequence containing every length-n string over a k-symbol alphabet exactly once - useful for testing input buffers / finding offsets.',
  [A.number('Alphabet size (k)', 2, 2, 36), A.number('Substring length (n)', 4, 1, 12)],
  (t, k, n) => {
    k = Math.trunc(k); n = Math.trunc(n);
    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, k);
    const a = new Array(k * n).fill(0);
    const seq = [];
    function db(t_, p) {
      if (t_ > n) {
        if (n % p === 0) seq.push(...a.slice(1, p + 1));
      } else {
        a[t_] = a[t_ - p];
        db(t_ + 1, p);
        for (let j = a[t_ - p] + 1; j < k; j++) {
          a[t_] = j;
          db(t_ + 1, t_);
        }
      }
    }
    db(1, 1);
    return seq.map(i => alphabet[i]).join('');
  }, { text: true });
