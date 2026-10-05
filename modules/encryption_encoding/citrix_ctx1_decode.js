import { module } from './_cat.js';

function utf16leDecode(bytes) {
  let s = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
  return s;
}

export function citrixCtx1Decode(data) {
  if (data.length % 4 !== 0) throw new Error('Incorrect hash length');
  const rev = Uint8Array.from(data).reverse();
  const result = new Uint8Array(rev.length / 2);
  let idx = 0;
  for (let i = 0; i < rev.length; i += 2) {
    let temp2 = 0;
    if (i + 2 < rev.length) {
      temp2 = ((rev[i + 2] - 0x41) & 0xf) ^ (((rev[i + 3] - 0x41) << 4) & 0xf0);
    }
    const temp = (((rev[i] - 0x41) & 0xf) ^ (((rev[i + 1] - 0x41) << 4) & 0xf0)) ^ 0xa5 ^ temp2;
    result[idx++] = temp & 0xff;
  }
  result.reverse();
  return utf16leDecode(result);
}

module('Citrix CTX1 Decode', 'Decodes strings in a Citrix CTX1 password format to plaintext.', [], (data) => citrixCtx1Decode(data), { text: false });
