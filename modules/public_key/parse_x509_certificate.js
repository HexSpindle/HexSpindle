import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadDerOrPem } from './_pem.js';
import { parseX509, nameToRfc4514, formatExtensionValue } from './_x509.js';
import { keyKindFromOid, splitSpki, rsaPublicNumbersFromSpkiDer } from './_pki.js';
import { decodeOid } from './_asn1.js';
import { decodeLatin1, base64Decode, bytesToHex } from '../../core/util.js';
import { EC_CURVE_OID_TO_NAME } from './_oids.js';

const PUBKEY_CLASS = {
  DSA: 'DSAPublicKey', Ed25519: 'Ed25519PublicKey', Ed448: 'Ed448PublicKey', X25519: 'X25519PublicKey', X448: 'X448PublicKey',
};

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}+00:00`;
}

/** Decodes a single certificate (PEM, hex, base64 or raw DER) into the same readable-fields text
 * the 'Parse X.509 certificate' op returns. Shared with parse_x509_certificate_bundles.js so a
 * bundle of concatenated PEM certs can be parsed one-by-one without duplicating this logic. */
export async function parseX509ToText(data, fmt) {
    let { der } = loadDerOrPem(data);
    if (fmt === 'Base64') der = base64Decode(decodeLatin1(data));
    const cert = parseX509(der);
    const { tbs } = cert;
    const { oid: pubOid, paramsNode } = splitSpki(tbs.spkiRaw);
    const kind = keyKindFromOid(pubOid);
    const out = [
      `Version: ${['v1', 'v2', 'v3'][tbs.version]}`,
      `Serial number: ${tbs.serial} (0x${tbs.serial.toString(16)})`,
      `Signature algorithm: ${cert.sigAlgo.name}`,
      `Issuer: ${nameToRfc4514(tbs.issuer)}`,
      `Subject: ${nameToRfc4514(tbs.subject)}`,
      `Not before: ${fmtDate(tbs.notBefore)}`,
      `Not after: ${fmtDate(tbs.notAfter)}`,
    ];
    const now = new Date();
    out.push('Validity: ' + (now > tbs.notAfter ? 'EXPIRED' : now < tbs.notBefore ? 'NOT YET VALID' : 'currently valid'));
    if (kind === 'RSA') {
      const { n, e } = rsaPublicNumbersFromSpkiDer(tbs.spkiRaw);
      out.push(`Public key: RSA ${n.toString(2).length} bit`, `  Exponent: ${e}`, `  Modulus: ${n.toString(16)}`);
    } else if (kind === 'EC') {
      const curveOid = decodeOid(paramsNode.value);
      out.push(`Public key: EC ${EC_CURVE_OID_TO_NAME[curveOid] || curveOid}`);
    } else {
      out.push(`Public key: ${PUBKEY_CLASS[kind] || kind || 'unknown'}`);
    }
    for (const ext of tbs.extensions) out.push(`Extension ${ext.name}${ext.critical ? ' (critical)' : ''}: ${formatExtensionValue(ext)}`);
    const [sha1, sha256] = await Promise.all([crypto.subtle.digest('SHA-1', der), crypto.subtle.digest('SHA-256', der)]);
    out.push(`SHA-1 fingerprint: ${bytesToHex(new Uint8Array(sha1), ':')}`, `SHA-256 fingerprint: ${bytesToHex(new Uint8Array(sha256), ':')}`);
    return out.join('\n');
}

module('Parse X.509 certificate', 'Decodes a certificate (PEM, hex or DER) into readable fields.', [A.select('Input format', ['PEM', 'DER Hex', 'Base64', 'Raw'])],
  (data, fmt) => parseX509ToText(data, fmt), { nondeterministic: true });
