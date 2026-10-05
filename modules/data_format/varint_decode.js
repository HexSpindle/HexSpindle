import { module } from './_cat.js';

module('VarInt Decode', 'Decodes a stream of protobuf-style base-128 varints back to integers, one per line.', [],
  (data) => {
    const out = [];
    let n = 0n, shift = 0n;
    for (const b of data) {
      n |= BigInt(b & 0x7f) << shift;
      if (!(b & 0x80)) { out.push(n.toString()); n = 0n; shift = 0n; }
      else shift += 7n;
    }
    return out.join('\n');
  });
