import { module } from './_cat.js';
import { cipherArgs, runCipher } from './_blockcipher.js';
import { desEncryptBlock, desDecryptBlock } from './_des.js';

module('DES Decrypt', 'DES decryption (8-byte key).', cipherArgs(true),
  (data, key, iv, mode, inp, out) => {
    if (key.length !== 8) throw new Error(`DES key must be 8 bytes (got ${key.length})`);
    return runCipher(desEncryptBlock, desDecryptBlock, 8, data, key, iv, mode === 'GCM' ? 'CBC' : mode, inp, out, true);
  });
