import { module } from './_cat.js';
import { bytesToHex, decodeUtf8 } from '../../core/util.js';
import { Flt, stringifyTyped } from './_json.js';

function halfToDouble(bits) {
  const sign = (bits >> 15) & 1;
  const exp = (bits >> 10) & 0x1f;
  const frac = bits & 0x3ff;
  let val;
  if (exp === 0) val = frac * Math.pow(2, -24);
  else if (exp === 31) val = frac ? NaN : Infinity;
  else val = (frac + 1024) * Math.pow(2, exp - 25);
  return sign ? -val : val;
}

function dec(b, i = 0) {
  const ib = b[i];
  const major = ib >> 5, ai = ib & 31;
  i++;
  function arg() {
    if (ai < 24) return BigInt(ai);
    const n = { 24: 1, 25: 2, 26: 4, 27: 8 }[ai];
    let v = 0n;
    for (let j = 0; j < n; j++) v = (v << 8n) | BigInt(b[i + j]);
    i += n;
    return v;
  }
  if (major === 7) {
    if (ai === 20) return [false, i];
    if (ai === 21) return [true, i];
    if (ai === 22 || ai === 23) return [null, i];
    if (ai === 25) { const bits = (b[i] << 8) | b[i + 1]; return [new Flt(halfToDouble(bits)), i + 2]; }
    if (ai === 26) { const dv = new DataView(b.buffer, b.byteOffset + i, 4); return [new Flt(dv.getFloat32(0, false)), i + 4]; }
    if (ai === 27) { const dv = new DataView(b.buffer, b.byteOffset + i, 8); return [new Flt(dv.getFloat64(0, false)), i + 8]; }
    return [ai, i];
  }
  const n = arg();
  const len = Number(n);
  if (major === 0) return [n, i];
  if (major === 1) return [-1n - n, i];
  if (major === 2) return [bytesToHex(b.subarray(i, i + len)), i + len];
  if (major === 3) return [decodeUtf8(b.subarray(i, i + len)), i + len];
  if (major === 4) {
    const out = [];
    let ii = i;
    for (let k = 0; k < len; k++) { const [v, ni] = dec(b, ii); out.push(v); ii = ni; }
    return [out, ii];
  }
  if (major === 5) {
    const out = {};
    let ii = i;
    for (let k = 0; k < len; k++) {
      const [k1, ni1] = dec(b, ii);
      const [v1, ni2] = dec(b, ni1);
      out[k1 instanceof Flt ? String(k1.v) : String(k1)] = v1;
      ii = ni2;
    }
    return [out, ii];
  }
  const [v, ni] = dec(b, i);
  return [v, ni];
}

module('CBOR Decode', 'Decodes CBOR data to JSON (byte strings shown as hex).', [],
  (data) => stringifyTyped(dec(data)[0], 4));
