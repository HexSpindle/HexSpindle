import { module } from './_cat.js';

const L = 'abcdefghijklmnopqrstuvwxyz';
const P = '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵';
export const TABLE = new Map([...L].map((c, i) => [c, P[i]]));
for (const [k, v] of [[' ', '⠀'], [',', '⠂'], [';', '⠆'], [':', '⠒'], ['.', '⠲'], ['!', '⠖'], ['?', '⠦'], ['-', '⠤'], ["'", '⠄'], ['\n', '\n']]) TABLE.set(k, v);
export const DIGITS = new Map([...'1234567890'].map((c, i) => [c, P[i]]));

module('To Braille', 'Converts text to Unicode Braille (Grade 1, with capital and number signs).', [],
  (t) => {
    const out = [];
    let num = false;
    for (const c of t) {
      if (/[0-9]/.test(c)) {
        if (!num) { out.push('⠼'); num = true; }
        out.push(DIGITS.get(c));
        continue;
      }
      num = false;
      const lower = c.toLowerCase();
      if (c !== lower && TABLE.has(lower)) out.push('⠠' + TABLE.get(lower));
      else out.push(TABLE.has(c) ? TABLE.get(c) : c);
    }
    return out.join('');
  }, { text: true });
