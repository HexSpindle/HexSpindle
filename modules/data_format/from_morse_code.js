import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';
import { MORSE } from './to_morse_code.js';

const REV = Object.fromEntries(Object.entries({ ...MORSE, ' ': '.......' }).map(([k, v]) => [v, k]));

module('From Morse Code', 'Translates Morse Code into text.', [A.select('Format options', ['-/.', '_/.']), A.select('Letter delimiter', DELIMS), A.select('Word delimiter', [...DELIMS, 'Forward slash'], 'Line feed')],
  (t, fmt, ld, wd) => {
    t = t.replace(/-|‐|−|_|–|—|dash/ig, '-').replace(/\.|·|dot/ig, '.');
    return t.split(delim(wd)).map(w => w.split(delim(ld)).map(l => Object.hasOwn(REV, l) ? REV[l] : '').join('')).join(' ');
  }, { text: true });
