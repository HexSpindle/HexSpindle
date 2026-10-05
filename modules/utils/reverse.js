import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeUtf8 } from '../../core/util.js';

module('Reverse', 'Reverses the input by character, line or byte.', [A.select('By', ['Character', 'Line', 'Byte'])],
  (data, by) => {
    if (by === 'Byte') return Uint8Array.from(data).reverse();
    const t = decodeUtf8(data);
    return by === 'Character' ? [...t].reverse().join('') : t.split('\n').reverse().join('\n');
  });
