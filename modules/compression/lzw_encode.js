import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('LZW Encode', 'Lempel-Ziv-Welch compression (the algorithm behind GIF/old Unix compress), output as a list of numeric codes.',
  [A.number('Initial dictionary size', 256, 2, 65536), A.number('Max code width (bits, 0 = unbounded)', 12, 0, 24),
   A.select('Output', ['Decimal codes', 'Packed bytes (MSB-first, fixed width)'])],
  (data, initSize, maxbits, outfmt) => {
    const dic = new Map();
    for (let i = 0; i < initSize; i++) dic.set(String.fromCharCode(i), i);
    let nxt = initSize;
    let w = '';
    const codes = [];
    const limit = maxbits ? (1 << maxbits) : null;
    for (let k = 0; k < data.length; k++) {
      const c = String.fromCharCode(data[k]);
      const wc = w + c;
      if (dic.has(wc)) {
        w = wc;
      } else {
        codes.push(dic.get(w));
        if (limit === null || nxt < limit) { dic.set(wc, nxt); nxt++; }
        w = c;
      }
    }
    if (w !== '') codes.push(dic.get(w));

    if (outfmt === 'Decimal codes') return codes.join(' ');
    const width = maxbits ? Math.max(maxbits, (nxt - 1).toString(2).length) : Math.max(9, (nxt - 1).toString(2).length);
    let bits = codes.map(c => c.toString(2).padStart(width, '0')).join('');
    bits += '0'.repeat((8 - (bits.length % 8)) % 8);
    const out = new Uint8Array(bits.length / 8);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.substr(i * 8, 8), 2);
    return out;
  });
