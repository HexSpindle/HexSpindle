import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

module('A1Z26 Cipher Decode', 'Replaces numbers 1-26 with letters.', [A.select('Delimiter', ['Space', 'Comma', 'Semi-colon', 'Colon', 'Line feed', 'CRLF'])],
  (t, d) => {
    if (!t.length) return '';
    return t.split(delim(d || 'Space')).map(b => {
      if (b < 1 || b > 26) throw new Error('Error: all numbers must be between 1 and 26.');
      return String.fromCharCode(parseInt(b, 10) + 96);
    }).join('');
  }, { text: true });
