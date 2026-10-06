import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { getAlgorithmIdentifierName, getExtParamArray, getPublicKeyFromSPKI, bitLength } from './_x509_ext.js';
import { formatDnObj, getIdxbyList, getTLVbyList, getTLVbyListEx, getV, getVbyListEx, getX500Name } from './_asn1hex.js';
import { findPem } from './_pem.js';
import { bytesToHex } from '../../core/util.js';

/** ParseCSR's chop(): drop the last character. */
function chop(s) { return s.substring(0, s.length - 1); }
function ensurePositive(hex) {
  if (hex.length % 2 !== 0) return '0' + hex;
  if (hex.length >= 2 && (parseInt(hex.substring(0, 2), 16) & 128)) return '00' + hex;
  return hex;
}
function absBigIntToHex(hex) { return ensurePositive(BigInt('0x' + hex).toString(16)); }
function formatMultiLine(longStr) {
  const lines = [];
  for (let remain = longStr; remain !== ''; remain = remain.substring(48)) lines.push(remain.substring(0, 48));
  return lines.join('\n                  ');
}
function formatHexOntoMultiLine(hex) {
  if (hex.length % 2 !== 0) hex = '0' + hex;
  return formatMultiLine(chop(hex.replace(/(..)/g, '$&:')));
}
function indent(n, parts) {
  const fluff = ' '.repeat(n);
  return fluff + parts.join('\n' + fluff) + '\n';
}
function criticalTag(ext) { return Object.hasOwn(ext, 'critical') && ext.critical ? ' critical' : ''; }

const KU_NAMES = {
  digitalSignature: 'Digital Signature', nonRepudiation: 'Non-repudiation', keyEncipherment: 'Key encipherment',
  dataEncipherment: 'Data encipherment', keyAgreement: 'Key agreement', keyCertSign: 'Key certificate signing',
  cRLSign: 'CRL signing', encipherOnly: 'Encipher Only', decipherOnly: 'Decipher Only',
};
const EKU_NAMES = {
  serverAuth: 'TLS Web Server Authentication', clientAuth: 'TLS Web Client Authentication',
  codeSigning: 'Code signing', emailProtection: 'E-mail Protection (S/MIME)', timeStamping: 'Trusted Timestamping',
  '1.3.6.1.4.1.311.2.1.21': 'Microsoft Individual Code Signing',
  '1.3.6.1.4.1.311.2.1.22': 'Microsoft Commercial Code Signing',
  '1.3.6.1.4.1.311.10.3.1': 'Microsoft Trust List Signing',
  '1.3.6.1.4.1.311.10.3.3': 'Microsoft Server Gated Crypto',
  '1.3.6.1.4.1.311.10.3.4': 'Microsoft Encrypted File System',
  '1.3.6.1.4.1.311.20.2.2': 'Microsoft Smartcard Login',
  '2.16.840.1.113730.4.1': 'Netscape Server Gated Crypto',
};

function describeBasicConstraints(ext) {
  const parts = [`CA = ${Object.hasOwn(ext, 'cA') && ext.cA ? 'true' : 'false'}`];
  if (Object.hasOwn(ext, 'pathLen')) parts.push(`PathLenConstraint = ${ext.pathLen}`);
  return parts;
}
function describeKeyUsage(ext) {
  const usage = [];
  if (Object.hasOwn(ext, 'names')) for (const ku of ext.names) usage.push(Object.hasOwn(KU_NAMES, ku) ? KU_NAMES[ku] : `unknown key usage (${ku})`);
  if (usage.length === 0) usage.push('(none)');
  return usage;
}
function describeExtendedKeyUsage(ext) {
  const usage = [];
  if (Object.hasOwn(ext, 'array')) for (const eku of ext.array) usage.push(Object.hasOwn(EKU_NAMES, eku) ? EKU_NAMES[eku] : eku);
  if (usage.length === 0) usage.push('(none)');
  return usage;
}
function describeSubjectAlternativeName(ext) {
  const names = [];
  if (Object.hasOwn(ext, 'extname') && ext.extname === 'subjectAltName' && Object.hasOwn(ext, 'array')) {
    for (const altName of ext.array) {
      for (const key of Object.keys(altName)) {
        if (key === 'rfc822') names.push(`EMAIL: ${altName[key]}`);
        else if (key === 'dns') names.push(`DNS: ${altName[key]}`);
        else if (key === 'uri') names.push(`URI: ${altName[key]}`);
        else if (key === 'ip') names.push(`IP: ${altName[key]}`);
        else if (key === 'dn') names.push(`DIR: ${altName[key].str}`);
        else if (key === 'other') names.push(`Other: ${altName[key].oid}::${altName[key].value.utf8str.str}`);
        else names.push(`(unable to format SAN '${key}':${altName[key]})\n`);
      }
    }
  }
  return names;
}

function formatRequestedExtensions(extreq) {
  const formatted = new Array(4).fill('');
  for (const ext of extreq || []) {
    switch (ext.extname) {
      case 'basicConstraints':
        formatted[0] = `  Basic Constraints:${criticalTag(ext)}\n${indent(4, describeBasicConstraints(ext))}`; break;
      case 'keyUsage':
        formatted[1] = `  Key Usage:${criticalTag(ext)}\n${indent(4, describeKeyUsage(ext))}`; break;
      case 'extKeyUsage':
        formatted[2] = `  Extended Key Usage:${criticalTag(ext)}\n${indent(4, describeExtendedKeyUsage(ext))}`; break;
      case 'subjectAltName':
        formatted[3] = `  Subject Alternative Name:${criticalTag(ext)}\n${indent(4, describeSubjectAlternativeName(ext))}`; break;
      default:
        formatted.push(`  ${ext.extname}:${criticalTag(ext)}\n${indent(4, ['(unsuported extension)'])}`);
    }
  }
  let out = '\n';
  for (const f of formatted) if (f !== undefined && f !== null && f.length !== 0) out += f;
  return chop(out);
}

function formatSubjectPublicKey(spki) {
  const pk = getPublicKeyFromSPKI(spki);
  let out = '\n';
  if (pk.type === 'RSA') {
    const e = BigInt('0x' + pk.eHex);
    out += `  Algorithm:      RSA
  Length:         ${bitLength(pk.nHex)} bits
  Modulus:        ${formatHexOntoMultiLine(absBigIntToHex(pk.nHex))}
  Exponent:       ${e} (0x${e.toString(16).padStart(2, '0')})\n`;
  } else if (pk.type === 'EC') {
    out += `  Algorithm:      ECDSA
  Length:         ${pk.keylen} bits
  Pub:            ${formatHexOntoMultiLine(pk.pubKeyHex)}
  ASN1 OID:       ${pk.curveName}
  NIST CURVE:     ${pk.nistName}\n`;
  } else if (pk.type === 'DSA') {
    out += `  Algorithm:      DSA
  Length:         ${BigInt('0x' + pk.pHex).toString(16).length * 4} bits
  Pub:            ${formatHexOntoMultiLine(absBigIntToHex(pk.yHex))}
  P:              ${formatHexOntoMultiLine(absBigIntToHex(pk.pHex))}
  Q:              ${formatHexOntoMultiLine(absBigIntToHex(pk.qHex))}
  G:              ${formatHexOntoMultiLine(absBigIntToHex(pk.gHex))}\n`;
  } else {
    out += 'unsupported public key algorithm\n';
  }
  return chop(out);
}

function formatSignature(sigAlg, sigHex) {
  let out = '\n';
  out += `  Algorithm:      ${sigAlg}\n`;
  if (/withrsa/i.test(sigAlg)) out += `  Signature:      ${formatHexOntoMultiLine(sigHex)}\n`;
  else out += `  Signature:      ${formatHexOntoMultiLine(ensurePositive(sigHex))}\n`;
  return chop(out);
}

module('Parse CSR', 'Decodes a PKCS#10 certificate signing request (PEM) into readable fields.',
  [A.select('Input format', ['PEM'])],
  (input) => {
    if (!input.length) return 'No input';
    if (input.indexOf('-----BEGIN CERTIFICATE REQUEST') === -1) throw new Error('argument is not PEM file');
    const hex = bytesToHex(findPem(input).der);

    const subjectTlv = getTLVbyListEx(hex, 0, [0, 1]);
    const subject = getX500Name(subjectTlv);
    const spki = getTLVbyListEx(hex, 0, [0, 2]);
    const sigalg = getAlgorithmIdentifierName(getTLVbyListEx(hex, 0, [1], '30'));
    const sighex = getVbyListEx(hex, 0, [2]);

    let extreq;
    const attrOidIdx = getIdxbyList(hex, 0, [0, 3, 0, 0], '06');
    if (attrOidIdx !== -1 && getV(hex, attrOidIdx) === '2a864886f70d01090e') {
      extreq = getExtParamArray(getTLVbyList(hex, 0, [0, 3, 0, 1, 0], '30'));
    }

    return `Subject\n${formatDnObj(subject, 2)}
Public Key${formatSubjectPublicKey(spki)}
Signature${formatSignature(sigalg, sighex)}
Requested Extensions${formatRequestedExtensions(extreq)}`;
  }, { text: true });
