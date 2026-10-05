import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { unescapeLatin1, findSub } from './_bytes.js';

const CHUNK = 16;

module('Binary Diff', 'Produces a compact copy/insert patch turning the OLD input into NEW (block-matching diff, not a specific standard format - pairs with Binary Patch).',
  [A.string('New data separator', '\\0NEWDATA\\0')],
  (data, sepS) => {
    const sep = unescapeLatin1(sepS);
    const splitAt = findSub(data, sep);
    if (splitAt < 0) throw new Error('Separator not found: provide OLD data, the separator, then NEW data');
    const old = data.subarray(0, splitAt);
    const neu = data.subarray(splitAt + sep.length);

    const index = new Map();
    for (let i = 0; i + CHUNK <= old.length; i += CHUNK) {
      let key = '';
      for (let j = 0; j < CHUNK; j++) key += String.fromCharCode(old[i + j]);
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(i);
    }

    const out = [];
    let lit = [];
    const flushLit = () => {
      while (lit.length) {
        const n = Math.min(lit.length, 0xFFFF);
        out.push(0x4C, (n >>> 8) & 255, n & 255, ...lit.slice(0, n));
        lit = lit.slice(n);
      }
    };

    let i = 0;
    while (i < neu.length) {
      let key = '';
      for (let j = 0; j < CHUNK && i + j < neu.length; j++) key += String.fromCharCode(neu[i + j]);
      const cand = key.length === CHUNK ? index.get(key) : undefined;
      let bestLen = 0, bestOff = 0;
      if (cand) {
        for (const off of cand.slice(-4)) {
          let l = 0;
          while (i + l < neu.length && off + l < old.length && neu[i + l] === old[off + l]) l++;
          if (l > bestLen) { bestLen = l; bestOff = off; }
        }
      }
      if (bestLen >= CHUNK) {
        flushLit();
        out.push(0x43, (bestOff >>> 24) & 255, (bestOff >>> 16) & 255, (bestOff >>> 8) & 255, bestOff & 255,
          (bestLen >>> 24) & 255, (bestLen >>> 16) & 255, (bestLen >>> 8) & 255, bestLen & 255);
        i += bestLen;
      } else {
        lit.push(neu[i]);
        i++;
      }
    }
    flushLit();
    return Uint8Array.from(out);
  });
