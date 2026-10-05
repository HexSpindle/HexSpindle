import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { xorBytes } from './xor.js';
import { bytesToHex, encodeUtf8, decodeLatin1 } from '../../core/util.js';

function includesBytes(hay, needle) {
  if (!needle.length) return true;
  outer:
  for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function utf8OrLatin1(b) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch { return decodeLatin1(b); }
}

module('XOR Brute Force', 'Tries every 1 or 2 byte XOR key on a sample of the input.',
  [A.select('Key length', ['1', '2']), A.number('Sample length', 100, 1), A.number('Sample offset', 0, 0),
   A.select('Scheme', ['Standard', 'Input differential', 'Output differential', 'Cascade']),
   A.boolean('Null preserving', false), A.boolean('Print key', true), A.select('Output as', ['Standard', 'Hex']),
   A.string('Crib (known plaintext string)', '')],
  (data, klen, slen, off, scheme, nullp, show, fmt, crib) => {
    const sample = data.slice(off, off + slen);
    const kl = parseInt(klen, 10);
    const total = Math.pow(256, kl);
    const cribBytes = crib ? encodeUtf8(crib) : null;
    const out = [];
    for (let k = 1; k < total; k++) {
      const key = new Uint8Array(kl);
      let v = k;
      for (let i = kl - 1; i >= 0; i--) { key[i] = v & 255; v = Math.floor(v / 256); }
      const res = xorBytes(sample, key, scheme, nullp);
      if (cribBytes && !includesBytes(res, cribBytes)) continue;
      const txt = fmt === 'Hex' ? bytesToHex(res) : utf8OrLatin1(res);
      out.push((show ? `Key = ${bytesToHex(key)}: ` : '') + txt);
    }
    return out.join('\n');
  });
