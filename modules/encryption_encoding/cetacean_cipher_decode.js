import { module } from './_cat.js';

const SPACE_BITS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];

export function cetaceanDecode(input) {
  const bits = [];
  for (const ch of input) {
    if (ch === ' ') bits.push(...SPACE_BITS);
    else bits.push(ch === 'e' ? 1 : 0);
  }
  let out = '';
  for (let i = 0; i < bits.length; i += 16) {
    let code = 0;
    for (let j = i; j < Math.min(i + 16, bits.length); j++) code = (code << 1) | bits[j];
    out += String.fromCharCode(code);
  }
  return out;
}

module('Cetacean Cipher Decode', "Decodes Cetacean Cipher input, e.g. 'EEEEEEEEEeeEeEEEEEEEEEEEEeeEeEEe' becomes 'hi'.",
  [], (input) => cetaceanDecode(input), { text: true });
