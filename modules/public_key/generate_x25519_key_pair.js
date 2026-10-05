import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { toPem } from './_pem.js';
import { isCurve448, generateCurve448 } from './_pki.js';

module('Generate X25519 / X448 Key Pair', 'Generates a key pair for Diffie-Hellman key exchange over Curve25519 or Curve448, via the browser’s native Web Crypto API (448 via the bundled @noble/curves, as browsers lack it). The input is ignored.',
  [A.select('Curve', ['X25519', 'X448'])],
  async (data, curve) => {
    if (isCurve448(curve)) {
      const { spki, pkcs8 } = await generateCurve448(curve);
      return toPem(spki, 'PUBLIC KEY') + toPem(pkcs8, 'PRIVATE KEY');
    }
    const kp = await crypto.subtle.generateKey({ name: curve }, true, ['deriveBits']);
    const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey('spki', kp.publicKey), crypto.subtle.exportKey('pkcs8', kp.privateKey)]);
    return toPem(new Uint8Array(spki), 'PUBLIC KEY') + toPem(new Uint8Array(pkcs8), 'PRIVATE KEY');
  }, { nondeterministic: true });
