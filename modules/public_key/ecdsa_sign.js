import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitPkcs8, rawSignatureToDer } from './_pki.js';
import { bytesToHex } from '../../core/util.js';

export const HASHES = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'];

module('ECDSA Sign', 'Signs the input with an EC private key (PEM). Output is the DER signature as hex.',
  [A.area('ECDSA Private Key (PEM)', ''), A.string('Key password', ''), A.select('Message Digest Algorithm', HASHES)],
  async (data, pem, pw, md) => {
    const info = await loadKeyInfo(pem, pw || undefined);
    if (info.kind !== 'EC') throw new Error(`Expected an EC key, got ${info.kind}`);
    const { paramsNode } = splitPkcs8(info.der);
    const curve = ecCurveFromParams(paramsNode);
    const key = await crypto.subtle.importKey('pkcs8', info.der, { name: 'ECDSA', namedCurve: curve }, false, ['sign']);
    const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: md }, key, data));
    return bytesToHex(rawSignatureToDer(raw));
  }, { nondeterministic: true });
