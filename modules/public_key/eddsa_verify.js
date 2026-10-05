import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, curve448Lib, curve448RawPublic } from './_pki.js';
import { parseHex } from '../../core/util.js';

module('EdDSA Verify', 'Verifies a hex Ed25519/Ed448 signature over the input with a public key (PEM) via the browser’s native Web Crypto API (Ed448 via the bundled @noble/curves, as browsers lack it).',
  [A.string('Signature (hex)', ''), A.area('Public Key (PEM)', '')],
  async (data, sig, pem) => {
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'Ed25519' && info.kind !== 'Ed448') throw new Error(`Expected an Ed25519/Ed448 key, got ${info.kind}`);
    if (info.kind === 'Ed448') {
      let ok448;
      try { ok448 = (await curve448Lib('Ed448')).verify(parseHex(sig), data, curve448RawPublic('Ed448', info.der)); } catch (e) { ok448 = false; }
      return ok448 ? 'Verified OK' : 'Verification FAILED';
    }
    const key = await crypto.subtle.importKey('spki', info.der, { name: info.kind }, false, ['verify']);
    const ok = await crypto.subtle.verify(info.kind, key, parseHex(sig), data);
    return ok ? 'Verified OK' : 'Verification FAILED';
  });
