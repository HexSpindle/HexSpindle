import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, curve448Lib, curve448RawPrivate } from './_pki.js';
import { bytesToHex } from '../../core/util.js';

module('EdDSA Sign', 'Signs the input with an Ed25519 or Ed448 private key (PEM) via the browser’s native Web Crypto API (Ed448 via the bundled @noble/curves, as browsers lack it). Output is hex.',
  [A.area('Private Key (PEM)', ''), A.string('Key password', '')],
  async (data, pem, pw) => {
    const info = await loadKeyInfo(pem, pw || undefined);
    if (info.kind !== 'Ed25519' && info.kind !== 'Ed448') throw new Error(`Expected an Ed25519/Ed448 key, got ${info.kind}`);
    if (info.kind === 'Ed448') return bytesToHex((await curve448Lib('Ed448')).sign(data, curve448RawPrivate('Ed448', info.der)));
    const key = await crypto.subtle.importKey('pkcs8', info.der, { name: info.kind }, false, ['sign']);
    const sig = await crypto.subtle.sign(info.kind, key, data);
    return bytesToHex(new Uint8Array(sig));
  });
