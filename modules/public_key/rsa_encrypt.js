import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, rsaPublicNumbersFromSpkiDer } from './_pki.js';
import { rsaesPkcs1Encrypt } from './_rsapkcs1.js';
import { bytesToHex } from '../../core/util.js';

export const SCHEMES = ['RSA-OAEP', 'RSA-OAEP-256', 'RSAES-PKCS1-V1_5'];
export const MD_ALGORITHMS = ['SHA-1', 'MD5', 'SHA-256', 'SHA-384', 'SHA-512'];

export function oaepHash(scheme, md) {
  const hash = scheme === 'RSA-OAEP-256' ? 'SHA-256' : md;
  if (hash === 'MD5') throw new Error('RSA-OAEP with MD5 is not supported');
  return hash;
}

module('RSA Encrypt', 'Encrypts the input with an RSA public key (PEM), using RSA-OAEP or RSAES-PKCS1-v1_5 padding.',
  [A.area('RSA Public Key (PEM)', ''), A.select('Encryption Scheme', SCHEMES),
    A.select('Message Digest Algorithm', MD_ALGORITHMS), A.select('Output format', ['Raw', 'Hex'])],
  async (data, pem, scheme, md, outputFormat) => {
    if (!pem.replace('-----BEGIN RSA PUBLIC KEY-----', '').length) throw new Error('Please enter a public key.');
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'RSA') throw new Error(`Expected an RSA key, got ${info.kind}`);
    let out;
    if (scheme.startsWith('RSAES')) {
      const { n, e } = rsaPublicNumbersFromSpkiDer(info.der);
      out = rsaesPkcs1Encrypt(n, e, data);
    } else {
      const key = await crypto.subtle.importKey('spki', info.der, { name: 'RSA-OAEP', hash: oaepHash(scheme, md) }, false, ['encrypt']);
      out = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data));
    }
    return outputFormat === 'Hex' ? bytesToHex(out) : out;
  }, { nondeterministic: true });
