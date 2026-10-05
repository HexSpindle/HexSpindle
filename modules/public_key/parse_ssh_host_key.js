import { module } from './_cat.js';
import { base64Encode, base64Decode, bytesToHex } from '../../core/util.js';
import { md5 } from '../hashing/md5.js';

module('Parse SSH Host Key', 'Decodes an OpenSSH public key line and shows its fingerprints.', [],
  async (t) => {
    const parts = t.trim().split(/\s+/);
    const blob = base64Decode(parts.length > 1 && !parts[0].startsWith('AAAA') ? parts[1] : parts[0]);
    const fields = [];
    let i = 0;
    while (i < blob.length) {
      const n = (blob[i] << 24 | blob[i + 1] << 16 | blob[i + 2] << 8 | blob[i + 3]) >>> 0;
      fields.push(blob.subarray(i + 4, i + 4 + n));
      i += 4 + n;
    }
    const kt = new TextDecoder().decode(fields[0]);
    const md5Hex = bytesToHex(md5(blob), ':');
    const sha256 = base64Encode(new Uint8Array(await crypto.subtle.digest('SHA-256', blob))).replace(/=+$/, '');
    const out = [`Key type: ${kt}`, `MD5 fingerprint: ${md5Hex}`, `SHA256 fingerprint: SHA256:${sha256}`];
    if (kt === 'ssh-rsa') {
      const bi = (b) => { let v = 0n; for (const x of b) v = (v << 8n) | BigInt(x); return v; };
      out.push(`Exponent: ${bi(fields[1])}`, `Modulus bits: ${bi(fields[2]).toString(2).length}`);
    } else if (kt.startsWith('ecdsa')) {
      out.push(`Curve: ${new TextDecoder().decode(fields[1])}`);
    } else if (kt === 'ssh-ed25519') {
      out.push(`Public key: ${bytesToHex(fields[1])}`);
    }
    return out.join('\n');
  }, { text: true });
