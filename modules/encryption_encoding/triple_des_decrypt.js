import { module } from './_cat.js';
import { cipherArgs, runCipher } from './_blockcipher.js';
import { des3EncryptBlock, des3DecryptBlock } from './_des.js';

module('Triple DES Decrypt', '3DES decryption (16 or 24-byte key).', cipherArgs(true),
  (data, key, iv, mode, inp, out) => runCipher(des3EncryptBlock, des3DecryptBlock, 8, data, key, iv, mode === 'GCM' ? 'CBC' : mode, inp, out, true));
