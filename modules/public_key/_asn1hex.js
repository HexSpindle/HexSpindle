/** A port of jsrsasign's ASN1HEX helpers and OID/DN tables (MIT, Copyright (c) Kenji Urushima). */
// Full third-party license and attribution notices: /THIRD_PARTY_NOTICES.md

import { decodeUtf8, decodeLatin1 } from '../../core/util.js';
import { decodeOid } from './_asn1.js';

export function hexToBytes(h) {
  const out = new Uint8Array(h.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
export function hextorstr(h) { return decodeLatin1(hexToBytes(h)); }
export function hextoutf8(h) { return decodeUtf8(hexToBytes(h)); }
export function hextoip(h) { return [...hexToBytes(h)].join('.'); }
export function oidHexToInt(h) { return decodeOid(hexToBytes(h)); }

/* ---- ASN1HEX (jsrsasign) ---- */
export function getLblen(s, idx) {
  if (s.substr(idx + 2, 1) !== '8') return 1;
  const n = parseInt(s.substr(idx + 3, 1));
  if (n === 0) return -1;
  if (n > 0 && n < 10) return n + 1;
  return -2;
}
export function getL(s, idx) {
  const len = getLblen(s, idx);
  if (len < 1) return '';
  return s.substr(idx + 2, len * 2);
}
export function getVblen(s, idx) {
  const hL = getL(s, idx);
  if (hL === '') return -1;
  return parseInt(hL.substr(0, 1) === '8' ? hL.substr(2) : hL, 16);
}
export function getVidx(s, idx) {
  const l = getLblen(s, idx);
  if (l < 0) return l;
  return idx + (l + 1) * 2;
}
export function getV(s, idx) { return s.substr(getVidx(s, idx), getVblen(s, idx) * 2); }
export function getTLVblen(s, idx) { return 2 + getLblen(s, idx) * 2 + getVblen(s, idx) * 2; }
export function getTLV(s, idx) { return s.substr(idx, 2) + getL(s, idx) + getV(s, idx); }
export function getChildIdx(s, idx) {
  const out = [];
  let start = getVidx(s, idx);
  let len = getVblen(s, idx) * 2;
  if (start + len > s.length) throw new Error('too short ASN.1 value');
  if (s.substr(idx, 2) === '03') { start += 2; len -= 2; }
  let used = 0, p = start;
  while (used <= len) {
    const blen = getTLVblen(s, p);
    if (blen <= 0) throw new Error('malformed ASN.1: invalid TLV length');
    used += blen;
    if (used <= len) out.push(p);
    p += blen;
    if (used >= len) break;
  }
  return out;
}
/** ASN1HEX.getIdxbyList, with a tag check like getIdxbyListEx's. */
export function getIdxbyList(s, idx, list, checkTag) {
  if (list.length === 0) {
    if (checkTag !== undefined && s.substr(idx, 2) !== checkTag) return -1;
    return idx;
  }
  const kids = getChildIdx(s, idx);
  if (kids[list[0]] === undefined) return -1;
  return getIdxbyList(s, kids[list[0]], list.slice(1), checkTag);
}
export function isContextTag(tagHex, sel) {
  const t = parseInt(tagHex, 16);
  if (Number.isNaN(t)) return -1;
  if (sel === undefined) return (t & 192) === 128;
  if (!/^\[[0-9]+\]$/.test(sel)) return false;
  const n = parseInt(sel.substr(1, sel.length - 1), 10);
  if (n > 31) return false;
  return (t & 192) === 128 && (t & 31) === n;
}
/** ASN1HEX.getIdxbyListEx: numeric steps index only the non-context-tagged children, and a
 * "[n]" step selects the child with that context tag. */
export function getIdxbyListEx(s, idx, list, checkTag) {
  if (list.length === 0) {
    if (checkTag !== undefined && s.substr(idx, 2) !== checkTag) return -1;
    return idx;
  }
  const want = list[0], rest = list.slice(1);
  const kids = getChildIdx(s, idx);
  let n = 0;
  for (const k of kids) {
    const tag = s.substr(k, 2);
    if ((typeof want === 'number' && !isContextTag(tag) && n === want) ||
        (typeof want === 'string' && isContextTag(tag, want))) return getIdxbyListEx(s, k, rest, checkTag);
    if (!isContextTag(tag)) n++;
  }
  return -1;
}
export function getVbyListEx(s, idx, list, checkTag, keepUnusedbits) {
  const i = getIdxbyListEx(s, idx, list, checkTag);
  if (i === -1) return null;
  const v = getV(s, i);
  return s.substr(i, 2) === '03' && keepUnusedbits !== false ? v.substr(2) : v;
}
export function getTLVbyListEx(s, idx, list, checkTag) {
  const i = getIdxbyListEx(s, idx, list, checkTag);
  return i === -1 ? null : getTLV(s, i);
}
export function getTLVbyList(s, idx, list, checkTag) {
  const i = getIdxbyList(s, idx, list, checkTag);
  return i === -1 ? null : getTLV(s, i);
}
export function getVbyList(s, idx, list, checkTag, removeUnusedbits) {
  const i = getIdxbyList(s, idx, list, checkTag);
  if (i === -1) return null;
  const v = getV(s, i);
  return removeUnusedbits === true ? v.substr(2) : v;
}

export const ATYPE2OID = {
  CN: '2.5.4.3', L: '2.5.4.7', ST: '2.5.4.8', O: '2.5.4.10', OU: '2.5.4.11', C: '2.5.4.6', STREET: '2.5.4.9',
  DC: '0.9.2342.19200300.100.1.25', UID: '0.9.2342.19200300.100.1.1', SN: '2.5.4.4', T: '2.5.4.12', GN: '2.5.4.42',
  DN: '2.5.4.49', E: '1.2.840.113549.1.9.1', description: '2.5.4.13', businessCategory: '2.5.4.15',
  postalCode: '2.5.4.17', serialNumber: '2.5.4.5', uniqueIdentifier: '2.5.4.45',
  organizationIdentifier: '2.5.4.97', jurisdictionOfIncorporationL: '1.3.6.1.4.1.311.60.2.1.1',
  jurisdictionOfIncorporationSP: '1.3.6.1.4.1.311.60.2.1.2', jurisdictionOfIncorporationC: '1.3.6.1.4.1.311.60.2.1.3',
};

export const NAME2OID = {
  "aes128-CBC": '2.16.840.1.101.3.4.1.2', "aes256-CBC": '2.16.840.1.101.3.4.1.42', sha1: '1.3.14.3.2.26',
  sha256: '2.16.840.1.101.3.4.2.1', sha384: '2.16.840.1.101.3.4.2.2', sha512: '2.16.840.1.101.3.4.2.3',
  sha224: '2.16.840.1.101.3.4.2.4', md5: '1.2.840.113549.2.5', md2: '1.3.14.7.2.2.1', ripemd160: '1.3.36.3.2.1',
  hmacWithSHA1: '1.2.840.113549.2.7', hmacWithSHA224: '1.2.840.113549.2.8', hmacWithSHA256: '1.2.840.113549.2.9',
  hmacWithSHA384: '1.2.840.113549.2.10', hmacWithSHA512: '1.2.840.113549.2.11', MD2withRSA: '1.2.840.113549.1.1.2',
  MD4withRSA: '1.2.840.113549.1.1.3', MD5withRSA: '1.2.840.113549.1.1.4', SHA1withRSA: '1.2.840.113549.1.1.5',
  "pkcs1-MGF": '1.2.840.113549.1.1.8', rsaPSS: '1.2.840.113549.1.1.10', SHA224withRSA: '1.2.840.113549.1.1.14',
  SHA256withRSA: '1.2.840.113549.1.1.11', SHA384withRSA: '1.2.840.113549.1.1.12',
  SHA512withRSA: '1.2.840.113549.1.1.13', SHA1withECDSA: '1.2.840.10045.4.1',
  SHA224withECDSA: '1.2.840.10045.4.3.1', SHA256withECDSA: '1.2.840.10045.4.3.2',
  SHA384withECDSA: '1.2.840.10045.4.3.3', SHA512withECDSA: '1.2.840.10045.4.3.4', dsa: '1.2.840.10040.4.1',
  SHA1withDSA: '1.2.840.10040.4.3', SHA224withDSA: '2.16.840.1.101.3.4.3.1',
  SHA256withDSA: '2.16.840.1.101.3.4.3.2', rsaEncryption: '1.2.840.113549.1.1.1', commonName: '2.5.4.3',
  countryName: '2.5.4.6', localityName: '2.5.4.7', stateOrProvinceName: '2.5.4.8', streetAddress: '2.5.4.9',
  organizationName: '2.5.4.10', organizationalUnitName: '2.5.4.11', domainComponent: '0.9.2342.19200300.100.1.25',
  userId: '0.9.2342.19200300.100.1.1', surname: '2.5.4.4', givenName: '2.5.4.42', title: '2.5.4.12',
  distinguishedName: '2.5.4.49', emailAddress: '1.2.840.113549.1.9.1', description: '2.5.4.13',
  businessCategory: '2.5.4.15', postalCode: '2.5.4.17', uniqueIdentifier: '2.5.4.45',
  organizationIdentifier: '2.5.4.97', jurisdictionOfIncorporationL: '1.3.6.1.4.1.311.60.2.1.1',
  jurisdictionOfIncorporationSP: '1.3.6.1.4.1.311.60.2.1.2',
  jurisdictionOfIncorporationC: '1.3.6.1.4.1.311.60.2.1.3', subjectDirectoryAttributes: '2.5.29.9',
  subjectKeyIdentifier: '2.5.29.14', keyUsage: '2.5.29.15', subjectAltName: '2.5.29.17',
  issuerAltName: '2.5.29.18', basicConstraints: '2.5.29.19', cRLNumber: '2.5.29.20', cRLReason: '2.5.29.21',
  nameConstraints: '2.5.29.30', cRLDistributionPoints: '2.5.29.31', certificatePolicies: '2.5.29.32',
  anyPolicy: '2.5.29.32.0', policyMappings: '2.5.29.33', authorityKeyIdentifier: '2.5.29.35',
  policyConstraints: '2.5.29.36', extKeyUsage: '2.5.29.37', inhibitAnyPolicy: '2.5.29.54',
  authorityInfoAccess: '1.3.6.1.5.5.7.1.1', ocsp: '1.3.6.1.5.5.7.48.1', ocspBasic: '1.3.6.1.5.5.7.48.1.1',
  ocspNonce: '1.3.6.1.5.5.7.48.1.2', ocspNoCheck: '1.3.6.1.5.5.7.48.1.5', caIssuers: '1.3.6.1.5.5.7.48.2',
  anyExtendedKeyUsage: '2.5.29.37.0', serverAuth: '1.3.6.1.5.5.7.3.1', clientAuth: '1.3.6.1.5.5.7.3.2',
  codeSigning: '1.3.6.1.5.5.7.3.3', emailProtection: '1.3.6.1.5.5.7.3.4', timeStamping: '1.3.6.1.5.5.7.3.8',
  ocspSigning: '1.3.6.1.5.5.7.3.9', smtpUTF8Mailbox: '1.3.6.1.5.5.7.8.9', dateOfBirth: '1.3.6.1.5.5.7.9.1',
  placeOfBirth: '1.3.6.1.5.5.7.9.2', gender: '1.3.6.1.5.5.7.9.3', countryOfCitizenship: '1.3.6.1.5.5.7.9.4',
  countryOfResidence: '1.3.6.1.5.5.7.9.5', ecPublicKey: '1.2.840.10045.2.1', "P-256": '1.2.840.10045.3.1.7',
  secp256r1: '1.2.840.10045.3.1.7', secp256k1: '1.3.132.0.10', secp384r1: '1.3.132.0.34',
  secp521r1: '1.3.132.0.35', pkcs5PBES2: '1.2.840.113549.1.5.13', pkcs5PBKDF2: '1.2.840.113549.1.5.12',
  "des-EDE3-CBC": '1.2.840.113549.3.7', data: '1.2.840.113549.1.7.1', "signed-data": '1.2.840.113549.1.7.2',
  "enveloped-data": '1.2.840.113549.1.7.3', "digested-data": '1.2.840.113549.1.7.5',
  "encrypted-data": '1.2.840.113549.1.7.6', "authenticated-data": '1.2.840.113549.1.9.16.1.2',
  tstinfo: '1.2.840.113549.1.9.16.1.4', signingCertificate: '1.2.840.113549.1.9.16.2.12',
  timeStampToken: '1.2.840.113549.1.9.16.2.14', signaturePolicyIdentifier: '1.2.840.113549.1.9.16.2.15',
  etsArchiveTimeStamp: '1.2.840.113549.1.9.16.2.27', signingCertificateV2: '1.2.840.113549.1.9.16.2.47',
  etsArchiveTimeStampV2: '1.2.840.113549.1.9.16.2.48', extensionRequest: '1.2.840.113549.1.9.14',
  contentType: '1.2.840.113549.1.9.3', messageDigest: '1.2.840.113549.1.9.4', signingTime: '1.2.840.113549.1.9.5',
  counterSignature: '1.2.840.113549.1.9.6', archiveTimeStampV3: '0.4.0.1733.2.4',
  pdfRevocationInfoArchival: '1.2.840.113583.1.1.8', adobeTimeStamp: '1.2.840.113583.1.1.9.1',
  smimeMailboxLegacy: '2.23.140.1.5.1.1', smimeMailboxMulti: '2.23.140.1.5.1.2',
  smimeMailboxStrict: '2.23.140.1.5.1.3', smimeOrganizationLegacy: '2.23.140.1.5.2.1',
  smimeOrganizationMulti: '2.23.140.1.5.2.2', smimeOrganizationStrict: '2.23.140.1.5.2.3',
  smimeSponsorLegacy: '2.23.140.1.5.3.1', smimeSponsorMulti: '2.23.140.1.5.3.2',
  smimeSponsorStrict: '2.23.140.1.5.3.3', smimeIndividualLegacy: '2.23.140.1.5.4.1',
  smimeIndividualMulti: '2.23.140.1.5.4.2', smimeIndividualStrict: '2.23.140.1.5.4.3',
};

const OID2ATYPE = Object.fromEntries(Object.entries(ATYPE2OID).map(([k, v]) => [v, k]).reverse());
const OID2NAME = Object.fromEntries(Object.entries(NAME2OID).map(([k, v]) => [v, k]).reverse());
/** KJUR.asn1.x509.OID.oid2atype: the short DN attribute label, or the OID itself. */
export function oid2atype(oid) { return OID2ATYPE[oid] !== undefined ? OID2ATYPE[oid] : oid; }
/** KJUR.asn1.x509.OID.oid2name: the long OID name, or '' when unknown. */
export function oid2name(oid) { return OID2NAME[oid] !== undefined ? OID2NAME[oid] : ''; }
/** ASN1HEX.oidname: accepts a dotted OID or its hex content octets, returns the long OID name or
 * the dotted OID when it has none. */
export function oidname(oid) {
  if (/^[0-9a-fA-F]+$/.test(oid) && oid.length % 2 === 0) oid = oidHexToInt(oid);
  return oid2name(oid) || oid;
}

const DS_BY_TAG = { '0c': 'utf8', '12': 'num', '14': 'tel', '13': 'prn', '16': 'ia5', '1a': 'vis', '1e': 'bmp' };

/** jsrsasign's AttributeTypeAndValue parse (X509.getAttrTypeAndValue). */
function attrTypeAndValue(s, idx) {
  const [oidIdx, valIdx] = getChildIdx(s, idx);
  const oid = oidHexToInt(getV(s, oidIdx));
  const tag = s.substr(valIdx, 2);
  const ds = DS_BY_TAG[tag];
  const vHex = getV(s, valIdx);
  const value = ds === 'utf8' ? hextoutf8(vHex) : hextorstr(vHex);
  return { type: oid2atype(oid), ds, value };
}

/** X509.getX500Name: {str, array} where array is a list of RDNs, each a list of {type, ds, value}. */
export function getX500Name(hex) {
  const array = getChildIdx(hex, 0).map(rdnIdx => getChildIdx(hex, rdnIdx).map(i => attrTypeAndValue(hex, i)));
  const str = '/' + array.map(rdn => rdn.map(a => `${a.type}=${a.value}`.replace(/\+/, '\\+')).join('+').replace(/\//, '\\/')).join('/');
  return { str, array };
}

export function formatDnObj(dnObj, indent) {
  let output = '';
  const maxKeyLen = dnObj.array.reduce((max, item) => (item[0].type.length > max ? item[0].type.length : max), 0);
  for (let i = 0; i < dnObj.array.length; i++) {
    if (!dnObj.array[i].length) continue;
    const str = `${dnObj.array[i][0].type.padEnd(maxKeyLen, ' ')} = ${dnObj.array[i][0].value}\n`;
    output += str.padStart(indent + str.length, ' ');
  }
  return output.slice(0, -1);
}

export function formatByteStr(byteStr, length, indent) {
  byteStr = (byteStr.match(/../g) || []).join(':');
  length = length * 3;
  let output = '';
  for (let i = 0; i < byteStr.length; i += length) {
    const str = byteStr.slice(i, i + length) + '\n';
    output += i === 0 ? str : str.padStart(indent + str.length, ' ');
  }
  return output.slice(0, output.length - 1);
}
