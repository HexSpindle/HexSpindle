import { module } from './_cat.js';
import { md4 } from './md4.js';

export function ntHash(text) {
  const u16 = new Uint8Array(text.length * 2);
  const dv = new DataView(u16.buffer);
  for (let i = 0; i < text.length; i++) dv.setUint16(i * 2, text.charCodeAt(i), true);
  return md4(u16);
}

module('NT Hash', 'Windows NT hash: MD4 of the UTF-16LE password.', [],
  (text) => [...ntHash(text)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(), { text: true });
