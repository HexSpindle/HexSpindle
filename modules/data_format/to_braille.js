import { module } from './_cat.js';
import { A } from '../../core/registry.js';

export const BRAILLE_ASCII = ' A1B\'K2L@CIF/MSP"E3H9O6R^DJG>NTQ,*5<-U8V.%[$+X!&;:4\\0Z7(_?W]#Y)=';
export const BRAILLE_DOT6 = '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿';

const L = 'abcdefghijklmnopqrstuvwxyz';
const P = '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵';
export const TABLE = new Map([...L].map((c, i) => [c, P[i]]));
for (const [k, v] of [[' ', '⠀'], [',', '⠂'], [';', '⠆'], [':', '⠒'], ['.', '⠲'], ['!', '⠖'], ['?', '⠦'], ['-', '⠤'], ["'", '⠄'], ['\n', '\n']]) TABLE.set(k, v);
export const DIGITS = new Map([...'1234567890'].map((c, i) => [c, P[i]]));

export const MODES = ['Braille ASCII', 'Grade 1'];

module('To Braille', 'Converts text to six-dot braille symbols.', [A.select('Mode', MODES)],
  (t, mode) => {
    if (mode !== 'Grade 1') {
      return [...t].map(c => {
        const idx = BRAILLE_ASCII.indexOf(c.toUpperCase());
        return idx < 0 ? c : BRAILLE_DOT6[idx];
      }).join('');
    }
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
