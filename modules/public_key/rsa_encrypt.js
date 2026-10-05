import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, rsaPublicNumbersFromSpkiDer } from './_pki.js';
import { rsaesPkcs1Encrypt } from './_rsapkcs1.js';
import { bytesToHex } from '../../core/util.js';

export const SCHEMES = ['RSA-OAEP', 'RSA-OAEP-256', 'RSAES-PKCS1-V1_5'];

module('RSA Encrypt', 'Encrypts the input with an RSA public key (PEM). Output is hex.',
  [A.area('RSA Public Key (PEM)', ''), A.select('Encryption Scheme', SCHEMES)],
  async (data, pem, scheme) => {
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'RSA') throw new Error(`Expected an RSA key, got ${info.kind}`);
    if (scheme.startsWith('RSAES')) {
      const { n, e } = rsaPublicNumbersFromSpkiDer(info.der);
      return bytesToHex(rsaesPkcs1Encrypt(n, e, data));
    }
    const hash = scheme === 'RSA-OAEP' ? 'SHA-1' : 'SHA-256';
    const key = await crypto.subtle.importKey('spki', info.der, { name: 'RSA-OAEP', hash }, false, ['encrypt']);
    const ct = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data);
    return bytesToHex(new Uint8Array(ct));
  });
