import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function randChoice(alphabet) {
  const idx = crypto.getRandomValues(new Uint32Array(1))[0] % alphabet.length;
  return alphabet[idx];
}

module('Generate Password', 'Generates one or more cryptographically random passwords via crypto.getRandomValues(). The input is ignored.',
  [A.number('Length', 20, 1), A.number('Count', 1, 1), A.boolean('Uppercase (A-Z)', true), A.boolean('Lowercase (a-z)', true), A.boolean('Digits (0-9)', true), A.boolean('Symbols (!@#...)', true)],
  (t, length, count, up, lo, dig, sym) => {
    let alphabet = '';
    if (up) alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lo) alphabet += 'abcdefghijklmnopqrstuvwxyz';
    if (dig) alphabet += '0123456789';
    if (sym) alphabet += '!@#$%^&*()-_=+[]{}';
    if (!alphabet) throw new Error('Select at least one character set');
    return Array.from({ length: count }, () => Array.from({ length }, () => randChoice(alphabet)).join('')).join('\n');
  }, { text: true, nondeterministic: true });
