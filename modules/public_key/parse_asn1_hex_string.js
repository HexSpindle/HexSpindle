import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex, decodeUtf8 } from '../../core/util.js';
import { decodeOid } from './_asn1.js';
import { OID_NAMES } from './_oids.js';

const TYPES = {
  1: 'BOOLEAN', 2: 'INTEGER', 3: 'BIT STRING', 4: 'OCTET STRING', 5: 'NULL', 6: 'OBJECT IDENTIFIER',
  12: 'UTF8String', 16: 'SEQUENCE', 17: 'SET', 19: 'PrintableString', 22: 'IA5String', 23: 'UTCTime',
  24: 'GeneralizedTime', 30: 'BMPString', 20: 'T61String', 10: 'ENUMERATED',
};
const CLASS_NAMES = ['UNIVERSAL', 'APPLICATION', 'CONTEXT', 'PRIVATE'];

function signedInt(body) {
  let v = 0n;
  for (const b of body) v = (v << 8n) | BigInt(b);
  if (body.length && (body[0] & 0x80)) v -= 1n << BigInt(body.length * 8);
  return v;
}

export function walk(b, i, end, depth, out, trunc) {
  while (i < end) {
    const tag = b[i];
    const cls = tag >> 6, cons = tag & 0x20, num = tag & 0x1f;
    i += 1;
    let ln = b[i];
    i += 1;
    if (ln & 0x80) {
      const k = ln & 0x7f;
      ln = 0;
      for (let j = 0; j < k; j++) ln = ln * 256 + b[i + j];
      i += k;
    }
    const body = b.subarray(i, i + ln);
    const pad = '  '.repeat(depth);
    const name = cls === 0 ? (TYPES[num] || `[${num}]`) : `[${CLASS_NAMES[cls]} ${num}]`;
    if (cons) {
      out.push(`${pad}${name} (${ln} bytes)`);
      walk(b, i, i + ln, depth + 1, out, trunc);
    } else {
      let val;
      if (num === 6 && cls === 0) {
        const o = decodeOid(body);
        val = OID_NAMES[o] ? `${o} (${OID_NAMES[o]})` : o;
      } else if (num === 2 && cls === 0) {
        const v = signedInt(body);
        val = body.length <= 8 ? v.toString() : '0x' + bytesToHex(body);
      } else if ([12, 19, 22, 23, 24, 20].includes(num) && cls === 0) {
        val = decodeLatin1(body);
      } else if (num === 5) {
        val = '';
      } else if (num === 1) {
        val = body.length && body[0] ? 'TRUE' : 'FALSE';
      } else {
        const h = bytesToHex(body);
        val = trunc && h.length > 64 ? h.slice(0, 64) + `... (${ln} bytes)` : h;
      }
      out.push(`${pad}${name}: ${val}`.replace(/\s+$/, ''));
    }
    i += ln;
  }
}

module('Parse ASN.1 hex string', 'Parses DER/BER ASN.1 data (hex input or raw bytes) into an indented tree.',
  [A.number('Starting index', 0, 0), A.boolean('Truncate long values', true), A.select('Input format', ['Hex', 'Raw'])],
  (data, start, trunc, fmt) => {
    const b = fmt === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    const out = [];
    walk(b, start, b.length, 0, out, trunc);
    return out.join('\n');
  });
