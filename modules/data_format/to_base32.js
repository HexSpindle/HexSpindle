import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { resolveAlphabet } from '../../core/codec.js';

export const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=';
export const HEX = '0123456789ABCDEFGHIJKLMNOPQRSTUV=';

export function base32Encode(u8, alphabet) {
  let bits = '';
  for (const b of u8) bits += b.toString(2).padStart(8, '0');
  while (bits.length % 5) bits += '0';
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  while (out.length % 8) out += alphabet[32];
  return out;
}

module('To Base32', 'Base32 encodes the input.', [A.combo('Alphabet', [['Standard (RFC 4648): A-Z2-7=', STD], ['Hex Extended (RFC 4648): 0-9A-V=', HEX]])],
  (data, alphabet) => base32Encode(data, resolveAlphabet(alphabet, 32)));
