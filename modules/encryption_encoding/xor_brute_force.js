import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { xorBytes } from './xor.js';
import { bytesToHex, decodeUtf8OrChars, escapeWhitespace } from '../../core/util.js';

module('XOR Brute Force', 'Tries every 1 or 2 byte XOR key on a sample of the input.',
  [A.number('Key length', 1, 1, 2), A.number('Sample length', 100, 1), A.number('Sample offset', 0, 0),
   A.select('Scheme', ['Standard', 'Input differential', 'Output differential', 'Cascade']),
   A.boolean('Null preserving', false), A.boolean('Print key', true), A.select('Output as', ['Standard', 'Hex']),
   A.string('Crib (known plaintext string)', '')],
  (data, klen, slen, off, scheme, nullp, show, fmt, crib) => {
    const sample = data.slice(off, off + slen);
    const kl = parseInt(klen, 10);
    const total = Math.pow(256, kl);
    const cribLower = crib.toLowerCase();
    const out = [];
    for (let k = 1; k < total; k++) {
      const key = new Uint8Array(kl);
      let v = k;
      for (let i = kl - 1; i >= 0; i--) { key[i] = v & 255; v = Math.floor(v / 256); }
      const res = xorBytes(sample, key, scheme, nullp);
      const txt = decodeUtf8OrChars(res);
      if (cribLower && txt.toLowerCase().indexOf(cribLower) < 0) continue;
      out.push((show ? `Key = ${bytesToHex(key)}: ` : '') + (fmt === 'Hex' ? bytesToHex(res, ' ') : escapeWhitespace(txt)));
    }
    return out.join('\n');
  });
