import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('To Hex Content', 'Converts special characters to Snort/Suricata-style |hex| content.',
  [A.select('Convert', ['Only special chars', 'Only special chars including spaces', 'All chars']), A.boolean('Print spaces between bytes', false)],
  (data, mode, spaces) => {
    const hx = b => b.toString(16).padStart(2, '0');
    if (mode === 'All chars') return '|' + [...data].map(hx).join(spaces ? ' ' : '') + '|';
    const convSpaces = mode === 'Only special chars including spaces';
    let out = '', inHex = false;
    for (const b of data) {
      if ((b === 32 && convSpaces) || (b < 48 && b !== 32) || (b > 57 && b < 65) || (b > 90 && b < 97) || b > 122) {
        if (!inHex) { out += '|'; inHex = true; } else if (spaces) out += ' ';
        out += hx(b);
      } else {
        if (inHex) { out += '|'; inHex = false; }
        out += String.fromCharCode(b);
      }
    }
    if (inHex) out += '|';
    return out;
  });
