import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Encode NetBIOS Name', 'NetBIOS first-level encodes a name: each nibble of each byte becomes a letter A-P.',
  [A.number('Pad to length', 16, 1, 255), A.number('Offset', 65)],
  (data, pad, offset = 65) => {
    pad = Math.trunc(pad);
    if (data.length > pad) return new Uint8Array(0);
    const s = new Uint8Array(pad).fill(32);
    s.set(data);
    const out = new Uint8Array(pad * 2);
    for (let i = 0; i < pad; i++) {
      out[2 * i] = (s[i] >> 4) + offset;
      out[2 * i + 1] = (s[i] & 0xf) + offset;
    }
    return out;
  });
