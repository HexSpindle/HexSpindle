import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, decodeLatin1 } from '../../core/util.js';

const OID_TO_NAME = {
  '2.16.840.1.101.3.4.1.2': 'aes128-CBC', '2.16.840.1.101.3.4.1.42': 'aes256-CBC', '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.1': 'sha256', '2.16.840.1.101.3.4.2.2': 'sha384', '2.16.840.1.101.3.4.2.3': 'sha512',
  '2.16.840.1.101.3.4.2.4': 'sha224', '1.2.840.113549.2.5': 'md5', '1.3.14.7.2.2.1': 'md2',
  '1.3.36.3.2.1': 'ripemd160', '1.2.840.113549.2.7': 'hmacWithSHA1', '1.2.840.113549.2.8': 'hmacWithSHA224',
  '1.2.840.113549.2.9': 'hmacWithSHA256', '1.2.840.113549.2.10': 'hmacWithSHA384',
  '1.2.840.113549.2.11': 'hmacWithSHA512', '1.2.840.113549.1.1.2': 'MD2withRSA', '1.2.840.113549.1.1.3': 'MD4withRSA',
  '1.2.840.113549.1.1.4': 'MD5withRSA', '1.2.840.113549.1.1.5': 'SHA1withRSA', '1.2.840.113549.1.1.8': 'pkcs1-MGF',
  '1.2.840.113549.1.1.10': 'rsaPSS', '1.2.840.113549.1.1.14': 'SHA224withRSA',
  '1.2.840.113549.1.1.11': 'SHA256withRSA', '1.2.840.113549.1.1.12': 'SHA384withRSA',
  '1.2.840.113549.1.1.13': 'SHA512withRSA', '1.2.840.10045.4.1': 'SHA1withECDSA',
  '1.2.840.10045.4.3.1': 'SHA224withECDSA', '1.2.840.10045.4.3.2': 'SHA256withECDSA',
  '1.2.840.10045.4.3.3': 'SHA384withECDSA', '1.2.840.10045.4.3.4': 'SHA512withECDSA', '1.2.840.10040.4.1': 'dsa',
  '1.2.840.10040.4.3': 'SHA1withDSA', '2.16.840.1.101.3.4.3.1': 'SHA224withDSA',
  '2.16.840.1.101.3.4.3.2': 'SHA256withDSA', '1.2.840.113549.1.1.1': 'rsaEncryption', '2.5.4.3': 'commonName',
  '2.5.4.6': 'countryName', '2.5.4.7': 'localityName', '2.5.4.8': 'stateOrProvinceName', '2.5.4.9': 'streetAddress',
  '2.5.4.10': 'organizationName', '2.5.4.11': 'organizationalUnitName',
  '0.9.2342.19200300.100.1.25': 'domainComponent', '0.9.2342.19200300.100.1.1': 'userId', '2.5.4.4': 'surname',
  '2.5.4.42': 'givenName', '2.5.4.12': 'title', '2.5.4.49': 'distinguishedName',
  '1.2.840.113549.1.9.1': 'emailAddress', '2.5.4.13': 'description', '2.5.4.15': 'businessCategory',
  '2.5.4.17': 'postalCode', '2.5.4.45': 'uniqueIdentifier', '2.5.4.97': 'organizationIdentifier',
  '1.3.6.1.4.1.311.60.2.1.1': 'jurisdictionOfIncorporationL',
  '1.3.6.1.4.1.311.60.2.1.2': 'jurisdictionOfIncorporationSP',
  '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionOfIncorporationC', '2.5.29.9': 'subjectDirectoryAttributes',
  '2.5.29.14': 'subjectKeyIdentifier', '2.5.29.15': 'keyUsage', '2.5.29.17': 'subjectAltName',
  '2.5.29.18': 'issuerAltName', '2.5.29.19': 'basicConstraints', '2.5.29.20': 'cRLNumber', '2.5.29.21': 'cRLReason',
  '2.5.29.30': 'nameConstraints', '2.5.29.31': 'cRLDistributionPoints', '2.5.29.32': 'certificatePolicies',
  '2.5.29.32.0': 'anyPolicy', '2.5.29.33': 'policyMappings', '2.5.29.35': 'authorityKeyIdentifier',
  '2.5.29.36': 'policyConstraints', '2.5.29.37': 'extKeyUsage', '2.5.29.54': 'inhibitAnyPolicy',
  '1.3.6.1.5.5.7.1.1': 'authorityInfoAccess', '1.3.6.1.5.5.7.48.1': 'ocsp', '1.3.6.1.5.5.7.48.1.1': 'ocspBasic',
  '1.3.6.1.5.5.7.48.1.2': 'ocspNonce', '1.3.6.1.5.5.7.48.1.5': 'ocspNoCheck', '1.3.6.1.5.5.7.48.2': 'caIssuers',
  '2.5.29.37.0': 'anyExtendedKeyUsage', '1.3.6.1.5.5.7.3.1': 'serverAuth', '1.3.6.1.5.5.7.3.2': 'clientAuth',
  '1.3.6.1.5.5.7.3.3': 'codeSigning', '1.3.6.1.5.5.7.3.4': 'emailProtection', '1.3.6.1.5.5.7.3.8': 'timeStamping',
  '1.3.6.1.5.5.7.3.9': 'ocspSigning', '1.3.6.1.5.5.7.8.9': 'smtpUTF8Mailbox', '1.3.6.1.5.5.7.9.1': 'dateOfBirth',
  '1.3.6.1.5.5.7.9.2': 'placeOfBirth', '1.3.6.1.5.5.7.9.3': 'gender', '1.3.6.1.5.5.7.9.4': 'countryOfCitizenship',
  '1.3.6.1.5.5.7.9.5': 'countryOfResidence', '1.2.840.10045.2.1': 'ecPublicKey', '1.2.840.10045.3.1.7': 'P-256',
  '1.3.132.0.10': 'secp256k1', '1.3.132.0.34': 'secp384r1', '1.3.132.0.35': 'secp521r1',
  '1.2.840.113549.1.5.13': 'pkcs5PBES2', '1.2.840.113549.1.5.12': 'pkcs5PBKDF2', '1.2.840.113549.3.7': 'des-EDE3-CBC',
  '1.2.840.113549.1.7.1': 'data', '1.2.840.113549.1.7.2': 'signed-data', '1.2.840.113549.1.7.3': 'enveloped-data',
  '1.2.840.113549.1.7.5': 'digested-data', '1.2.840.113549.1.7.6': 'encrypted-data',
  '1.2.840.113549.1.9.16.1.2': 'authenticated-data', '1.2.840.113549.1.9.16.1.4': 'tstinfo',
  '1.2.840.113549.1.9.16.2.12': 'signingCertificate', '1.2.840.113549.1.9.16.2.14': 'timeStampToken',
  '1.2.840.113549.1.9.16.2.15': 'signaturePolicyIdentifier', '1.2.840.113549.1.9.16.2.27': 'etsArchiveTimeStamp',
  '1.2.840.113549.1.9.16.2.47': 'signingCertificateV2', '1.2.840.113549.1.9.16.2.48': 'etsArchiveTimeStampV2',
  '1.2.840.113549.1.9.14': 'extensionRequest', '1.2.840.113549.1.9.3': 'contentType',
  '1.2.840.113549.1.9.4': 'messageDigest', '1.2.840.113549.1.9.5': 'signingTime',
  '1.2.840.113549.1.9.6': 'counterSignature', '0.4.0.1733.2.4': 'archiveTimeStampV3',
  '1.2.840.113583.1.1.8': 'pdfRevocationInfoArchival', '1.2.840.113583.1.1.9.1': 'adobeTimeStamp',
  '2.23.140.1.5.1.1': 'smimeMailboxLegacy', '2.23.140.1.5.1.2': 'smimeMailboxMulti',
  '2.23.140.1.5.1.3': 'smimeMailboxStrict', '2.23.140.1.5.2.1': 'smimeOrganizationLegacy',
  '2.23.140.1.5.2.2': 'smimeOrganizationMulti', '2.23.140.1.5.2.3': 'smimeOrganizationStrict',
  '2.23.140.1.5.3.1': 'smimeSponsorLegacy', '2.23.140.1.5.3.2': 'smimeSponsorMulti',
  '2.23.140.1.5.3.3': 'smimeSponsorStrict', '2.23.140.1.5.4.1': 'smimeIndividualLegacy',
  '2.23.140.1.5.4.2': 'smimeIndividualMulti', '2.23.140.1.5.4.3': 'smimeIndividualStrict'
};

const isHex = s => s.length % 2 === 0 && (/^[0-9a-f]+$/.test(s) || /^[0-9A-F]+$/.test(s));
const hexToInt32 = h => {
  let v = 0n;
  for (const c of h) { const d = parseInt(c, 36); if (!Number.isNaN(d)) v = v * 16n + BigInt(d); }
  return Number(BigInt.asIntN(32, v));
};
function getLblen(s, i) {
  if (s.substr(i + 2, 1) !== '8') return 1;
  const b = parseInt(s.substr(i + 3, 1));
  if (b === 0) return -1;
  if (b > 0 && b < 10) return b + 1;
  return -2;
}
function getL(s, i) { const a = getLblen(s, i); return a < 1 ? '' : s.substr(i + 2, a * 2); }
function getVblen(s, i) {
  const l = getL(s, i);
  if (l === '') return -1;
  return hexToInt32(l.substr(0, 1) === '8' ? l.substr(2) : l);
}
function getVidx(s, i) { const a = getLblen(s, i); return a < 0 ? a : i + (a + 1) * 2; }
function getV(s, i) { return s.substr(getVidx(s, i), getVblen(s, i) * 2); }
function getTLVblen(s, i) { return 2 + getLblen(s, i) * 2 + getVblen(s, i) * 2; }
function getChildIdx(s, i) {
  const out = [];
  let c = getVidx(s, i), f = getVblen(s, i) * 2;
  if (c + f > s.length) throw new Error('too short ASN.1 value');
  if (s.substr(i, 2) === '03') { c += 2; f -= 2; }
  let g = 0, d = c;
  while (g <= f) {
    const b = getTLVblen(s, d);
    if (b <= 0) throw new Error('malformed ASN.1: invalid TLV length');
    g += b;
    if (g <= f) out.push(d);
    d += b;
    if (g >= f) break;
  }
  return out;
}
function isASN1HEX(s) {
  if (s.length % 2 === 1) return false;
  const vlen = getVblen(s, 0);
  return s.length - s.substr(0, 2).length - getL(s, 0).length === vlen * 2;
}
function oidHexToInt(a) {
  const k = parseInt(a.substr(0, 2), 16);
  let j = Math.floor(k / 40) + '.' + (k % 40), e = '';
  for (let f = 2; f < a.length; f += 2) {
    const h = ('00000000' + parseInt(a.substr(f, 2), 16).toString(2)).slice(-8);
    e += h.substr(1, 7);
    if (h.substr(0, 1) === '0') { j += '.' + BigInt('0b' + (e || '0')).toString(10); e = ''; }
  }
  return j;
}
const oid2name = oid => OID_TO_NAME[oid] || '';
function oidname(a) { if (isHex(a)) a = oidHexToInt(a); return oid2name(a) || a; }
function hextoutf8(h) { try { return decodeURIComponent(h.replace(/(..)/g, '%$1')); } catch { return null; } }
function ucs2hextoutf8(d) {
  return (d.match(/.{4}/g) || []).map(f => {
    const h = parseInt(f.substr(0, 2), 16), a = parseInt(f.substr(2), 16);
    if (h === 0 && a < 128) return String.fromCharCode(a);
    if (h < 8) return hextoutf8((192 | ((h & 7) << 3) | ((a & 192) >> 6)).toString(16) + (128 | (a & 63)).toString(16));
    return hextoutf8((224 | ((h & 240) >> 4)).toString(16) + (128 | ((h & 15) << 2) | ((a & 192) >> 6)).toString(16) + (128 | (a & 63)).toString(16));
  }).join('');
}

function dump(e, c, l, g) {
  const trunc = (s, n) => s.length <= n * 2 ? s : s.substr(0, n) + '..(total ' + s.length / 2 + 'bytes)..' + s.substr(s.length - n, n);
  const x = c.ommit_long_octet;
  const z = e.substr(l, 2);
  let h, k;
  switch (z) {
    case '01': return g + (getV(e, l) === '00' ? 'BOOLEAN FALSE\n' : 'BOOLEAN TRUE\n');
    case '02': return g + 'INTEGER ' + trunc(getV(e, l), x) + '\n';
    case '03':
      h = getV(e, l);
      if (isASN1HEX(h.substr(2))) return g + 'BITSTRING, encapsulates\n' + dump(h.substr(2), c, 0, g + '  ');
      return g + 'BITSTRING ' + trunc(h, x) + '\n';
    case '04':
      h = getV(e, l);
      if (isASN1HEX(h)) return g + 'OCTETSTRING, encapsulates\n' + dump(h, c, 0, g + '  ');
      return g + 'OCTETSTRING ' + trunc(h, x) + '\n';
    case '05': return g + 'NULL\n';
    case '06': {
      const b = oidHexToInt(getV(e, l)), o = oid2name(b), a = b.replace(/\./g, ' ');
      return o !== '' ? g + 'ObjectIdentifier ' + o + ' (' + a + ')\n' : g + 'ObjectIdentifier (' + a + ')\n';
    }
    case '0a': return g + 'ENUMERATED ' + parseInt(getV(e, l)) + '\n';
    case '0c': return g + "UTF8String '" + hextoutf8(getV(e, l)) + "'\n";
    case '13': return g + "PrintableString '" + hextoutf8(getV(e, l)) + "'\n";
    case '14': return g + "TeletexString '" + hextoutf8(getV(e, l)) + "'\n";
    case '16': return g + "IA5String '" + hextoutf8(getV(e, l)) + "'\n";
    case '17': return g + 'UTCTime ' + hextoutf8(getV(e, l)) + '\n';
    case '18': return g + 'GeneralizedTime ' + hextoutf8(getV(e, l)) + '\n';
    case '1a': return g + "VisualString '" + hextoutf8(getV(e, l)) + "'\n";
    case '1e': return g + "BMPString '" + ucs2hextoutf8(getV(e, l)) + "'\n";
    case '30': {
      if (e.substr(l, 4) === '3000') return g + 'SEQUENCE {}\n';
      k = g + 'SEQUENCE\n';
      const d = getChildIdx(e, l);
      let f = c;
      if ((d.length === 2 || d.length === 3) && e.substr(d[0], 2) === '06' && e.substr(d[d.length - 1], 2) === '04') {
        f = { ...c, x509ExtName: oidname(getV(e, d[0])) };
      }
      for (const u of d) k += dump(e, f, u, g + '  ');
      return k;
    }
    case '31': {
      k = g + 'SET\n';
      for (const u of getChildIdx(e, l)) k += dump(e, c, u, g + '  ');
      return k;
    }
  }
  const t = parseInt(z, 16);
  if ((t & 128) !== 0) {
    const n = t & 31;
    if ((t & 32) !== 0) {
      k = g + '[' + n + ']\n';
      for (const u of getChildIdx(e, l)) k += dump(e, c, u, g + '  ');
      return k;
    }
    h = getV(e, l);
    if (isASN1HEX(h)) return g + '[' + n + ']\n' + dump(h, c, 0, g + '  ');
    if (h.substr(0, 8) === '68747470') h = hextoutf8(h);
    else if (c.x509ExtName === 'subjectAltName' && n === 2) h = hextoutf8(h);
    return g + '[' + n + '] ' + h + '\n';
  }
  return g + 'UNKNOWN(' + t + ') ' + getV(e, l) + '\n';
}

module('Parse ASN.1 hex string', 'Parses DER/BER ASN.1 data (hex input or raw bytes) into an indented tree.',
  [A.number('Starting index', 0, 0), A.boolean('Truncate long values', true), A.select('Input format', ['Hex', 'Raw']),
    A.number('Truncate octet strings longer than', 32, 0)],
  (data, start, trunc, fmt, truncLen = 32) => {
    const hex = fmt === 'Raw' ? bytesToHex(data) : decodeLatin1(data).replace(/\s/g, '').toLowerCase();
    return dump(hex, { ommit_long_octet: trunc ? truncLen : Infinity }, Math.trunc(start) * 2, '');
  });
