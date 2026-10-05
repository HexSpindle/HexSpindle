import { module } from './_cat.js';
import { cipherArgs, runCipher } from './_blockcipher.js';
import { blowfishEncryptBlock, blowfishDecryptBlock, blowfishKeySchedule } from './_blowfish.js';

module('Blowfish Encrypt', 'Blowfish (4-56 byte key).', cipherArgs(),
  (data, key, iv, mode, inp, out) => {
    const ks = blowfishKeySchedule(key);
    return runCipher((b) => blowfishEncryptBlock(b, ks), (b) => blowfishDecryptBlock(b, ks), 8, data, key, iv, mode === 'GCM' ? 'CBC' : mode, inp, out, false);
  });
