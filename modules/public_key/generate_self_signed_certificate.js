import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitPkcs8, rawSignatureToDer } from './_pki.js';
import { derSequence, derInteger, derOid, derBitString, derNull, derContext, derTime } from './_asn1.js';
import { buildName, buildExtensionTLV, buildSanValue, buildBasicConstraintsValue } from './_x509.js';
import { toPem } from './_pem.js';
import { NAME_OID } from './_oids.js';
import { randomBigInt } from './_bignum.js';

const SIG_OID = {
  RSA: { 'SHA-256': '1.2.840.113549.1.1.11', 'SHA-384': '1.2.840.113549.1.1.12', 'SHA-512': '1.2.840.113549.1.1.13' },
  EC: { 'SHA-256': '1.2.840.10045.4.3.2', 'SHA-384': '1.2.840.10045.4.3.3', 'SHA-512': '1.2.840.10045.4.3.4' },
};

async function derivePublicSpki(info) {
  let pubAlgo;
  if (info.kind === 'RSA') pubAlgo = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  else if (info.kind === 'EC') pubAlgo = { name: 'ECDSA', namedCurve: ecCurveFromParams(splitPkcs8(info.der).paramsNode) };
  else pubAlgo = { name: info.kind };
  const privKey = await crypto.subtle.importKey('pkcs8', info.der, pubAlgo, true, ['sign']);
  const jwk = await crypto.subtle.exportKey('jwk', privKey);
  delete jwk.d; delete jwk.p; delete jwk.q; delete jwk.dp; delete jwk.dq; delete jwk.qi;
  jwk.key_ops = ['verify'];
  const pubKey = await crypto.subtle.importKey('jwk', jwk, pubAlgo, true, ['verify']);
  return new Uint8Array(await crypto.subtle.exportKey('spki', pubKey));
}

function sigAlgoIdFor(kind, digest) {
  if (kind === 'RSA') return derSequence([derOid(SIG_OID.RSA[digest]), derNull()]);
  if (kind === 'EC') return derSequence([derOid(SIG_OID.EC[digest])]);
  if (kind === 'Ed25519') return derSequence([derOid('1.3.101.112')]);
  if (kind === 'Ed448') return derSequence([derOid('1.3.101.113')]);
  throw new Error(`Unsupported private key type for signing: ${kind}`);
}

async function signWith(info, digest, data) {
  let importAlgo, signAlgo;
  if (info.kind === 'RSA') { importAlgo = { name: 'RSASSA-PKCS1-v1_5', hash: digest }; signAlgo = 'RSASSA-PKCS1-v1_5'; }
  else if (info.kind === 'EC') {
    const curve = ecCurveFromParams(splitPkcs8(info.der).paramsNode);
    importAlgo = { name: 'ECDSA', namedCurve: curve };
    signAlgo = { name: 'ECDSA', hash: digest };
  } else if (info.kind === 'Ed25519' || info.kind === 'Ed448') { importAlgo = { name: info.kind }; signAlgo = info.kind; }
  else throw new Error(`Unsupported private key type for signing: ${info.kind}`);
  const key = await crypto.subtle.importKey('pkcs8', info.der, importAlgo, false, ['sign']);
  let sig = new Uint8Array(await crypto.subtle.sign(signAlgo, key, data));
  if (info.kind === 'EC') sig = rawSignatureToDer(sig);
  return sig;
}

module('Generate Self-Signed Certificate', 'Creates a self-signed X.509 certificate from a private key (PEM) and subject details - handy for local dev/test TLS.',
  [A.area('Private Key (PEM)', ''), A.string('Key password', ''), A.string('Common Name (CN)', 'localhost'), A.string('Organization (O)', ''),
    A.number('Valid for (days)', 365, 1, 36500), A.string('Subject Alternative Names (comma-separated DNS names)', 'localhost'), A.select('Signature digest', ['SHA-256', 'SHA-384', 'SHA-512'])],
  async (data, pem, pw, cn, o, days, sans, digest) => {
    const info = await loadKeyInfo(pem, pw || undefined);
    const attrs = [{ oid: NAME_OID.CN, value: cn }];
    if (o) attrs.push({ oid: NAME_OID.O, value: o });
    const name = buildName(attrs);
    const spkiDer = await derivePublicSpki(info);

    const now = new Date();
    const notAfter = new Date(now.getTime() + days * 86400000);
    const serial = randomBigInt(159); // random_serial_number(): a positive 160-bit-ish integer

    const extTLVs = [];
    if (sans.trim()) {
      const names = sans.split(',').map(s => s.trim()).filter(Boolean);
      extTLVs.push(buildExtensionTLV('2.5.29.17', false, buildSanValue(names)));
    }
    extTLVs.push(buildExtensionTLV('2.5.29.19', true, buildBasicConstraintsValue(true, null)));
    const extensions = derContext(3, [derSequence(extTLVs)]);
    const sigAlgoId = sigAlgoIdFor(info.kind, digest);

    const tbs = derSequence([
      derContext(0, [derInteger(2)]), // version v3
      derInteger(serial),
      sigAlgoId,
      name, // issuer == subject (self-signed)
      derSequence([derTime(now), derTime(notAfter)]),
      name,
      spkiDer,
      extensions,
    ]);
    const signature = await signWith(info, digest, tbs);
    const cert = derSequence([tbs, sigAlgoId, derBitString(signature, 0)]);
    return toPem(cert, 'CERTIFICATE');
  }, { nondeterministic: true });
