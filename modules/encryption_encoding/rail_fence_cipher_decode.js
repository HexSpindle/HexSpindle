import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { railPattern } from './rail_fence_cipher_encode.js';

module('Rail Fence Cipher Decode', 'Decodes a Rail Fence cipher.', [A.number('Key (rails)', 2, 2), A.number('Offset', 0, 0)],
  (t, key, offset) => {
    const rows = railPattern(t.length, key, offset);
    const order = [];
    for (let r = 0; r < key; r++) for (let i = 0; i < t.length; i++) if (rows[i] === r) order.push(i);
    const out = new Array(t.length);
    [...t].forEach((ch, idx) => { out[order[idx]] = ch; });
    return out.join('');
  }, { text: true });
