import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, splitSpki, splitPkcs8, ecCurveFromParams } from './_pki.js';
import { base64Encode } from '../../core/util.js';

function base64Url(bytes) { return base64Encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

/** RFC 7638 JWK thumbprint (KJUR.jws.JWS.getJWKthumbprint). */
async function jwkThumbprint(jwk) {
  const canon = jwk.kty === 'RSA'
    ? `{"e":"${jwk.e}","kty":"RSA","n":"${jwk.n}"}`
    : `{"crv":"${jwk.crv}","kty":"EC","x":"${jwk.x}","y":"${jwk.y}"}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon));
  return base64Url(new Uint8Array(digest));
}

/** One PEM block -> the JWK object, with jsrsasign's key order. */
async function pemBlockToJwk(pem, header) {
  if (header === '-----BEGIN RSA PUBLIC KEY-----') throw new Error('Unsupported RSA public key format. Only PKCS#8 is supported.');
  const info = await loadKeyInfo(pem);
  if (info.kind === 'DSA') throw new Error('DSA keys are not supported for JWK');
  const isPriv = info.type === 'private';
  if (info.kind === 'RSA') {
    const algo = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    const key = await crypto.subtle.importKey(isPriv ? 'pkcs8' : 'spki', info.der, algo, true, isPriv ? ['sign'] : ['verify']);
    const j = await crypto.subtle.exportKey('jwk', key);
    const jwk = { kty: 'RSA', n: j.n, e: j.e };
    if (isPriv) Object.assign(jwk, { d: j.d, p: j.p, q: j.q, dp: j.dp, dq: j.dq, qi: j.qi });
    return jwk;
  }
  if (info.kind === 'EC') {
    const curve = ecCurveFromParams(isPriv ? splitPkcs8(info.der).paramsNode : splitSpki(info.der).paramsNode);
    const key = await crypto.subtle.importKey(isPriv ? 'pkcs8' : 'spki', info.der, { name: 'ECDSA', namedCurve: curve }, true, isPriv ? ['sign'] : ['verify']);
    const j = await crypto.subtle.exportKey('jwk', key);
    const jwk = { kty: 'EC', crv: j.crv, x: j.x, y: j.y };
    if (isPriv) jwk.d = j.d;
    return jwk;
  }
  throw new Error(`Unsupported key algorithm: ${info.kind}`);
}

module('PEM to JWK', 'Converts every PEM key or certificate in the input to a JSON Web Key, one per line.',
  [A.boolean('Set key ID (kid) to RFC 7638 thumbprint', false)],
  async (input, setKeyId) => {
    let output = '';
    let match;
    const regex = /-----BEGIN ([A-Z][A-Z ]+[A-Z])-----/g;
    while ((match = regex.exec(input)) !== null) {
      const indexBase64 = match.index + match[0].length;
      const header = input.substring(match.index, indexBase64);
      const footer = `-----END ${match[1]}-----`;
      const indexFooter = input.indexOf(footer, indexBase64);
      if (indexFooter === -1) throw new Error(`PEM footer '${footer}' not found`);

      const pem = input.substring(match.index, indexFooter + footer.length);
      if (match[1].indexOf('KEY') === -1 && match[1] !== 'CERTIFICATE') throw new Error(`Unsupported PEM type '${match[1]}'`);

      const jwk = await pemBlockToJwk(pem, header);
      if (setKeyId) jwk.kid = await jwkThumbprint(jwk);
      if (output.length > 0) output += '\n';
      output += JSON.stringify(jwk);
    }
    return output;
  }, { text: true });
