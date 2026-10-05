import { module } from './_cat.js';
import { A } from '../../core/registry.js';

export function xorBytes(data, key, scheme = 'Standard', nullPreserving = false) {
  if (!key.length) return data;
  key = Uint8Array.from(key);
  const out = Uint8Array.from(data);
  for (let i = 0; i < out.length; i++) {
    const k = key[i % key.length], c = out[i];
    if (nullPreserving && (c === 0 || c === k)) continue;
    const x = c ^ k;
    out[i] = x;
    if (scheme === 'Input differential') key[i % key.length] = c;
    else if (scheme === 'Output differential') key[i % key.length] = x;
    else if (scheme === 'Cascade' && i + 1 < out.length) out[i + 1] ^= x;
  }
  return out;
}

module('XOR', 'XORs the input with a repeating key.', [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64', 'Decimal']), A.select('Scheme', ['Standard', 'Input differential', 'Output differential', 'Cascade']), A.boolean('Null preserving', false)],
  (data, key, scheme, nullp) => xorBytes(data, key, scheme, nullp));
