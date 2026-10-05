import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitSpki, derSignatureToRaw } from './_pki.js';
import { parseHex } from '../../core/util.js';
import { HASHES } from './ecdsa_sign.js';

const FIELD_BYTES = { 'P-256': 32, 'P-384': 48, 'P-521': 66 };

module('ECDSA Verify', 'Verifies a DER hex ECDSA signature over the input with an EC public key (PEM).',
  [A.string('Signature (hex, DER)', ''), A.area('ECDSA Public Key (PEM)', ''), A.select('Message Digest Algorithm', HASHES)],
  async (data, sig, pem, md) => {
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'EC') throw new Error(`Expected an EC key, got ${info.kind}`);
    const { paramsNode } = splitSpki(info.der);
    const curve = ecCurveFromParams(paramsNode);
    const key = await crypto.subtle.importKey('spki', info.der, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
    const raw = derSignatureToRaw(parseHex(sig), FIELD_BYTES[curve]);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: md }, key, raw, data);
    return ok ? 'Verified OK' : 'Verification FAILED';
  });
