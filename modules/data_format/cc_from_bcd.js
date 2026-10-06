import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ENCODING_SCHEME, ENCODING_LOOKUP, FORMAT } from './_bcd.js';

function bin4(n) { return n.toString(2).padStart(4, '0'); }

module('From BCD', 'Binary-Coded Decimal (BCD) is a class of binary encodings of decimal numbers where each decimal digit is represented by a fixed number of bits, usually four or eight. Special bit patterns are sometimes used for a sign.',
  [A.select('Scheme', ENCODING_SCHEME), A.boolean('Packed', true), A.boolean('Signed', false), A.select('Input format', FORMAT)],
  (t, scheme, packed, signed, inputFormat) => {
    const encoding = ENCODING_LOOKUP[scheme];
    let nibbles = [];

    if (inputFormat === 'Nibbles' || inputFormat === 'Bytes') {
      const clean = t.replace(/\s/g, '');
      for (let i = 0; i < clean.length; i += 4) nibbles.push(parseInt(clean.substr(i, 4), 2));
    } else {
      const bytes = [...t].map(c => c.charCodeAt(0) & 0xff);
      for (const b of bytes) { nibbles.push(b >>> 4); nibbles.push(b & 15); }
    }

    if (!packed) nibbles = nibbles.filter((_, idx) => idx % 2 === 1);

    let output = '';
    if (signed) {
      const sign = nibbles.pop();
      if (sign === 13 || sign === 11) output += '-';
    }

    for (const n of nibbles) {
      if (Number.isNaN(n)) throw new Error('Invalid input');
      const val = encoding.indexOf(n);
      if (val < 0) throw new Error(`Value ${bin4(n)} is not in the encoding scheme`);
      output += val.toString();
    }

    const neg = output.startsWith('-');
    const digits = neg ? output.slice(1) : output;
    if (digits === '') throw new Error(`Not a number: ${output}`);
    const canonical = BigInt(digits).toString();
    return (neg && canonical !== '0' ? '-' : '') + canonical;
  }, { text: true });
