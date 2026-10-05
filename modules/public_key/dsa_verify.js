import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, dsaPublicNumbersFromSpkiDer } from './_pki.js';
import { parseOneDer, derUint } from './_asn1.js';
import { parseHex } from '../../core/util.js';
import { modExp, modInverse, bytesToBigInt } from './_bignum.js';

const HASHES = { 'SHA-256': 'SHA-256', 'SHA-1': 'SHA-1', 'SHA-384': 'SHA-384', 'SHA-512': 'SHA-512' };

function truncateToBits(bytes, bits) {
  const n = Math.ceil(bits / 8);
  return bytes.length <= n ? bytes : bytes.subarray(0, n);
}

module('DSA Verify', 'Verifies a DER hex DSA signature over the input with a public key (PEM).',
  [A.string('Signature (hex, DER)', ''), A.area('DSA Public Key (PEM)', ''), A.select('Message Digest Algorithm', ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'])],
  async (data, sig, pem, md) => {
    const info = await loadKeyInfo(pem);
    if (info.kind !== 'DSA') throw new Error(`Expected a DSA key, got ${info.kind}`);
    const { p, q, g, y } = dsaPublicNumbersFromSpkiDer(info.der);
    const [rNode, sNode] = parseOneDer(parseHex(sig)).children;
    const r = derUint(rNode), s = derUint(sNode);
    if (r <= 0n || r >= q || s <= 0n || s >= q) return 'Verification FAILED';
    const digest = new Uint8Array(await crypto.subtle.digest(HASHES[md], data));
    const z = bytesToBigInt(truncateToBits(digest, q.toString(2).length));
    const w = modInverse(s, q);
    const u1 = (z * w) % q;
    const u2 = (r * w) % q;
    const v = ((modExp(g, u1, p) * modExp(y, u2, p)) % p) % q;
    return v === r ? 'Verified OK' : 'Verification FAILED';
  });
