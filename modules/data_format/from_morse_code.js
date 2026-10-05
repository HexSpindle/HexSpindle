import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';
import { MORSE } from './to_morse_code.js';

const REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

module('From Morse Code', 'Translates Morse Code into text.', [A.select('Format options', ['-/.', '_/.']), A.select('Letter delimiter', DELIMS), A.select('Word delimiter', [...DELIMS, 'Forward slash'], 'Forward slash')],
  (t, fmt, ld, wd) => {
    const dash = fmt === '-/.' ? '-' : '_';
    t = t.split(dash).join('-');
    const words = t.split(delim(wd));
    return words.map(w => w.split(delim(ld)).filter(l => l.trim()).map(l => REV[l] || '?').join('')).join(' ');
  }, { text: true });
