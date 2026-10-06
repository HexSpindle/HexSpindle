import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('VarInt Decode', 'Decodes a protobuf-style base-128 varint to an integer. Optionally decodes every varint in the input, one per line.',
  [A.boolean('Decode whole stream', false)],
  (data, stream) => {
    const out = [];
    let n = 0n, shift = 0n;
    for (const b of data) {
      n |= BigInt(b & 0x7f) << shift;
      if (!(b & 0x80)) {
        if (!stream) return n.toString();
        out.push(n.toString());
        n = 0n; shift = 0n;
      } else shift += 7n;
    }
    if (!stream) return n.toString();
    return out.join('\n');
  });
