import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, rsaPublicNumbersFromSpkiDer } from './_pki.js';
import { pkcs1v15Verify, pssVerify } from './_rsasign.js';
import { parseHex, base64Decode } from '../../core/util.js';

function toBytes(str, format) {
  if (format === 'Hex') return parseHex(str);
  if (format === 'Base64') return base64Decode(str);
  return new Uint8Array([...str].map(c => c.charCodeAt(0) & 0xff));
}

module('RSA Verify', 'Verifies an RSA signature over the input with an RSA public key. Leave "Signature (hex)" empty to use the combined arrangement instead: the signature is then the raw input and the signed message comes from the "Message" argument.',
  [A.string('Signature (hex)', ''), A.area('RSA Public Key (PEM)', ''),
    A.select('Message Digest Algorithm', ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512', 'MD5']),
    A.select('Padding', ['PKCS#1 v1.5', 'PSS']), A.area('Message', ''), A.select('Message format', ['Raw', 'Hex', 'Base64'])],
  async (data, sig, pem, md, paddingKind, message, messageFormat) => {
    if (!pem.replace('-----BEGIN RSA PUBLIC KEY-----', '').length) throw new Error('Please enter a public key.');
    const sigBytes = sig ? parseHex(sig) : data;
    const msgBytes = sig ? data : toBytes(message, messageFormat);
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'RSA') throw new Error(`Expected an RSA key, got ${info.kind}`);
    const { n, e } = rsaPublicNumbersFromSpkiDer(info.der);
    const ok = paddingKind.startsWith('PKCS') ? await pkcs1v15Verify(n, e, md, msgBytes, sigBytes) : await pssVerify(n, e, md, msgBytes, sigBytes);
    return ok ? 'Verified OK' : 'Verification Failure';
  });
