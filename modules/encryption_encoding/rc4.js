import { module } from './_cat.js';
import { A } from '../../core/registry.js';

/** ksaRounds > 1 repeats the key-scheduling mixing loop that many times (CipherSaber-2's 'N'). */
export function rc4(key, data, drop = 0, ksaRounds = 1) {
  if (!key.length) throw new Error('Key must not be empty');
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let round = 0; round < ksaRounds; round++) {
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) & 255;
      const t = s[i]; s[i] = s[j]; s[j] = t;
    }
  }
  let i = 0; j = 0;
  const out = new Uint8Array(data.length);
  for (let n = 0; n < drop + data.length; n++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    const t = s[i]; s[i] = s[j]; s[j] = t;
    if (n >= drop) out[n - drop] = data[n - drop] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}

module('RC4', 'RC4 stream cipher (encrypt = decrypt).',
  [A.toggle('Passphrase', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8')],
  (data, key) => rc4(key, data));
