import { module } from './_cat.js';
import { loadKeyInfo, splitSpki, splitPkcs8, ecCurveFromParams } from './_pki.js';

module('PEM to JWK', 'Converts a PEM RSA/EC key (private or public) to a JSON Web Key.', [],
  async (t) => {
    const info = await loadKeyInfo(t);
    const isPriv = info.type === 'private';
    if (info.kind === 'RSA') {
      const algo = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
      const key = await crypto.subtle.importKey(isPriv ? 'pkcs8' : 'spki', info.der, algo, true, isPriv ? ['sign'] : ['verify']);
      const j = await crypto.subtle.exportKey('jwk', key);
      const jwk = { kty: 'RSA', n: j.n, e: j.e };
      if (isPriv) Object.assign(jwk, { d: j.d, p: j.p, q: j.q, dp: j.dp, dq: j.dq, qi: j.qi });
      return JSON.stringify(jwk, null, 2);
    }
    if (info.kind === 'EC') {
      const curve = ecCurveFromParams(isPriv ? splitPkcs8(info.der).paramsNode : splitSpki(info.der).paramsNode);
      const key = await crypto.subtle.importKey(isPriv ? 'pkcs8' : 'spki', info.der, { name: 'ECDSA', namedCurve: curve }, true, isPriv ? ['sign'] : ['verify']);
      const j = await crypto.subtle.exportKey('jwk', key);
      const jwk = { kty: 'EC', crv: j.crv, x: j.x, y: j.y };
      if (isPriv) jwk.d = j.d;
      return JSON.stringify(jwk, null, 2);
    }
    throw new Error('Only RSA and EC keys are supported');
  }, { text: true });
