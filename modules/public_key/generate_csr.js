import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitPkcs8, rawSignatureToDer } from './_pki.js';
import { derSequence, derSet, derInteger, derOid, derBitString, derNull, derContextConstructed } from './_asn1.js';
import { buildName, buildExtensionTLV, buildSanValue } from './_x509.js';
import { toPem } from './_pem.js';
import { NAME_OID } from './_oids.js';

const SIG_OID = {
  RSA: { 'SHA-256': '1.2.840.113549.1.1.11', 'SHA-384': '1.2.840.113549.1.1.12', 'SHA-512': '1.2.840.113549.1.1.13' },
  EC: { 'SHA-256': '1.2.840.10045.4.3.2', 'SHA-384': '1.2.840.10045.4.3.3', 'SHA-512': '1.2.840.10045.4.3.4' },
};

async function signWith(info, digest, data) {
  let sigOid, importAlgo, signAlgo;
  if (info.kind === 'RSA') {
    importAlgo = { name: 'RSASSA-PKCS1-v1_5', hash: digest };
    signAlgo = 'RSASSA-PKCS1-v1_5';
    sigOid = SIG_OID.RSA[digest];
  } else if (info.kind === 'EC') {
    const curve = ecCurveFromParams(splitPkcs8(info.der).paramsNode);
    importAlgo = { name: 'ECDSA', namedCurve: curve };
    signAlgo = { name: 'ECDSA', hash: digest };
    sigOid = SIG_OID.EC[digest];
  } else if (info.kind === 'Ed25519' || info.kind === 'Ed448') {
    importAlgo = { name: info.kind };
    signAlgo = info.kind;
    sigOid = info.kind === 'Ed25519' ? '1.3.101.112' : '1.3.101.113';
  } else {
    throw new Error(`Unsupported private key type for signing: ${info.kind}`);
  }
  const key = await crypto.subtle.importKey('pkcs8', info.der, importAlgo, false, ['sign']);
  let sig = new Uint8Array(await crypto.subtle.sign(signAlgo, key, data));
  if (info.kind === 'EC') sig = rawSignatureToDer(sig);
  const hasParams = info.kind === 'RSA';
  const sigAlgoId = derSequence([derOid(sigOid), ...(hasParams ? [derNull()] : [])]);
  return { sigAlgoId, signature: sig };
}

module('Generate CSR', 'Creates a PKCS#10 certificate signing request from a private key (PEM) and subject details.',
  [A.area('Private Key (PEM)', ''), A.string('Key password', ''), A.string('Common Name (CN)', 'example.com'), A.string('Organization (O)', ''),
    A.string('Organizational Unit (OU)', ''), A.string('Country (C, 2 letters)', ''), A.string('State/Province (ST)', ''), A.string('Locality (L)', ''),
    A.string('Subject Alternative Names (comma-separated DNS names)', ''), A.select('Signature digest', ['SHA-256', 'SHA-384', 'SHA-512'])],
  async (data, pem, pw, cn, o, ou, c, st, l, sans, digest) => {
    const info = await loadKeyInfo(pem, pw || undefined);
    const attrs = [{ oid: NAME_OID.CN, value: cn }];
    for (const [oid, val] of [[NAME_OID.O, o], [NAME_OID.OU, ou], [NAME_OID.C, c], [NAME_OID.ST, st], [NAME_OID.L, l]]) {
      if (val) attrs.push({ oid, value: val, printable: oid === NAME_OID.C });
    }
    const subject = buildName(attrs);
    const spkiNode = await (async () => {
      let pubAlgo, usages = ['verify'];
      if (info.kind === 'RSA') pubAlgo = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
      else if (info.kind === 'EC') pubAlgo = { name: 'ECDSA', namedCurve: ecCurveFromParams(splitPkcs8(info.der).paramsNode) };
      else pubAlgo = { name: info.kind };
      const privKey = await crypto.subtle.importKey('pkcs8', info.der, pubAlgo, true, ['sign']);
      const jwk = await crypto.subtle.exportKey('jwk', privKey);
      delete jwk.d; delete jwk.p; delete jwk.q; delete jwk.dp; delete jwk.dq; delete jwk.qi;
      jwk.key_ops = usages;
      const pubKey = await crypto.subtle.importKey('jwk', jwk, pubAlgo, true, usages);
      return new Uint8Array(await crypto.subtle.exportKey('spki', pubKey));
    })();

    let attrsTLV = [];
    if (sans.trim()) {
      const names = sans.split(',').map(s => s.trim()).filter(Boolean);
      const ext = buildExtensionTLV('2.5.29.17', false, buildSanValue(names));
      const extReqAttr = derSequence([derOid('1.2.840.113549.1.9.14'), derSet([derSequence([ext])])]);
      attrsTLV = [extReqAttr];
    }
    const attributes = derContextConstructed(0, attrsTLV);
    const certReqInfo = derSequence([derInteger(0), subject, spkiNode, attributes]);
    const { sigAlgoId, signature } = await signWith(info, digest, certReqInfo);
    const csr = derSequence([certReqInfo, sigAlgoId, derBitString(signature, 0)]);
    return toPem(csr, 'CERTIFICATE REQUEST');
  }, { nondeterministic: true });
