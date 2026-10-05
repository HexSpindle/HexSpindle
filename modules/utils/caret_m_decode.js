import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';

module('Caret/M-decode', 'Decodes caret notation (^M = CR, ^J = LF, ^? = DEL, M-x = byte with high bit set) as used by `cat -v` and some terminal tools.',
  [A.select('Direction', ['Decode (^M -> bytes)', 'Encode (bytes -> ^M)'])],
  (data, direction) => {
    if (direction.startsWith('Decode')) {
      const t = decodeLatin1(data);
      const low = c => c === '?' ? 0x7F : c.toUpperCase().charCodeAt(0) - 64;
      const rep = (s) => {
        if (s.startsWith('M-^')) return String.fromCharCode(low(s[3]) | 0x80);
        if (s.startsWith('M-')) return String.fromCharCode(s.charCodeAt(2) | 0x80);
        return String.fromCharCode(low(s[1]));
      };
      const out = t.replace(/M-\^.|M-.|\^./g, rep);
      return new Uint8Array([...out].map(c => c.charCodeAt(0) & 0xff));
    }
    let out = '';
    for (const b of data) {
      if (b === 0x7F) out += '^?';
      else if (b < 0x20) out += '^' + String.fromCharCode(b + 64);
      else if (b >= 0x80) {
        const lo = b & 0x7F;
        if (lo === 0x7F) out += 'M-^?';
        else if (lo < 0x20) out += 'M-^' + String.fromCharCode(lo + 64);
        else out += 'M-' + String.fromCharCode(lo);
      } else out += String.fromCharCode(b);
    }
    return out;
  });
