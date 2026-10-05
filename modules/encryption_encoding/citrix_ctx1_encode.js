import { module } from './_cat.js';

function utf16leEncode(s) {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = (code >>> 8) & 0xff;
  }
  return out;
}

export function citrixCtx1Encode(input) {
  const utf16pass = utf16leEncode(input);
  const out = new Uint8Array(utf16pass.length * 2);
  let temp = 0;
  for (let i = 0; i < utf16pass.length; i++) {
    temp = utf16pass[i] ^ 0xa5 ^ temp;
    out[i * 2] = ((temp >>> 4) & 0xf) + 0x41;
    out[i * 2 + 1] = (temp & 0xf) + 0x41;
  }
  return out;
}

module('Citrix CTX1 Encode', 'Encodes strings to Citrix CTX1 password format.', [], (input) => citrixCtx1Encode(input), { text: true });
