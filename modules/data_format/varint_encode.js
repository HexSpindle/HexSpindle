import { module } from './_cat.js';
import { concatBytes } from '../../core/util.js';

export function encodeVarint(n) {
  n &= (1n << 64n) - 1n;
  const out = [];
  while (true) {
    const b = Number(n & 0x7fn);
    n >>= 7n;
    if (n) out.push(b | 0x80);
    else { out.push(b); return new Uint8Array(out); }
  }
}

module('VarInt Encode', 'Encodes integers as protobuf-style base-128 varints (one per line of input).', [],
  (t) => {
    const toks = t.match(/-?\d+/g) || [];
    return concatBytes(toks.map(tok => encodeVarint(BigInt(tok))));
  }, { text: true });
