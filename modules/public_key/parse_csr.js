import { module } from './_cat.js';
import { loadDerOrPem } from './_pem.js';
import { parseCsr, nameToRfc4514, formatExtensionValue } from './_x509.js';
import { keyKindFromOid, splitSpki, rsaPublicNumbersFromSpkiDer, verifyX509Signature } from './_pki.js';

const PUBKEY_CLASS = {
  RSA: 'RSAPublicKey', EC: 'EllipticCurvePublicKey', DSA: 'DSAPublicKey',
  Ed25519: 'Ed25519PublicKey', Ed448: 'Ed448PublicKey', X25519: 'X25519PublicKey', X448: 'X448PublicKey',
};

module('Parse CSR', 'Decodes a PKCS#10 certificate signing request (PEM or DER).', [],
  async (data) => {
    const { der } = loadDerOrPem(data);
    const csr = parseCsr(der);
    const { oid } = splitSpki(csr.spkiRaw);
    const kind = keyKindFromOid(oid);
    let sigValid;
    try { sigValid = await verifyX509Signature(csr.spkiRaw, csr.sigAlgo.oid, csr.infoRaw, csr.signature); }
    catch { sigValid = false; }
    const pubLabel = PUBKEY_CLASS[kind] || kind || 'unknown';
    const out = [
      `Subject: ${nameToRfc4514(csr.subject)}`,
      `Signature algorithm: ${csr.sigAlgo.name}`,
      `Signature valid: ${sigValid ? 'True' : 'False'}`,
      `Public key: ${pubLabel}${kind === 'RSA' ? ` ${rsaPublicNumbersFromSpkiDer(csr.spkiRaw).n.toString(2).length} bit` : ''}`,
    ];
    for (const ext of csr.extensions) out.push(`Extension ${ext.name}: ${formatExtensionValue(ext)}`);
    return out.join('\n');
  });
