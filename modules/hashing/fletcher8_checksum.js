import { module } from './_cat.js';

export function fletcher(data, wbits) {
  const mod = 2 ** wbits - 1;
  const nbytes = Math.max(Math.floor(wbits / 8), 1);
  let s1 = 0, s2 = 0;
  const words = [];
  if (wbits === 4) {
    for (const b of data) words.push(b & 15, b >> 4);
  } else {
    const padLen = (nbytes - (data.length % nbytes)) % nbytes;
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data);
    for (let i = 0; i < padded.length; i += nbytes) {
      let w = 0;
      for (let j = nbytes - 1; j >= 0; j--) w = w * 256 + padded[i + j];
      words.push(w);
    }
  }
  for (const w of words) {
    s1 = (s1 + w) % mod;
    s2 = (s2 + s1) % mod;
  }
  const hexLen = wbits / 4;
  return s2.toString(16).padStart(hexLen, '0') + s1.toString(16).padStart(hexLen, '0');
}

export function fletcher8(data) {
  let a = 0, b = 0;
  for (const x of data) { a = (a + x) % 15; b = (b + a) % 15; }
  return ((b << 4) | a).toString(16).padStart(2, '0');
}

module('Fletcher-8 Checksum', 'Fletcher-8 checksum (bytes summed modulo 15).', [], (data) => fletcher8(data));
