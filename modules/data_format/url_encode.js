import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('URL Encode', 'Percent-encodes special characters.', [A.boolean('Encode all special chars', false)],
  (data, everything) => {
    const safe = everything ? /^[A-Za-z0-9]$/ : /^[A-Za-z0-9:/?#[\]@!$&'()*+,;=%]$/;
    let out = '';
    for (const b of data) {
      const c = String.fromCharCode(b);
      out += safe.test(c) ? c : '%' + b.toString(16).toUpperCase().padStart(2, '0');
    }
    return out;
  });
