import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Encode } from '../../core/util.js';
import { parseOneDer } from './_asn1.js';

function forgePem(der, label) {
  const lines = base64Encode(der).match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\r\n${lines.join('\r\n')}\r\n-----END ${label}-----\r\n`;
}

const b64uToBig = s => { let x = 0n; for (const c of atob(s.replace(/-/g, '+').replace(/_/g, '/'))) x = (x << 8n) | BigInt(c.charCodeAt(0)); return x; };
// node-forge's BigInteger as JSON.stringify sees it (26-bit little-endian limbs, t = limb count, s = sign).
function forgeBig(x) {
  const data = [];
  while (x > 0n) { data.push(Number(x & 0x3ffffffn)); x >>= 26n; }
  return { data, t: data.length, s: 0 };
}

module('Generate RSA Key Pair', 'Generates an RSA key pair via the browser’s native Web Crypto API. The input is ignored. Output Format: PEM (public SPKI + PKCS#1 private key), JSON (node-forge key objects) or DER (PKCS#1 private key).',
  [A.select('Key size (bits)', ['2048', '3072', '4096', '1024']), A.select('Output Format', ['PEM', 'JSON', 'DER'])],
  async (t, bits, outputFormat = 'PEM') => {
    const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: +bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey('spki', kp.publicKey), crypto.subtle.exportKey('pkcs8', kp.privateKey)]);
    const pkcs1 = parseOneDer(new Uint8Array(pkcs8)).children[2].value;
    if (outputFormat === 'DER') return pkcs1;
    if (outputFormat === 'JSON') {
      const j = await crypto.subtle.exportKey('jwk', kp.privateKey);
      const [n, e] = [forgeBig(b64uToBig(j.n)), forgeBig(b64uToBig(j.e))];
      const privateKey = { n, e, d: forgeBig(b64uToBig(j.d)), p: forgeBig(b64uToBig(j.p)), q: forgeBig(b64uToBig(j.q)), dP: forgeBig(b64uToBig(j.dp)), dQ: forgeBig(b64uToBig(j.dq)), qInv: forgeBig(b64uToBig(j.qi)) };
      return JSON.stringify({ privateKey, publicKey: { n, e } });
    }
    return forgePem(new Uint8Array(spki), 'PUBLIC KEY') + '\n' + forgePem(pkcs1, 'RSA PRIVATE KEY');
  }, { text: true, nondeterministic: true });
