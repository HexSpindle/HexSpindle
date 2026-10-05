import { module } from './_cat.js';
import { A } from '../../core/registry.js';

export function rot(t, amount, lower = true, upper = true, nums = false) {
  let out = '';
  for (const c of t) {
    if (lower && c >= 'a' && c <= 'z') out += String.fromCharCode((c.charCodeAt(0) - 97 + amount) % 26 + 97);
    else if (upper && c >= 'A' && c <= 'Z') out += String.fromCharCode((c.charCodeAt(0) - 65 + amount) % 26 + 65);
    else if (nums && c >= '0' && c <= '9') out += String.fromCharCode(((c.charCodeAt(0) - 48 + amount) % 10 + 10) % 10 + 48);
    else out += c;
  }
  return out;
}

module('ROT13', 'Rotates letters (and optionally digits) by an amount; 13 by default. Encrypt = decrypt for 13.',
  [A.boolean('Rotate lower case chars', true), A.boolean('Rotate upper case chars', true), A.boolean('Rotate numbers', false), A.number('Amount', 13)],
  (t, lo, up, nums, amount) => rot(t, ((amount % 26) + 26) % 26, lo, up, nums), { text: true });
