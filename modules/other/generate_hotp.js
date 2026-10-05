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

module('Generate HOTP', 'Generates an HMAC-based one-time password (RFC 4226). Input is the Base32 secret.',
  [A.number('Code length', 6, 4, 10), A.number('Counter', 0, 0)],
  async (t, digits, counter) => {
    const key = b32decode(t.trim().replace(/ /g, ''));
    return hotp(key, BigInt(Math.trunc(counter)), digits, 'sha1');
  }, { text: true });
