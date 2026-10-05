import { module } from './_cat.js';
import { A } from '../../core/registry.js';

export const SCHEMES = {
  '8 4 2 1': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'Excess-3': [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  '2 4 2 1': [0, 1, 2, 3, 4, 11, 12, 13, 14, 15],
  '4 2 2 1': [0, 1, 4, 5, 8, 7, 10, 11, 14, 15],
  '8 4 -2 -1': [0, 7, 6, 5, 4, 11, 10, 9, 8, 15],
  '7 4 2 1': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
};

module('To Binary Coded Decimal', 'Encodes decimal digits as BCD nibbles (various schemes).',
  [A.select('Scheme', Object.keys(SCHEMES)), A.select('Output', ['Nibbles', 'Bytes (packed)'])], (t, scheme, out) => {
    const digits = t.replace(/\D/g, '');
    const nibs = [...digits].map(d => SCHEMES[scheme][+d].toString(2).padStart(4, '0'));
    if (out === 'Nibbles') return nibs.join(' ');
    if (nibs.length % 2) nibs.unshift('0000');
    const pairs = [];
    for (let i = 0; i < nibs.length; i += 2) pairs.push(nibs[i] + nibs[i + 1]);
    return pairs.join(' ');
  }, { text: true });
