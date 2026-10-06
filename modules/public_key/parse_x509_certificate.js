import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { CcX509, bitLength, posHex } from './_x509_ext.js';
import { formatByteStr, formatDnObj, getV, hexToBytes, getVblen } from './_asn1hex.js';
import { findPem } from './_pem.js';
import { md5 } from '../hashing/md5.js';
import { base64Decode, bytesToHex, decodeLatin1 } from '../../core/util.js';

function hex2(n) { return n.toString(16).padStart(2, '0'); }

/** ParseX509Certificate's formatDate: "dd/mm/yyyy hh:mm:ss" from a UTCTime/GeneralizedTime string. */
function formatDate(dateStr) {
  if (dateStr.length === 13) dateStr = (dateStr[0] < '5' ? '20' : '19') + dateStr;
  return dateStr[6] + dateStr[7] + '/' + dateStr[4] + dateStr[5] + '/' +
    dateStr[0] + dateStr[1] + dateStr[2] + dateStr[3] + ' ' +
    dateStr[8] + dateStr[9] + ':' + dateStr[10] + dateStr[11] + ':' + dateStr[12] + dateStr[13];
}

function looksLikeSequence(sigHex) {
  if (sigHex.substr(0, 2) !== '30') return false;
  try { return getV(sigHex, 0).length === getVblen(sigHex, 0) * 2 && getVblen(sigHex, 0) > 0; } catch { return false; }
}

async function sha(name, bytes) { return bytesToHex(new Uint8Array(await crypto.subtle.digest(name, bytes))); }

export async function parseX509ToText(data, fmt) {
  const input = typeof data === 'string' ? data : decodeLatin1(data);
  if (!input.length) return 'No input';

  let certHex;
  try {
    if (fmt === 'DER Hex') certHex = input.replace(/\s/g, '').toLowerCase();
    else if (fmt === 'PEM') certHex = bytesToHex(findPem(input).der);
    else if (fmt === 'Base64') certHex = bytesToHex(base64Decode(input));
    else if (fmt === 'Raw') certHex = bytesToHex(new Uint8Array([...input].map(c => c.charCodeAt(0) & 0xff)));
    else throw new Error('Undefined input format');
  } catch {
    throw new Error('Certificate load error (non-certificate input?)');
  }

  let cert;
  try { cert = new CcX509(certHex); } catch { throw new Error('Certificate load error (non-certificate input?)'); }

  const der = hexToBytes(certHex);
  const sn = cert.getSerialNumberHex();
  const pk = cert.getPublicKey();
  const sig = cert.getSignatureValueHex();
  const pkFields = [{ key: 'Algorithm', value: pk.type }];
  if (pk.type === 'EC') {
    pkFields.push({ key: 'Curve Name', value: pk.curveName });
    pkFields.push({ key: 'Length', value: ((bitLength(pk.pubKeyHex) - 3) / 2) + ' bits' });
    pkFields.push({ key: 'pub', value: formatByteStr(pk.pubKeyHex, 16, 18) });
  } else if (pk.type === 'DSA') {
    pkFields.push({ key: 'pub', value: formatByteStr(posHex(pk.yHex), 16, 18) });
    pkFields.push({ key: 'P', value: formatByteStr(posHex(pk.pHex), 16, 18) });
    pkFields.push({ key: 'Q', value: formatByteStr(posHex(pk.qHex), 16, 18) });
    pkFields.push({ key: 'G', value: formatByteStr(posHex(pk.gHex), 16, 18) });
  } else if (pk.type === 'RSA') {
    const e = BigInt('0x' + pk.eHex);
    pkFields.push({ key: 'Length', value: bitLength(pk.nHex) + ' bits' });
    pkFields.push({ key: 'Modulus', value: formatByteStr(posHex(pk.nHex), 16, 18) });
    pkFields.push({ key: 'Exponent', value: e + ' (0x' + e.toString(16) + ')' });
  } else {
    pkFields.push({ key: 'Error', value: 'Unknown Public Key type' });
  }

  let pkStr = '';
  for (const f of pkFields) {
    pkStr += `  ${f.key}:${(f.value + '\n').padStart(18 - (f.key.length + 3) + f.value.length + 1, ' ')}`;
  }

  const sigStr = looksLikeSequence(sig)
    ? `  r:              ${formatByteStr(getV(sig, 4), 16, 18)}\n  s:              ${formatByteStr(getV(sig, 48), 16, 18)}`
    : `  Signature:      ${formatByteStr(sig, 16, 18)}`;

  let extensions = '';
  const extBlock = cert.getInfoExtensions();
  if (extBlock !== null && extBlock !== undefined) extensions = extBlock.split('signature')[0];

  const [md5Hex, sha1Hex, sha256Hex] = [bytesToHex(md5(der)), await sha('SHA-1', der), await sha('SHA-256', der)];

  return `Version:          ${cert.version} (0x${hex2(cert.version - 1)})
Serial number:    ${BigInt('0x' + sn)} (0x${sn})
Algorithm ID:     ${cert.getSignatureAlgorithmField()}
Validity
  Not Before:     ${formatDate(cert.getNotBefore())} (dd-mm-yyyy hh:mm:ss) (${cert.getNotBefore()})
  Not After:      ${formatDate(cert.getNotAfter())} (dd-mm-yyyy hh:mm:ss) (${cert.getNotAfter()})
Issuer
${formatDnObj(cert.getIssuer(), 2)}
Subject
${formatDnObj(cert.getSubject(), 2)}
Fingerprints
  MD5:            ${md5Hex}
  SHA1:           ${sha1Hex}
  SHA256:         ${sha256Hex}
Public Key
${pkStr.slice(0, -1)}
Certificate Signature
  Algorithm:      ${cert.getSignatureAlgorithmName()}
${sigStr}

Extensions
${extensions}`;
}

module('Parse X.509 certificate', 'Decodes a certificate (PEM, DER hex, base64 or raw DER) into readable fields, in the same layout as the openssl command line tool.',
  [A.select('Input format', ['PEM', 'DER Hex', 'Base64', 'Raw'])],
  (data, fmt) => parseX509ToText(data, fmt), { text: true });
