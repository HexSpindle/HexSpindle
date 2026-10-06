import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { toPem } from './_pem.js';

const b64uToHex = s => [...atob(s.replace(/-/g, '+').replace(/_/g, '/'))].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

module('Generate ECDSA Key Pair', 'Generates an elliptic-curve key pair via the browser’s native Web Crypto API. The input is ignored. Output Format: PEM (SPKI + PKCS#8), DER (the private key scalar as hex) or JWK.',
  [A.select('Curve', ['P-256', 'P-384', 'P-521']), A.select('Output Format', ['PEM', 'DER', 'JWK'])],
  async (t, curve, outputFormat = 'PEM') => {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: curve }, true, ['sign', 'verify']);
    if (outputFormat === 'DER' || outputFormat === 'JWK') {
      const j = await crypto.subtle.exportKey('jwk', kp.privateKey);
      if (outputFormat === 'DER') return b64uToHex(j.d);
      const pub = { kty: 'EC', crv: j.crv, x: j.x, y: j.y };
      return JSON.stringify({ keys: [{ ...pub, d: j.d, key_ops: ['sign'], kid: 'PrivateKey' }, { ...pub, key_ops: ['verify'], kid: 'PublicKey' }] }, null, 4);
    }
    const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey('spki', kp.publicKey), crypto.subtle.exportKey('pkcs8', kp.privateKey)]);
    return toPem(new Uint8Array(spki), 'PUBLIC KEY') + '\n' + toPem(new Uint8Array(pkcs8), 'PRIVATE KEY');
  }, { text: true, nondeterministic: true });
