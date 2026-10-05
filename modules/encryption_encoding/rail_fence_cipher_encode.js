import { module } from './_cat.js';
import { A } from '../../core/registry.js';

export function railPattern(n, key, offset) {
  const cycle = key > 1 ? 2 * (key - 1) : 1;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const p = (i + offset) % cycle;
    rows.push(p < key ? p : cycle - p);
  }
  return rows;
}

module('Rail Fence Cipher Encode', 'Writes the text in a zig-zag over N rails and reads it off row by row.', [A.number('Key (rails)', 2, 2), A.number('Offset', 0, 0)],
  (t, key, offset) => {
    const rows = railPattern(t.length, key, offset);
    let out = '';
    for (let r = 0; r < key; r++) for (let i = 0; i < t.length; i++) if (rows[i] === r) out += t[i];
    return out;
  }, { text: true });
