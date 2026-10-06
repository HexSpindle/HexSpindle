import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Decode, encodeUtf8, decodeUtf8, bytesEqual } from '../../core/util.js';
import { importPublicKey } from './_pem.js';

const WC_HASH = { 256: 'SHA-256', 384: 'SHA-384', 512: 'SHA-512' };
const EC_CURVE = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };

module('JWT Verify', 'Verifies a JWT signature. HS* use the key as a secret; RS*/ES* need a PEM public key. Outputs the payload on success.',
  [A.area('Public/Secret key', '')],
  async (t, key) => {
    const [h64, p64, s64] = t.trim().split('.');
    const header = JSON.parse(decodeUtf8(base64Decode(h64)));
    const alg = header.alg;
    const data = encodeUtf8(h64 + '.' + p64);
    const sig = base64Decode(s64);
    if (alg === 'none') throw new Error('Unsigned token (alg=none)');
    const hash = WC_HASH[alg.slice(2)];
    let ok;
    if (alg.startsWith('HS')) {
      const hk = await crypto.subtle.importKey('raw', encodeUtf8(key), { name: 'HMAC', hash }, false, ['sign']);
      const expected = new Uint8Array(await crypto.subtle.sign('HMAC', hk, data));
      ok = bytesEqual(expected, sig);
    } else if (alg.startsWith('RS')) {
      const pub = await importPublicKey(key, { name: 'RSASSA-PKCS1-v1_5', hash }, ['verify']);
      ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pub, sig, data);
    } else {
      const pub = await importPublicKey(key, { name: 'ECDSA', namedCurve: EC_CURVE[alg] }, ['verify']);
      ok = await crypto.subtle.verify({ name: 'ECDSA', hash }, pub, sig, data);
    }
    if (!ok) throw new Error('Invalid signature');
    return JSON.stringify(JSON.parse(decodeUtf8(base64Decode(p64))), null, 4);
  }, { text: true });
