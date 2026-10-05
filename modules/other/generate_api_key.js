import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomInt(maxExclusive) {
  const limit = 0x100000000 - (0x100000000 % maxExclusive);
  let x;
  do { x = crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= limit);
  return x % maxExclusive;
}

function tokenUrlsafe(nbytes) {
  const bytes = crypto.getRandomValues(new Uint8Array(nbytes));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module('Generate API Key / Token', 'Generates random API keys/tokens in common formats (hex, URL-safe base64, UUID-style, prefixed).',
  [A.select('Format', ['Hex', 'URL-safe Base64', 'Alphanumeric', 'Prefixed (e.g. sk_live_...)']), A.number('Length (bytes of entropy)', 32, 8, 256),
   A.string('Prefix (for Prefixed format)', 'sk_live_'), A.number('Count', 1, 1, 100)],
  (data, fmt, nbytes, prefix, count) => {
    nbytes = Math.trunc(nbytes);
    const out = [];
    for (let c = 0; c < count; c++) {
      if (fmt === 'Hex') out.push(bytesToHex(crypto.getRandomValues(new Uint8Array(nbytes))));
      else if (fmt === 'URL-safe Base64') out.push(tokenUrlsafe(nbytes));
      else if (fmt === 'Alphanumeric') out.push(Array.from({ length: Math.ceil(nbytes * 8 / Math.log2(ALPHANUM.length)) }, () => ALPHANUM[randomInt(ALPHANUM.length)]).join(''));
      else out.push(prefix + tokenUrlsafe(nbytes));
    }
    return out.join('\n');
  }, { text: true, nondeterministic: true });
