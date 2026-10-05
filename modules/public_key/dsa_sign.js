import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, dsaPrivateNumbersFromPkcs8Der } from './_pki.js';
import { derSequence, derInteger, bytesToHex } from './_asn1.js';
import { modExp, modInverse, randomBelow, bytesToBigInt } from './_bignum.js';

const HASHES = { 'SHA-256': 'SHA-256', 'SHA-1': 'SHA-1', 'SHA-384': 'SHA-384', 'SHA-512': 'SHA-512' };

function truncateToBits(bytes, bits) {
  const n = Math.ceil(bits / 8);
  return bytes.length <= n ? bytes : bytes.subarray(0, n);
}

export async function dsaDigestSign(data, p, q, g, x, hashName) {
  const digest = new Uint8Array(await crypto.subtle.digest(hashName, data));
  const qBits = q.toString(2).length;
  const z = bytesToBigInt(truncateToBits(digest, qBits));
  let r = 0n, s = 0n;
  while (r === 0n || s === 0n) {
    const k = randomBelow(q - 1n) + 1n;
    r = modExp(g, k, p) % q;
    if (r === 0n) continue;
    s = (modInverse(k, q) * (z + x * r)) % q;
  }
  return derSequence([derInteger(r), derInteger(s)]);
}

module('DSA Sign', 'Signs the input with a DSA private key (PEM). Output is the DER signature as hex.',
  [A.area('DSA Private Key (PEM)', ''), A.string('Key password', ''), A.select('Message Digest Algorithm', ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'])],
  async (data, pem, pw, md) => {
    const info = await loadKeyInfo(pem, pw || undefined);
    if (info.kind !== 'DSA') throw new Error(`Expected a DSA key, got ${info.kind}`);
    const { p, q, g, x } = dsaPrivateNumbersFromPkcs8Der(info.der);
    const sig = await dsaDigestSign(data, p, q, g, x, HASHES[md]);
    return bytesToHex(sig);
  }, { nondeterministic: true });
