import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitPkcs8, rawSignatureToDer } from './_pki.js';
import { OUT_FORMATS, asn1HexToFormat } from './ecdsa_signature_conversion.js';
import { bytesToHex } from '../../core/util.js';

export const HASHES = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'];

module('ECDSA Sign', 'Signs the input with an EC private key (PEM). The signature is returned as ASN.1 DER hex, the fixed-width P1363 raw hex (r||s), a JSON Web Signature (base64url) or a {r,s} JSON object.',
  [A.area('ECDSA Private Key (PEM)', ''), A.string('Key password', ''), A.select('Message Digest Algorithm', HASHES),
    A.select('Output Format', OUT_FORMATS)],
  async (data, pem, pw, md, outputFormat) => {
    if (!pem.replace('-----BEGIN EC PRIVATE KEY-----', '').length) throw new Error('Please enter a private key.');
    const info = await loadKeyInfo(pem, pw || undefined);
    if (info.kind !== 'EC') throw new Error('Provided key is not an EC key.');
    if (info.type !== 'private') throw new Error('Provided key is not a private key.');
    const { paramsNode } = splitPkcs8(info.der);
    const curve = ecCurveFromParams(paramsNode);
    const key = await crypto.subtle.importKey('pkcs8', info.der, { name: 'ECDSA', namedCurve: curve }, false, ['sign']);
    const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: md }, key, data));
    return asn1HexToFormat(bytesToHex(rawSignatureToDer(raw)), outputFormat);
  }, { nondeterministic: true });
