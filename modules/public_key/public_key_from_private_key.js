import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitPkcs8 } from './_pki.js';
import { toPem } from './_pem.js';

module('Public Key from Private Key', 'Derives the PEM public key from a PEM private key.', [A.string('Key password', '')],
  async (t, pw) => {
    const info = await loadKeyInfo(t, pw || undefined);
    if (info.type !== 'private') throw new Error('Not a private key');
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
