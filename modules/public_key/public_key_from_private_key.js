import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitPkcs8, isCurve448, curve448SpkiFromPkcs8, dsaPrivateNumbersFromPkcs8Der, buildDsaSpkiDer } from './_pki.js';
import { modExp } from './_bignum.js';
import { toPem } from './_pem.js';

module('Public Key from Private Key', 'Derives the PEM public key (SPKI, as `openssl pkey -pubout`) from a PEM private key: PKCS#8 (optionally encrypted) or traditional RSA/EC/DSA PRIVATE KEY. RSA, EC, DSA, Ed25519/Ed448 and X25519/X448 are supported.', [A.string('Key password', '')],
  async (t, pw) => {
    const info = await loadKeyInfo(t, pw || undefined);
    if (info.type !== 'private') throw new Error('Not a private key');
    if (info.kind === 'DSA') {
      const { p, q, g, x } = dsaPrivateNumbersFromPkcs8Der(info.der);
      return toPem(buildDsaSpkiDer(p, q, g, modExp(g, x, p)), 'PUBLIC KEY');
    }
    if (isCurve448(info.kind)) return toPem(await curve448SpkiFromPkcs8(info.kind, info.der), 'PUBLIC KEY');
    let algo, usages;
    if (info.kind === 'RSA') { algo = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }; usages = ['sign']; }
    else if (info.kind === 'EC') { algo = { name: 'ECDSA', namedCurve: ecCurveFromParams(splitPkcs8(info.der).paramsNode) }; usages = ['sign']; }
    else if (info.kind === 'Ed25519' || info.kind === 'Ed448') { algo = { name: info.kind }; usages = ['sign']; }
    else if (info.kind === 'X25519' || info.kind === 'X448') { algo = { name: info.kind }; usages = ['deriveBits']; }
    else throw new Error(`Unsupported key type: ${info.kind}`);
    const key = await crypto.subtle.importKey('pkcs8', info.der, algo, true, usages);
    const jwk = await crypto.subtle.exportKey('jwk', key);
    delete jwk.d; delete jwk.p; delete jwk.q; delete jwk.dp; delete jwk.dq; delete jwk.qi;
    jwk.key_ops = info.kind === 'RSA' || info.kind === 'EC' ? ['verify'] : [];
    const pubKey = await crypto.subtle.importKey('jwk', jwk, algo, true, jwk.key_ops);
    return toPem(new Uint8Array(await crypto.subtle.exportKey('spki', pubKey)), 'PUBLIC KEY');
  }, { text: true });
