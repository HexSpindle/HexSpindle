import { module } from './_cat.js';
import { openpgp } from './_pgp.js';

const ALGORITHMS = {
  1: 'RSA (Encrypt or Sign)', 2: 'RSA Encrypt-Only', 3: 'RSA Sign-Only',
  16: 'ElGamal Encrypt-Only', 17: 'DSA', 18: 'ECDH', 19: 'ECDSA',
  22: 'EdDSA', 25: 'X25519', 27: 'Ed25519',
};

function algorithmName(id) { return ALGORITHMS[id] || `Unknown (${id})`; }

function curveName(keyPacket) {
  if (keyPacket.publicParams?.oid?.getName) return keyPacket.publicParams.oid.getName();
  if (keyPacket.algorithm === 25) return 'Curve25519 (X25519)';
  if (keyPacket.algorithm === 27) return 'Ed25519';
  return null;
}

/** True bit length of a big-endian MPI, ignoring leading zero bytes. */
function mpiBitLength(bytes) {
  let i = 0;
  while (i < bytes.length && bytes[i] === 0) i++;
  if (i === bytes.length) return 0;
  let topBits = 0;
  for (let b = bytes[i]; b > 0; b >>= 1) topBits++;
  return topBits + (bytes.length - i - 1) * 8;
}

module('Parse PGP Key', 'Parses an ASCII-armoured PGP (v4 or v6) key and reports its version, creation date, key ID, fingerprint, algorithm, and (where applicable) RSA key size or EC curve.',
  [],
  async (data) => {
    if (!data.trim()) throw new Error('No key provided.');
    let key;
    try {
      key = await openpgp.readKey({ armoredKey: data });
    } catch (err) {
      throw new Error(`Unable to parse key: ${err && err.message ? err.message : 'invalid key data'}`);
    }

    const keyPacket = key.keyPacket;
    const lines = [];
    lines.push('Public Key Information');
    lines.push('======================');
    lines.push(`Version       : ${keyPacket.version}`);
    lines.push(`Creation Date : ${key.getCreationTime().toISOString()}`);
    lines.push(`Key ID        : ${key.getKeyID().toHex().toUpperCase()}`);
    lines.push(`Fingerprint   : ${key.getFingerprint().toUpperCase()}`);
    lines.push(`Algorithm     : ${algorithmName(keyPacket.algorithm)}`);

    if (keyPacket.publicParams?.n) {
      lines.push(`Key Size      : ${mpiBitLength(keyPacket.publicParams.n)} bits`);
    }

    const curve = curveName(keyPacket);
    if (curve) lines.push(`Curve         : ${curve}`);

    return lines.join('\n') + '\n';
  }, { text: true });
