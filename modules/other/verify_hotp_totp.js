import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeUtf8 } from '../../core/util.js';

const ALGO = { sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512' };

function base32Decode(s) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = s.replace(/=+$/, '');
  const bits = [];
  for (const c of s) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) throw new Error(`Invalid base32 character '${c}'`);
    for (let b = 4; b >= 0; b--) bits.push((idx >> b) & 1);
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    out[i] = byte;
  }
  return out;
}

function packCounter(n) {
  let big = BigInt(Math.trunc(n));
  const buf = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { buf[i] = Number(big & 0xffn); big >>= 8n; }
  return buf;
}

async function hotp(key, counter, digits, algo) {
  const ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: ALGO[algo] }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', ck, packCounter(counter)));
  const o = sig[sig.length - 1] & 15;
  const code = (((sig[o] & 0x7f) << 24) | (sig[o + 1] << 16) | (sig[o + 2] << 8) | sig[o + 3]) >>> 0;
  return String(code % (10 ** digits)).padStart(digits, '0');
}

module('Verify HOTP / TOTP', 'Checks a 6-10 digit code against a Base32 secret (HOTP counter or TOTP time window, with a tolerance either side for clock drift).',
  [A.select('Type', ['TOTP (time-based)', 'HOTP (counter-based)']), A.toggle('Secret (Base32)', '', ['UTF8'], 'UTF8'), A.string('Code to check', ''),
   A.number('Counter (HOTP only)', 0, 0), A.number('Period, seconds (TOTP only)', 30, 1), A.number('Window (+/- steps to tolerate)', 1, 0, 10),
   A.select('Algorithm', ['SHA1', 'SHA256', 'SHA512'])],
  async (data, kind, secret, code, counter, period, window, algo) => {
    const s = decodeUtf8(secret).trim().replace(/ /g, '').toUpperCase();
    const key = base32Decode(s);
    code = code.trim();
    const digits = code.length || 6;
    counter = Math.trunc(counter); period = Math.trunc(period); window = Math.trunc(window);
    const algoKey = algo.toLowerCase();
    if (kind.startsWith('TOTP')) {
      const now = Math.floor(Date.now() / 1000 / period);
      for (let w = -window; w <= window; w++) {
        if (await hotp(key, now + w, digits, algoKey) === code) {
          return `VALID (matched at offset ${w >= 0 ? '+' : ''}${w} step${w !== 1 && w !== -1 ? 's' : ''} = ${w * period >= 0 ? '+' : ''}${w * period}s)`;
        }
      }
      return 'INVALID: no match within the window';
    }
    for (let w = 0; w <= window; w++) {
      if (await hotp(key, counter + w, digits, algoKey) === code) {
        return `VALID (matched at counter ${counter + w}, ${w >= 0 ? '+' : ''}${w} from given)`;
      }
    }
    return 'INVALID: no match within the window';
  }, { nondeterministic: true });
