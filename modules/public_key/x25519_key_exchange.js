import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo } from './_pki.js';
import { bytesToHex } from '../../core/util.js';

module('X25519 / X448 Key Exchange', 'Derives a shared secret from your private key (PEM) and the other party’s public key (PEM) via the browser’s native Web Crypto API - the key agreement used in TLS 1.3, Signal, WireGuard, SSH.',
  [A.select('Curve', ['X25519', 'X448']), A.area('Your private key (PEM)', ''), A.area('Their public key (PEM)', '')],
  async (data, curve, privPem, pubPem) => {
    const privInfo = await loadKeyInfo(privPem);
    const pubInfo = await loadKeyInfo(pubPem);
    const kind = privInfo.kind;
    if (kind !== 'X25519' && kind !== 'X448') throw new Error(`Expected an X25519/X448 private key, got ${kind}`);
    const priv = await crypto.subtle.importKey('pkcs8', privInfo.der, { name: kind }, false, ['deriveBits']);
    const pub = await crypto.subtle.importKey('spki', pubInfo.der, { name: kind }, false, []);
    const bits = kind === 'X25519' ? 256 : 448;
    const secret = await crypto.subtle.deriveBits({ name: kind, public: pub }, priv, bits);
    return bytesToHex(new Uint8Array(secret));
  });
