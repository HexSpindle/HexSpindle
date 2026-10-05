import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

export const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
  J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...',
  8: '---..', 9: '----.', 0: '-----', '.': '.-.-.-', ',': '--..--', ':': '---...', '?': '..--..',
  "'": '.----.', '-': '-....-', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '"': '.-..-.', '@': '.--.-.',
  '=': '-...-', '!': '-.-.--', '&': '.-...', ';': '-.-.-.', '+': '.-.-.', _: '..--.-', $: '...-..-' };

const LETTER_DELIMS = ['Space', 'Line feed', 'CRLF', 'Forward slash', 'Backslash', 'Comma', 'Semi-colon', 'Colon'];
const WORD_DELIMS = ['Line feed', 'CRLF', 'Forward slash', 'Backslash', 'Comma', 'Semi-colon', 'Colon'];

module('To Morse Code', 'Translates text into International Morse Code.', [A.select('Format options', ['-/.', '_/.', 'Dash/Dot', 'DASH/DOT', 'dash/dot']), A.select('Letter delimiter', LETTER_DELIMS), A.select('Word delimiter', WORD_DELIMS)],
  (t, fmt, ld, wd) => {
    const [dash, dot] = fmt.split('/');
    const enc = c => (MORSE[c.toUpperCase()] ?? '').replace(/[.-]/g, m => (m === '-' ? dash : dot));
    return t.split(/\r?\n/)
      .map(line => line.split(/ +/).map(w => Array.prototype.map.call(w, enc).join(delim(ld))).join(delim(wd)))
      .join('\n');
  }, { text: true });
