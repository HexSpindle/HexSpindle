import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { secureRandBelow } from './_cat.js';

const DELIMS = { 'Line feed': '\n', 'Space': ' ', 'Comma': ',', 'Semi-colon': ';', 'Colon': ':', 'CRLF': '\r\n' };

module('Pseudo-Random Integer Generator', 'Generates cryptographically secure random integers in a range. The input is ignored.',
  [A.number('Minimum', 0), A.number('Maximum', 99), A.number('Count', 1, 1, 10000),
    A.select('Delimiter', ['Line feed', 'Space', 'Comma', 'Semi-colon', 'Colon', 'CRLF'], 'Space'),
    A.select('Output', ['Raw', 'Hex', 'Decimal'], 'Raw')],
  (data, lo, hi, count, delim, output = 'Raw') => {
    lo = Math.ceil(lo); hi = Math.floor(hi); count = Math.trunc(count);
    if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi)) throw new Error('Min and Max must be between `-(2^53 - 1)` and `2^53 - 1`.');
    if (lo > hi) throw new Error('Min cannot be larger than Max.');
    if (hi - lo + 1 > Number.MAX_SAFE_INTEGER) throw new Error('Range between Min and Max cannot be larger than `2^53`');
    const out = Array.from({ length: count }, () => {
      const v = secureRandBelow(hi - lo + 1) + lo;
      if (output !== 'Raw') return v.toString(output === 'Hex' ? 16 : 10);
      if (v > 0xffff) return String.fromCharCode((v - 0x10000) >>> 10 & 0x3ff | 0xd800, 0xdc00 | (v - 0x10000) & 0x3ff);
      return String.fromCharCode(v);
    });
    return out.join(output === 'Raw' ? '' : (DELIMS[delim] ?? ' '));
  }, { nondeterministic: true });
