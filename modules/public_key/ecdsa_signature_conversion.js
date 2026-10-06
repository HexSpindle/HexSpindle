import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseOneDer, derSequence, derInteger, parseSeq } from './_asn1.js';
import { bytesToBigInt } from './_bignum.js';
import { parseHex, bytesToHex, base64Encode, base64Decode, decodeLatin1 } from '../../core/util.js';

export const FORMATS = ['Auto', 'ASN.1 HEX', 'P1363 HEX', 'JSON Web Signature', 'Raw JSON'];
export const OUT_FORMATS = ['ASN.1 HEX', 'P1363 HEX', 'JSON Web Signature', 'Raw JSON'];

export function isHexString(s) { return /^[0-9a-f]{2,}$/i.test(s); }

/** True if `hex` is exactly one DER SEQUENCE of two INTEGERs (an ECDSA ASN.1 signature). */
export function isAsn1Sig(hex) {
  try {
    const bytes = parseHex(hex);
    const node = parseOneDer(bytes);
    if (node.class !== 0 || node.tag !== 16 || !node.constructed || node.end !== bytes.length) return false;
    const children = node.children;
    return children.length === 2 && children.every(c => c.class === 0 && c.tag === 2);
  } catch { return false; }
}

export function base64UrlEncode(bytes) {
  return base64Encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function isBase64UrlString(s) { return /^[A-Za-z0-9_-]+$/.test(s); }

/** jsrsasign's KJUR.crypto.ECDSA.hexRSSigToASN1Sig: builds a DER SEQUENCE{INTEGER r, INTEGER s}
 * from two hex-string big integers (leading zero bytes in the input are irrelevant: each is
 * parsed as a plain unsigned integer, then re-encoded as a minimal DER INTEGER). */
export function hexRSSigToAsn1Hex(rHex, sHex) {
  const r = bytesToBigInt(parseHex(rHex));
  const s = bytesToBigInt(parseHex(sHex));
  return bytesToHex(derSequence([derInteger(r), derInteger(s)]));
}

/** jsrsasign's KJUR.crypto.ECDSA.concatSigToASN1Sig: splits a P1363 r||s hex string exactly in
 * half (no curve size needed - half the hex length is used directly as r, the rest as s). */
export function p1363HexToAsn1Hex(concatHex) {
  if (concatHex.length % 4 !== 0) throw new Error('Invalid P1363 signature length');
  const r = concatHex.slice(0, concatHex.length / 2);
  const s = concatHex.slice(concatHex.length / 2);
  return hexRSSigToAsn1Hex(r, s);
}

/** jsrsasign's KJUR.crypto.ECDSA.parseSigHexInHexRS: the raw hex of each INTEGER's content bytes
 * (including a leading 0x00 sign-pad byte, if DER added one). */
export function asn1HexToRS(derHex) {
  const bytes = parseHex(derHex);
  const [rNode, sNode] = parseSeq(bytes, 0, bytes.length)[0].children;
  if (rNode.class !== 0 || rNode.tag !== 2) throw new Error('1st item not ASN.1 integer');
  if (sNode.class !== 0 || sNode.tag !== 2) throw new Error('2nd item not ASN.1 integer');
  return { r: bytesToHex(rNode.value), s: bytesToHex(sNode.value) };
}

function leftPadHex(s, len) { return s.length >= len ? s : '0'.repeat(len - s.length) + s; }

/** jsrsasign's KJUR.crypto.ECDSA.asn1SigToConcatSig, verbatim (see module comment above). */
export function asn1HexToP1363Hex(derHex) {
  let { r, s } = asn1HexToRS(derHex);
  if (r.length >= 130 && r.length <= 134) {
    if (r.length % 2 !== 0) throw new Error('unknown ECDSA sig r length error');
    if (s.length % 2 !== 0) throw new Error('unknown ECDSA sig s length error');
    if (r.slice(0, 2) === '00') r = r.slice(2);
    if (s.slice(0, 2) === '00') s = s.slice(2);
    const len = Math.max(r.length, s.length);
    return leftPadHex(r, len) + leftPadHex(s, len);
  }
  if (r.slice(0, 2) === '00' && (r.length % 32) === 2) r = r.slice(2);
  if (s.slice(0, 2) === '00' && (s.length % 32) === 2) s = s.slice(2);
  if ((r.length % 32) === 30) r = '00' + r;
  if ((s.length % 32) === 30) s = '00' + s;
  if (r.length % 32 !== 0) throw new Error('unknown ECDSA sig r length error');
  if (s.length % 32 !== 0) throw new Error('unknown ECDSA sig s length error');
  return r + s;
}

export function detectSignatureFormat(input, inputFormat) {
  if (inputFormat === 'Auto') {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === 'object') inputFormat = 'Raw JSON';
    } catch { /* not JSON */ }
  }
  if (inputFormat === 'Auto' && isHexString(input)) {
    inputFormat = input.slice(0, 2).toLowerCase() === '30' && isAsn1Sig(input) ? 'ASN.1 HEX' : 'P1363 HEX';
  }
  if (inputFormat === 'Auto' && isBase64UrlString(input)) inputFormat = 'JSON Web Signature';
  return inputFormat;
}

export function signatureToAsn1Hex(input, inputFormat) {
  switch (inputFormat) {
    case 'ASN.1 HEX': return input;
    case 'P1363 HEX': return p1363HexToAsn1Hex(input);
    case 'JSON Web Signature': return p1363HexToAsn1Hex(bytesToHex(base64Decode(input)));
    case 'Raw JSON': {
      const json = JSON.parse(input);
      if (!json.r) throw new Error('No "r" value in the signature JSON');
      if (!json.s) throw new Error('No "s" value in the signature JSON');
      return hexRSSigToAsn1Hex(json.r, json.s);
    }
    case 'Auto': throw new Error('Signature format could not be detected');
    default: throw new Error(`Unknown input format: ${inputFormat}`);
  }
}

/** Renders an ASN.1 hex ECDSA signature in one of the four output formats. */
export function asn1HexToFormat(asn1Hex, outputFormat) {
  switch (outputFormat) {
    case 'ASN.1 HEX': return asn1Hex;
    case 'P1363 HEX': return asn1HexToP1363Hex(asn1Hex);
    case 'JSON Web Signature': return base64UrlEncode(parseHex(asn1HexToP1363Hex(asn1Hex)));
    case 'Raw JSON': return JSON.stringify(asn1HexToRS(asn1Hex));
    default: throw new Error(`Unknown output format: ${outputFormat}`);
  }
}

module('ECDSA Signature Conversion', 'Converts an ECDSA signature between ASN.1 DER hex, the fixed-width P1363 raw hex (r||s), a JSON Web Signature (base64url) and a {r,s} JSON object.',
  [A.select('Input Format', FORMATS), A.select('Output Format', OUT_FORMATS)],
  (data, inputFormat, outputFormat) => {
    const input = (decodeLatin1(data)).trim();
    return asn1HexToFormat(signatureToAsn1Hex(input, detectSignatureFormat(input, inputFormat)), outputFormat);
  });
