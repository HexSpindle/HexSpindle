import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { toPem } from './_pem.js';

module('Generate RSA Key Pair', 'Generates an RSA key pair via the browser’s native Web Crypto API. The input is ignored.',
  [A.select('Key size (bits)', ['2048', '3072', '4096'])],
  async (t, bits) => {
    const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: +bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey('spki', kp.publicKey), crypto.subtle.exportKey('pkcs8', kp.privateKey)]);
    return toPem(new Uint8Array(pkcs8), 'PRIVATE KEY') + '\n' + toPem(new Uint8Array(spki), 'PUBLIC KEY');
  }, { text: true, nondeterministic: true });
