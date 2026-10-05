import { module } from './_cat.js';

function toBinary16(code) {
  let s = '';
  for (let i = 15; i >= 0; i--) s += (code >> i) & 1;
  return s;
}

export function cetaceanEncode(input) {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === ' ') { out += ch; continue; }
    const bits = toBinary16(ch.charCodeAt(0));
    for (const b of bits) out += b === '1' ? 'e' : 'E';
  }
  return out;
}

module('Cetacean Cipher Encode', "Converts any input into Cetacean Cipher, e.g. 'hi' becomes 'EEEEEEEEEeeEeEEEEEEEEEEEEeeEeEEe'.",
  [], (input) => cetaceanEncode(input), { text: true });
