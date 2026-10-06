import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, ecCurveFromParams, splitSpki, derSignatureToRaw } from './_pki.js';
import { parseHex, decodeLatin1, base64Decode } from '../../core/util.js';
import { FORMATS, detectSignatureFormat, signatureToAsn1Hex } from './ecdsa_signature_conversion.js';
import { HASHES } from './ecdsa_sign.js';

const FIELD_BYTES = { 'P-256': 32, 'P-384': 48, 'P-521': 66 };

function toBytes(str, format) {
  if (format === 'Hex') return parseHex(str);
  if (format === 'Base64') return base64Decode(str);
  return new Uint8Array([...str].map(c => c.charCodeAt(0) & 0xff));
}

module('ECDSA Verify', 'Verifies an ECDSA signature against the input with an EC public key (PEM). Leave "Signature" empty to use the combined arrangement instead: the signature is then the input (in any of the four signature formats) and the signed message comes from the "Message" argument.',
  [A.string('Signature (hex, DER)', ''), A.area('ECDSA Public Key (PEM)', ''), A.select('Message Digest Algorithm', HASHES),
    A.select('Input Format', FORMATS), A.area('Message', ''), A.select('Message format', ['Raw', 'Hex', 'Base64'])],
  async (data, sig, pem, md, inputFormat, message, messageFormat) => {
    if (!pem.replace('-----BEGIN PUBLIC KEY-----', '').length) throw new Error('Please enter a public key.');
    let sigHex, msgBytes;
    if (sig) {
      sigHex = sig;
      msgBytes = data;
    } else {
      const input = decodeLatin1(data).trim();
      sigHex = signatureToAsn1Hex(input, detectSignatureFormat(input, inputFormat));
      msgBytes = toBytes(message, messageFormat);
    }
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'EC') throw new Error('Provided key is not an EC key.');
    if (info.type !== 'public') throw new Error('Provided key is not a public key.');
    const { paramsNode } = splitSpki(info.der);
    const curve = ecCurveFromParams(paramsNode);
    const key = await crypto.subtle.importKey('spki', info.der, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
    const raw = derSignatureToRaw(parseHex(sigHex), FIELD_BYTES[curve]);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: md }, key, raw, msgBytes);
    return ok ? 'Verified OK' : 'Verification Failure';
  });
