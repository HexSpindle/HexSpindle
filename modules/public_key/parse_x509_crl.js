import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { CcX509CRL } from './_x509_ext.js';
import { formatDnObj } from './_asn1hex.js';
import { findPem } from './_pem.js';
import { base64Decode, bytesToHex } from '../../core/util.js';

function chop(s) { return s.length < 1 ? s : s.substring(0, s.length - 1); }
function indentString(input, spaces) { return input.replace(/^/gm, ' '.repeat(spaces)); }
function colonHex(hexString) {
  if (hexString.length % 2 !== 0) hexString = '0' + hexString;
  return chop(hexString.replace(/(..)/g, '$&:'));
}
function formatMultiLine(longStr) {
  const lines = [];
  for (let remain = longStr; remain !== ''; remain = remain.substring(54)) lines.push(remain.substring(0, 54));
  return lines.join('\n');
}
/** ParseX509CRL's generalizedDateTimeToUTC. */
function generalizedDateTimeToUTC(datetime) {
  if (!/^\d{12,14}Z$/.test(datetime)) throw new Error(`failed to format datetime string ${datetime}`);
  let century = '20';
  if (datetime.length === 15) { century = datetime.substring(0, 2); datetime = datetime.slice(2); }
  const iso = `${century}${datetime.substring(0, 2)}-${datetime.substring(2, 4)}-${datetime.substring(4, 6)}T` +
    `${datetime.substring(6, 8)}:${datetime.substring(8, 10)}:${datetime.substring(10, 12)}Z`;
  return new Date(iso).toUTCString();
}

function formatGeneralNames(names, spaces) {
  let out = '';
  for (const name of names) {
    const key = Object.keys(name)[0];
    if (key === 'ip') out += `IP:${name.ip}\n`;
    else if (key === 'dns') out += `DNS:${name.dns}\n`;
    else if (key === 'uri') out += `URI:${name.uri}\n`;
    else if (key === 'rfc822') out += `EMAIL:${name.rfc822}\n`;
    else if (key === 'dn') out += `DIR:${name.dn.str}\n`;
    else if (key === 'other') out += `OtherName:${name.other.oid}::${Object.values(name.other.value)[0].str}\n`;
    else out += `${key}: unsupported general name type`;
  }
  return indentString(chop(out), spaces);
}

function formatCRLExtensions(extensions, spaces) {
  if (Array.isArray(extensions) === false || extensions.length === 0) return indentString('No CRL extensions.', spaces);
  let out = '';
  extensions.sort((a, b) => {
    if (!Object.hasOwn(a, 'extname') || !Object.hasOwn(b, 'extname')) return 0;
    if (a.extname < b.extname) return -1;
    return a.extname === b.extname ? 0 : 1;
  });
  for (const ext of extensions) {
    if (!Object.hasOwn(ext, 'extname')) throw new Error(`CRL entry extension object missing 'extname' key: ${ext}`);
    switch (ext.extname) {
      case 'authorityKeyIdentifier':
        out += 'X509v3 Authority Key Identifier:\n';
        if (Object.hasOwn(ext, 'kid')) out += `\tkeyid:${colonHex(ext.kid.hex.toUpperCase())}\n`;
        if (Object.hasOwn(ext, 'issuer')) out += `\tDirName:${ext.issuer.str}\n`;
        if (Object.hasOwn(ext, 'sn')) out += `\tserial:${colonHex(ext.sn.hex.toUpperCase())}\n`;
        break;
      case 'cRLDistributionPoints':
        out += 'X509v3 CRL Distribution Points:\n';
        for (const distPoint of ext.array) out += indentString(`Full Name:\n${formatGeneralNames(distPoint.dpname.full, 4)}`, 4) + '\n';
        break;
      case 'cRLNumber':
        if (!Object.hasOwn(ext, 'num')) throw new Error(`'cRLNumber' CRL entry extension missing 'num' key: ${ext}`);
        out += `X509v3 CRL Number:\n\t${ext.num.hex.toUpperCase()}\n`;
        break;
      case 'issuerAltName':
        out += `X509v3 Issuer Alternative Name:\n${formatGeneralNames(ext.array, 4)}\n`;
        break;
      default:
        out += `${ext.extname}:\n\tUnsupported CRL extension. Try openssl CLI.\n`;
        break;
    }
  }
  return indentString(chop(out), spaces);
}

const CRL_REASONS = {
  0: 'Unspecified', 1: 'Key Compromise', 2: 'CA Compromise', 3: 'Affiliation Changed', 4: 'Superseded',
  5: 'Cessation Of Operation', 6: 'Certificate Hold', 8: 'Remove From CRL', 9: 'Privilege Withdrawn',
  10: 'AA Compromise',
};
const HOLD_INSTRUCTIONS = {
  '1.2.840.10040.2.1': 'Hold Instruction None', '1.2.840.10040.2.2': 'Hold Instruction Call Issuer',
  '1.2.840.10040.2.3': 'Hold Instruction Reject',
};

function formatCRLEntryExtensions(exts) {
  let out = '';
  for (const ext of exts) {
    if (!Object.hasOwn(ext, 'extname')) throw new Error(`CRL entry extension object missing 'extname' key: ${ext}`);
    switch (ext.extname) {
      case 'cRLReason':
        if (!Object.hasOwn(ext, 'code')) throw new Error(`'cRLReason' CRL entry extension missing 'code' key: ${ext}`);
        out += `X509v3 CRL Reason Code:\n    ${Object.hasOwn(CRL_REASONS, ext.code) ? CRL_REASONS[ext.code] : `invalid reason code: ${ext.code}`}\n`;
        break;
      case '2.5.29.23':
        out += `Hold Instruction Code:\n\t${Object.hasOwn(HOLD_INSTRUCTIONS, ext.extn.oid) ? HOLD_INSTRUCTIONS[ext.extn.oid] : `${ext.extn.oid}: unknown hold instruction OID`}\n`;
        break;
      case '2.5.29.24':
        out += `Invalidity Date:\n\t${generalizedDateTimeToUTC(ext.extn.gentime.str)}\n`;
        break;
      default:
        out += `${ext.extname}:\n\tUnsupported CRL entry extension. Try openssl CLI.\n`;
        break;
    }
  }
  return chop(out);
}

function formatRevokedCertificates(revokedCertificates, spaces) {
  if (Array.isArray(revokedCertificates) === false || revokedCertificates.length === 0) return indentString('No Revoked Certificates.', spaces);
  let out = '';
  for (const revCert of revokedCertificates) {
    if (!Object.hasOwn(revCert, 'sn') || !Object.hasOwn(revCert, 'date')) throw new Error('invalid revoked certificate object, missing either serial number or date');
    out += `Serial Number: ${revCert.sn.hex.toUpperCase()}
    Revocation Date: ${generalizedDateTimeToUTC(revCert.date)}\n`;
    if (Object.hasOwn(revCert, 'ext') && Array.isArray(revCert.ext) && revCert.ext.length !== 0) {
      out += `\tCRL entry extensions:\n${indentString(formatCRLEntryExtensions(revCert.ext), 2 * spaces)}\n`;
    }
  }
  return indentString(chop(out), spaces);
}

function formatCRLSignature(sigHex, spaces) {
  if (sigHex.length % 2 !== 0) sigHex = '0' + sigHex;
  return indentString(formatMultiLine(chop(sigHex.replace(/(..)/g, '$&:'))), spaces);
}

module('Parse X.509 CRL', 'Decodes a certificate revocation list (PEM, DER hex, base64 or raw DER) into readable fields.',
  [A.select('Input format', ['PEM', 'DER Hex', 'Base64', 'Raw'])],
  (input, inputFormat) => {
    if (!input.length) return 'No input';

    let hex;
    try {
      if (inputFormat === 'DER Hex') hex = input.replace(/\s/g, '').toLowerCase();
      else if (inputFormat === 'PEM') hex = bytesToHex(findPem(input).der);
      else if (inputFormat === 'Base64') hex = bytesToHex(base64Decode(input));
      else if (inputFormat === 'Raw') hex = bytesToHex(new Uint8Array([...input].map(c => c.charCodeAt(0) & 0xff)));
      else throw new Error('Undefined input format');
    } catch {
      throw new Error('Certificate load error (non-certificate input?)');
    }

    const crl = new CcX509CRL(hex);
    let out = `Certificate Revocation List (CRL):
    Version: ${crl.getVersion() === null ? '1 (0x0)' : '2 (0x1)'}
    Signature Algorithm: ${crl.getSignatureAlgorithmField()}
    Issuer:\n${formatDnObj(crl.getIssuer(), 8)}
    Last Update: ${generalizedDateTimeToUTC(crl.getThisUpdate())}
    Next Update: ${generalizedDateTimeToUTC(crl.getNextUpdate())}\n`;

    const ext = crl.getExtensions();
    if (ext !== undefined) out += `\tCRL extensions:\n${formatCRLExtensions(ext, 8)}\n`;

    out += `Revoked Certificates:\n${formatRevokedCertificates(crl.getRevCertArray(), 4)}
Signature Value:\n${formatCRLSignature(crl.getSignatureValueHex(), 8)}`;

    return out;
  }, { text: true });
