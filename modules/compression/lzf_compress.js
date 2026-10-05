import { module } from './_cat.js';

const MAX_LIT = 32;
const MAX_OFF = 1 << 13; // 8192
const MAX_REF = 264; // 9 + 255

module('LZF Compress', 'Compresses with LZF (liblzf), a very fast low-ratio compressor.', [], (data) => {
  const n = data.length;
  const out = [];
  const hash = new Map(); // 3-byte prefix -> last position
  let i = 0, litStart = 0;

  const flushLit = (end) => {
    let p = litStart;
    while (p < end) {
      const n2 = Math.min(end - p, MAX_LIT);
      out.push(n2 - 1);
      for (let k = 0; k < n2; k++) out.push(data[p + k]);
      p += n2;
    }
  };

  while (i < n) {
    if (i + 2 < n) {
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      const cand = hash.get(key);
      hash.set(key, i);
      if (cand !== undefined && i - cand <= MAX_OFF && i - cand >= 1) {
        let len = 0;
        const maxLen = Math.min(MAX_REF, n - i);
        while (len < maxLen && data[cand + len] === data[i + len]) len++;
        if (len >= 3) {
          flushLit(i);
          const off = i - cand - 1;
          let l = len - 2;
          if (l < 7) {
            out.push((l << 5) | (off >> 8));
          } else {
            out.push((7 << 5) | (off >> 8));
            out.push(l - 7);
          }
          out.push(off & 0xFF);
          for (let k = 1; k < len; k++) {
            if (i + k + 2 < n) {
              const key2 = (data[i + k] << 16) | (data[i + k + 1] << 8) | data[i + k + 2];
              hash.set(key2, i + k);
            }
          }
          i += len;
          litStart = i;
          continue;
        }
      }
    }
    i++;
  }
  flushLit(n);
  if (out.length >= n) throw new Error('Data is incompressible with LZF (output would not be smaller)');
  return Uint8Array.from(out);
});
