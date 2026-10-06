import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { STD } from '../data_format/to_base32.js';

export function b32decode(s) {
  s = s.trim().replace(/ /g, '').toUpperCase();
  s += '='.repeat((8 - s.length % 8) % 8);
  let bits = '';
  for (const c of s) {
    if (c === '=') break;
    const idx = STD.indexOf(c);
    if (idx < 0 || idx >= 32) throw new Error(`Invalid base32 character: ${c}`);
    bits += idx.toString(2).padStart(5, '0');
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(out);
}

const ALGOS = { sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512' };

export async function hotp(key, counter, digits = 6, algo = 'sha1') {
  const counterBuf = new ArrayBuffer(8);
  new DataView(counterBuf).setBigUint64(0, BigInt(counter), false);
  const ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: ALGOS[algo] || algo }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', ck, counterBuf));
  const o = sig[sig.length - 1] & 0x0f;
  const bin = (((sig[o] & 0x7f) << 24) | (sig[o + 1] << 16) | (sig[o + 2] << 8) | sig[o + 3]) >>> 0;
  return String(bin % (10 ** digits)).padStart(digits, '0');
}

export function b32encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += STD[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += STD[(value << (5 - bits)) & 31];
  return out;
}

export function otpSecret(t) {
  const s = t.trim();
  if (!s) return crypto.getRandomValues(new Uint8Array(20));
  try { return b32decode(s.toUpperCase().replace(/\s+/g, '')); }
  catch { throw new Error('Invalid secret. The input must be a valid base32 string (characters A–Z and 2–7).'); }
}

export function otpReport(kind, label, key, algo, digits, last, code) {
  const e = encodeURIComponent;
  return `URI: otpauth://${kind}/${e(label)}?secret=${e(b32encode(key))}&algorithm=${e(algo)}&digits=${e(digits)}&${last}\n\nPassword: ${code}`;
}

module('Generate HOTP', 'Generates an HMAC-based one-time password (RFC 4226). Input is the Base32 secret (empty = random secret). Output is the otpauth:// URI and the code.',
  [A.number('Code length', 6, 4, 10), A.number('Counter', 0, 0), A.string('Name', 'Account')],
  async (t, digits, counter, name) => {
    const key = otpSecret(t);
    const code = await hotp(key, BigInt(Math.trunc(counter)), digits, 'sha1');
    return otpReport('hotp', name ?? 'Account', key, 'SHA1', digits, `counter=${encodeURIComponent(counter)}`, code);
  }, { text: true });
