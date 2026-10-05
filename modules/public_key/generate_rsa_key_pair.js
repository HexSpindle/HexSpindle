import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Encode } from '../../core/util.js';
import { parseOneDer } from './_asn1.js';

function forgePem(der, label) {
  const lines = base64Encode(der).match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\r\n${lines.join('\r\n')}\r\n-----END ${label}-----\r\n`;
}

module('Generate RSA Key Pair', 'Generates an RSA key pair via the browser’s native Web Crypto API. The input is ignored.',
  [A.select('Key size (bits)', ['2048', '3072', '4096', '1024'])],
  async (t, bits) => {
    const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: +bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey('spki', kp.publicKey), crypto.subtle.exportKey('pkcs8', kp.privateKey)]);
    const pkcs1 = parseOneDer(new Uint8Array(pkcs8)).children[2].value;
    return forgePem(new Uint8Array(spki), 'PUBLIC KEY') + '\n' + forgePem(pkcs1, 'RSA PRIVATE KEY');
  }, { text: true, nondeterministic: true });
