import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { resolveAlphabet } from '../../core/codec.js';

export const Z85 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';
export const STD = Array.from({ length: 85 }, (_, i) => String.fromCharCode(33 + i)).join('');
export const PRESETS = [
  ['Standard', STD], ['Z85', Z85],
  ['IPv6', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~'],
];

export function genericEncode(data, alphabet) {
  const pad = (4 - (data.length % 4)) % 4;
  const padded = new Uint8Array(data.length + pad);
  padded.set(data);
  const out = [];
  for (let i = 0; i < padded.length; i += 4) {
    let n = ((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]) >>> 0;
    const s = [];
    for (let k = 0; k < 5; k++) { s.push(alphabet[n % 85]); n = Math.floor(n / 85); }
    out.push(s.reverse().join(''));
  }
  const r = out.join('');
  return pad ? r.slice(0, r.length - pad) : r;
}

export function a85Encode(data) {
  const pad = (4 - (data.length % 4)) % 4;
  const padded = new Uint8Array(data.length + pad);
  padded.set(data);
  const groups = padded.length / 4;
  let out = '';
  for (let g = 0; g < groups; g++) {
    const i = g * 4;
    const isFinal = pad && g === groups - 1;
    const n = ((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]) >>> 0;
    if (!isFinal && n === 0) { out += 'z'; continue; }
    const digits = [];
    let v = n;
    for (let k = 0; k < 5; k++) { digits.push(v % 85); v = Math.floor(v / 85); }
    digits.reverse();
    const chars = digits.map(d => STD[d]).join('');
    out += isFinal ? chars.slice(0, 5 - pad) : chars;
  }
  return out;
}

module('To Base85', 'Encodes data as Base85 / Ascii85 (standard, Z85 or IPv6 alphabet).',
  [A.combo('Alphabet', PRESETS), A.boolean('Include <~ ~> delimiters (standard)', false)],
  (data, alphabet, delims) => {
    alphabet = resolveAlphabet(alphabet, 85);
    if (alphabet === STD) {
      const out = a85Encode(data);
      return delims ? '<~' + out + '~>' : out;
    }
    return genericEncode(data, alphabet);
  });
