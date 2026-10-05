import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ENCODING_SCHEME, ENCODING_LOOKUP, FORMAT } from './_bcd.js';

function byteArrayToChars(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b & 0xff);
  return s;
}

module('To BCD', 'Binary-Coded Decimal (BCD) is a class of binary encodings of decimal numbers where each decimal digit is represented by a fixed number of bits, usually four or eight. Special bit patterns are sometimes used for a sign.',
  [A.select('Scheme', ENCODING_SCHEME), A.boolean('Packed', true), A.boolean('Signed', false), A.select('Output format', FORMAT)],
  (t, scheme, packed, signed, outputFormat) => {
    const trimmed = t.trim();
    const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(trimmed === '' ? '0' : trimmed);
    if (!m) throw new Error('Invalid input');
    if (m[3] && /[^0]/.test(m[3])) throw new Error('Fractional values are not supported by BCD');
    const input = BigInt((m[1] === '+' ? '' : m[1]) + m[2]);

    const encoding = ENCODING_LOOKUP[scheme];
    const neg = input < 0n;
    const digits = (neg ? -input : input).toString().split('');

    let nibbles = digits.map(d => encoding[parseInt(d, 10)]);

    if (signed) {
      if (packed && digits.length % 2 === 0) nibbles.unshift(encoding[0]);
      nibbles.push(input > 0n ? 12 : 13);
    }

    let bytes = [];
    if (packed) {
      let encoded = 0, little = false;
      for (const n of nibbles) {
        encoded ^= little ? n : (n << 4);
        if (little) { bytes.push(encoded); encoded = 0; }
        little = !little;
      }
      if (little) bytes.push(encoded);
    } else {
      bytes = nibbles;
      nibbles = nibbles.flatMap(n => [0, n]);
    }

    switch (outputFormat) {
      case 'Nibbles': return nibbles.map(n => n.toString(2).padStart(4, '0')).join(' ');
      case 'Bytes': return bytes.map(b => b.toString(2).padStart(8, '0')).join(' ');
      case 'Raw':
      default: return byteArrayToChars(bytes);
    }
  }, { text: true });
