import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, rsaPrivateNumbersFromPkcs8Der } from './_pki.js';
import { rsaesPkcs1Decrypt } from './_rsapkcs1.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { SCHEMES, MD_ALGORITHMS, oaepHash } from './rsa_encrypt.js';

module('RSA Decrypt', 'Decrypts an RSA ciphertext with an RSA private key (PEM).',
  [A.area('RSA Private Key (PEM)', ''), A.string('Key password', ''), A.select('Encryption Scheme', SCHEMES),
    A.select('Message Digest Algorithm', MD_ALGORITHMS), A.select('Input format', ['Raw', 'Hex'])],
  async (data, pem, pw, scheme, md, inputFormat) => {
    if (!pem.replace('-----BEGIN RSA PRIVATE KEY-----', '').length) throw new Error('Please enter a private key.');
    const info = await loadKeyInfo(pem, pw || undefined);
    if (info.kind !== 'RSA') throw new Error(`Expected an RSA key, got ${info.kind}`);
    const ct = inputFormat === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    if (scheme.startsWith('RSAES')) {
      const { n, d } = rsaPrivateNumbersFromPkcs8Der(info.der);
      return rsaesPkcs1Decrypt(n, d, ct);
    }
    const key = await crypto.subtle.importKey('pkcs8', info.der, { name: 'RSA-OAEP', hash: oaepHash(scheme, md) }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, ct);
    return new Uint8Array(pt);
  });
