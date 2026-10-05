import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

function ieee754Write(buffer, value, offset, isLE, mLen, nBytes) {
  let e, m, c;
  let eLen = (nBytes * 8) - mLen - 1;
  const eMax = (1 << eLen) - 1;
  const eBias = eMax >> 1;
  const rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  let i = isLE ? 0 : (nBytes - 1);
  const d = isLE ? 1 : -1;
  const s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;
  value = Math.abs(value);
  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) { e--; c *= 2; }
    if (e + eBias >= 1) value += rt / c;
    else value += rt * Math.pow(2, 1 - eBias);
    if (value * c >= 2) { e++; c /= 2; }
    if (e + eBias >= eMax) { m = 0; e = eMax; }
    else if (e + eBias >= 1) { m = ((value * c) - 1) * Math.pow(2, mLen); e = e + eBias; }
    else { m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen); e = 0; }
  }
  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}
  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}
  buffer[offset + i - d] |= s * 128;
}

module('From Float', 'Packs floating point numbers (as text) into bytes.',
  [A.select('Endianness', ['Big Endian', 'Little Endian']), A.select('Size', ['Float (4 bytes)', 'Double (8 bytes)']), A.select('Delimiter', DELIMS)],
  (t, end, size, d = 'Space') => {
    if (!t.length) return new Uint8Array();
    const n = size === 'Double (8 bytes)' ? 8 : 4;
    const floats = t.split(delim(d));
    const out = new Uint8Array(floats.length * n);
    floats.forEach((f, i) => ieee754Write(out, parseFloat(f), i * n, end === 'Little Endian', n === 4 ? 23 : 52, n));
    return out;
  }, { text: true });
