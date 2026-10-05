import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, rsaPrivateNumbersFromPkcs8Der } from './_pki.js';
import { rsaesPkcs1Decrypt } from './_rsapkcs1.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { SCHEMES } from './rsa_encrypt.js';

module('RSA Decrypt', 'Decrypts hex ciphertext with an RSA private key (PEM).',
  [A.area('RSA Private Key (PEM)', ''), A.string('Key password', ''), A.select('Encryption Scheme', SCHEMES)],
  async (data, pem, pw, scheme) => {
    const info = await loadKeyInfo(pem, pw || undefined);
    if (info.kind !== 'RSA') throw new Error(`Expected an RSA key, got ${info.kind}`);
    const ct = parseHex(decodeLatin1(data));
    if (scheme.startsWith('RSAES')) {
      const { n, d } = rsaPrivateNumbersFromPkcs8Der(info.der);
      return rsaesPkcs1Decrypt(n, d, ct);
    }
    const hash = scheme === 'RSA-OAEP' ? 'SHA-1' : 'SHA-256';
    const key = await crypto.subtle.importKey('pkcs8', info.der, { name: 'RSA-OAEP', hash }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, ct);
    return new Uint8Array(pt);
  });
