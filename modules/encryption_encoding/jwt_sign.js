import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Encode, encodeUtf8 } from '../../core/util.js';
import { importPrivateKey } from './_pem.js';

const ALGS = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'None'];
const WC_HASH = { 256: 'SHA-256', 384: 'SHA-384', 512: 'SHA-512' };
const EC_CURVE = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };

function b64u(u8) { return base64Encode(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

module('JWT Sign', 'Signs the JSON claims in the input as a JWT. HS* use the key as a secret; RS*/ES* need a PEM private key.',
  [A.area('Private/Secret key', ''), A.select('Signing algorithm', ALGS)],
  async (t, key, alg) => {
    const header = { alg: alg !== 'None' ? alg : 'none', typ: 'JWT' };
    const signing = b64u(encodeUtf8(JSON.stringify(header))) + '.' + b64u(encodeUtf8(JSON.stringify(JSON.parse(t))));
    const data = encodeUtf8(signing);
    if (alg === 'None') return signing + '.';
    const hash = WC_HASH[alg.slice(2)];
    let sig;
    if (alg.startsWith('HS')) {
      const hk = await crypto.subtle.importKey('raw', encodeUtf8(key), { name: 'HMAC', hash }, false, ['sign']);
      sig = new Uint8Array(await crypto.subtle.sign('HMAC', hk, data));
    } else if (alg.startsWith('RS')) {
      const pk = await importPrivateKey(key, { name: 'RSASSA-PKCS1-v1_5', hash }, ['sign']);
      sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pk, data));
    } else {
      const pk = await importPrivateKey(key, { name: 'ECDSA', namedCurve: EC_CURVE[alg] }, ['sign']);
      sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash }, pk, data));
    }
    return signing + '.' + b64u(sig);
  }, { text: true, nondeterministic: true });
