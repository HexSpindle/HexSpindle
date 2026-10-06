import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// UTF-8 when the bytes are valid UTF-8, otherwise one character per byte.
function bytesToStr(u8) {
  if (!u8.length) return '';
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch { /* not UTF-8 */ }
  let s = '';
  for (let i = 0; i < u8.length; i += 20000) s += String.fromCharCode(...u8.subarray(i, i + 20000));
  return s;
}
// One byte per character when every character fits in a byte, otherwise UTF-8.
function strToBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return new TextEncoder().encode(s);
    out[i] = c;
  }
  return out;
}

module('Text Encoding Brute Force',
  'Enumerates all supported text encodings for the input, allowing you to quickly spot the correct one. ' +
  'Encode shows the input encoded in each code page; Decode shows the input decoded from each code page. ' +
  'The output is a JSON object keyed by code page.',
  [A.select('Mode', ['Encode', 'Decode'])],
  async (data, mode) => {
    const { cptable, CHR_ENC_CODE_PAGES } = await import('../other/_codepage.mjs');
    const input = bytesToStr(data);
    const output = {};
    for (const [charset, cp] of Object.entries(CHR_ENC_CODE_PAGES)) {
      try {
        output[charset] = mode === 'Decode'
          ? cptable.utils.decode(cp, input)
          : bytesToStr(new Uint8Array(cptable.utils.encode(cp, input)));
      } catch {
        output[charset] = 'Could not decode.';
      }
    }
    return strToBytes(JSON.stringify(output, null, 4));
  });
