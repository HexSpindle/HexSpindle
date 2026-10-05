import { module } from './_cat.js';

function lrot(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }

function sha0(u8) {
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  const msgLen = u8.length;
  const padded = new Uint8Array((msgLen + 9 + 63) & ~63);
  padded.set(u8);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Number((bitLen >> 32n) & 0xffffffffn));
  dv.setUint32(padded.length - 4, Number(bitLen & 0xffffffffn));

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const w = new Array(80);
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(chunk + j * 4);
    for (let t = 16; t < 80; t++) w[t] = (w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]) >>> 0; // no left-rotate: the SHA-0 bug
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      let f, k;
      if (t < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (t < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      const temp = (lrot(a, 5) + f + e + k + w[t]) >>> 0;
      e = d; d = c; c = lrot(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const outDv = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((v, i) => outDv.setUint32(i * 4, v));
  return out;
}

module('SHA0', 'The original 1993 SHA (FIPS 180) before the single-bit rotation fix that produced SHA-1. Broken/obsolete - included for historical analysis only.', [],
  (data) => [...sha0(data)].map(b => b.toString(16).padStart(2, '0')).join(''));
export { sha0 };
