import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, rsaPublicNumbersFromSpkiDer } from './_pki.js';
import { pkcs1v15Verify, pssVerify } from './_rsasign.js';
import { parseHex } from '../../core/util.js';

module('RSA Verify', 'Verifies a hex signature over the input with an RSA public key.',
  [A.string('Signature (hex)', ''), A.area('RSA Public Key (PEM)', ''), A.select('Message Digest Algorithm', ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512', 'MD5']), A.select('Padding', ['PKCS#1 v1.5', 'PSS'])],
  async (data, sig, pem, md, paddingKind) => {
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'RSA') throw new Error(`Expected an RSA key, got ${info.kind}`);
    const { n, e } = rsaPublicNumbersFromSpkiDer(info.der);
    const sigBytes = parseHex(sig);
    const ok = paddingKind.startsWith('PKCS') ? await pkcs1v15Verify(n, e, md, data, sigBytes) : await pssVerify(n, e, md, data, sigBytes);
    return ok ? 'Verified OK' : 'Verification FAILED';
  });
