import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { secureRandBelow } from './_cat.js';

module('Pseudo-Random Integer Generator', 'Generates cryptographically secure random integers in a range. The input is ignored.',
  [A.number('Minimum', 0), A.number('Maximum', 100), A.number('Count', 1, 1, 10000), A.select('Delimiter', ['Line feed', 'Space', 'Comma'])],
  (data, lo, hi, count, delim) => {
    lo = Math.trunc(lo); hi = Math.trunc(hi); count = Math.trunc(count);
    if (hi < lo) throw new Error('Maximum must be >= Minimum');
    const sep = { 'Line feed': '\n', 'Space': ' ', 'Comma': ',' }[delim];
    return Array.from({ length: count }, () => String(secureRandBelow(hi - lo + 1) + lo)).join(sep);
  }, { nondeterministic: true });
