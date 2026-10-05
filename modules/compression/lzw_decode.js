import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';

module('LZW Decode', 'Decompresses LZW codes (as produced by To LZW Encode) back to bytes.',
  [A.number('Initial dictionary size', 256, 2, 65536), A.select('Input', ['Decimal codes', 'Packed bytes (MSB-first, fixed width)']),
   A.number('Fixed width (bits, packed input only)', 12, 2, 24)],
  (data, initSize, infmt, width) => {
    let codes;
    if (infmt === 'Decimal codes') {
      codes = (decodeLatin1(data).match(/\d+/g) || []).map(Number);
    } else {
      let bits = '';
      for (const b of data) bits += b.toString(2).padStart(8, '0');
      codes = [];
      for (let i = 0; i + width <= bits.length; i += width) codes.push(parseInt(bits.substr(i, width), 2));
    }
    if (!codes.length) return new Uint8Array(0);
    const dic = new Map();
    for (let i = 0; i < initSize; i++) dic.set(i, String.fromCharCode(i));
    let nxt = initSize;
    let w = dic.get(codes[0]);
    if (w === undefined) throw new Error(`Bad LZW code: ${codes[0]}`);
    let out = w;
    for (let idx = 1; idx < codes.length; idx++) {
      const k = codes[idx];
      let entry;
      if (dic.has(k)) entry = dic.get(k);
      else if (k === nxt) entry = w + w[0];
      else throw new Error(`Bad LZW code: ${k}`);
      out += entry;
      dic.set(nxt, w + entry[0]);
      nxt++;
      w = entry;
    }
    return Uint8Array.from([...out].map(c => c.charCodeAt(0)));
  });
