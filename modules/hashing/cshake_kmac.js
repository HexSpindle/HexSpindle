import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, concatBytes, encodeUtf8 } from '../../core/util.js';
import { keccakSponge } from './keccak.js';

function minimalBytes(x) {
  if (x === 0) return new Uint8Array([0]);
  const out = [];
  while (x > 0) { out.unshift(x & 0xff); x = Math.floor(x / 256); }
  return new Uint8Array(out);
}
function leftEncode(x) {
  const b = x === 0 ? new Uint8Array([0]) : minimalBytes(x);
  return concatBytes([new Uint8Array([b.length]), b]);
}
function rightEncode(x) {
  const b = x === 0 ? new Uint8Array([0]) : minimalBytes(x);
  return concatBytes([b, new Uint8Array([b.length])]);
}
function encodeString(s) { return concatBytes([leftEncode(s.length * 8), s]); }
function bytepad(x, w) {
  const z = concatBytes([leftEncode(w), x]);
  const pad = (w - (z.length % w)) % w;
  return pad ? concatBytes([z, new Uint8Array(pad)]) : z;
}

function cshake(data, outBytes, nStr, sStr, capBits, rounds = 24) {
  const rate = 200 - capBits / 8;
  if (nStr.length === 0 && sStr.length === 0) return keccakSponge(data, rate, 0x1f, outBytes, rounds);
  const prefix = bytepad(concatBytes([encodeString(nStr), encodeString(sStr)]), rate);
  return keccakSponge(concatBytes([prefix, data]), rate, 0x04, outBytes, rounds);
}

function kmac(key, data, outBytes, sStr, capBits) {
  const rate = 200 - capBits / 8;
  const newX = concatBytes([bytepad(encodeString(key), rate), data, rightEncode(outBytes * 8)]);
  return cshake(newX, outBytes, encodeUtf8('KMAC'), sStr, capBits);
}

function tupleHashSingle(data, outBytes, sStr, capBits) {
  const z = concatBytes([encodeString(data), rightEncode(outBytes * 8)]);
  return cshake(z, outBytes, encodeUtf8('TupleHash'), sStr, capBits);
}

function turboShake(data, domain, outBytes, capBits) {
  return keccakSponge(data, 200 - capBits / 8, domain, outBytes, 12);
}

function k12LengthEncode(x) {
  if (x === 0) return new Uint8Array([0]);
  const b = minimalBytes(x);
  return concatBytes([b, new Uint8Array([b.length])]);
}

function kangarooTwelve(data, custom, outBytes) {
  const full = concatBytes([data, custom, k12LengthEncode(custom.length)]);
  if (full.length <= 8192) return turboShake(full, 0x07, outBytes, 256);
  const s0 = full.subarray(0, 8192);
  const rest = full.subarray(8192);
  const divider = new Uint8Array([0x03, 0, 0, 0, 0, 0, 0, 0]);
  const cvs = [];
  for (let off = 0; off < rest.length; off += 8192) {
    const chunk = rest.subarray(off, Math.min(off + 8192, rest.length));
    cvs.push(turboShake(chunk, 0x0b, 32, 256));
  }
  const trailer = concatBytes([k12LengthEncode(cvs.length), new Uint8Array([0xff, 0xff])]);
  const hash1Input = concatBytes([s0, divider, ...cvs, trailer]);
  return turboShake(hash1Input, 0x06, outBytes, 256);
}

export { cshake, kmac, tupleHashSingle, turboShake, kangarooTwelve };

const VARIANTS = ['cSHAKE128', 'cSHAKE256', 'KMAC128', 'KMAC256', 'TupleHash128', 'TupleHash256', 'KangarooTwelve', 'TurboSHAKE128', 'TurboSHAKE256'];

module('cSHAKE / KMAC / TupleHash / K12', 'NIST SP 800-185 extendable-output and keyed hash functions, plus the fast KangarooTwelve XOF.',
  [A.select('Function', VARIANTS), A.number('Output length (bytes)', 32, 1, 1024), A.toggle('Key (KMAC only)', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'),
   A.string('Customization string', '')],
  (data, fn, outlen, key, custom) => {
    const cust = encodeUtf8(custom);
    if (fn === 'cSHAKE128' || fn === 'cSHAKE256') return bytesToHex(cshake(data, outlen, new Uint8Array(0), cust, fn === 'cSHAKE128' ? 256 : 512));
    if (fn === 'KMAC128' || fn === 'KMAC256') {
      if (!key.length) throw new Error('KMAC requires a key');
      return bytesToHex(kmac(key, data, outlen, cust, fn === 'KMAC128' ? 256 : 512));
    }
    if (fn === 'TupleHash128' || fn === 'TupleHash256') return bytesToHex(tupleHashSingle(data, outlen, cust, fn === 'TupleHash128' ? 256 : 512));
    if (fn === 'KangarooTwelve') return bytesToHex(kangarooTwelve(data, cust, outlen));
    if (fn === 'TurboSHAKE128' || fn === 'TurboSHAKE256') return bytesToHex(turboShake(data, 0x1f, outlen, fn === 'TurboSHAKE128' ? 256 : 512));
    throw new Error(fn);
  });
