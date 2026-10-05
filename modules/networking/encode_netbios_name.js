import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Encode NetBIOS Name', 'NetBIOS first-level encodes a name: each nibble of each byte becomes a letter A-P.',
  [A.number('Pad to length', 16, 1, 255)],
  (t, pad) => {
    pad = Math.trunc(pad);
    let s = t.toUpperCase().slice(0, pad);
    s = s.padEnd(pad, ' ');
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i) & 0xff;
      out += String.fromCharCode((c >> 4) + 65) + String.fromCharCode((c & 0xf) + 65);
    }
    return out;
  }, { text: true });
