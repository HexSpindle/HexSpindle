import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { toPem } from './_pem.js';

module('Generate ECDSA Key Pair', 'Generates an elliptic-curve key pair via the browser’s native Web Crypto API. The input is ignored.',
  [A.select('Curve', ['P-256', 'P-384', 'P-521'])],
  async (t, curve) => {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: curve }, true, ['sign', 'verify']);
    const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey('spki', kp.publicKey), crypto.subtle.exportKey('pkcs8', kp.privateKey)]);
    return toPem(new Uint8Array(pkcs8), 'PRIVATE KEY') + '\n' + toPem(new Uint8Array(spki), 'PUBLIC KEY');
  }, { text: true, nondeterministic: true });
