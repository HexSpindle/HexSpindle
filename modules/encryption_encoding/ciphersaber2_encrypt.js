import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rc4 } from './rc4.js';
import { concatBytes } from '../../core/util.js';

module('CipherSaber2 Encrypt', "A simple, memorable RC4-based protocol (Arnold Reinhold's CipherSaber-2): a random 10-byte IV is sent in the clear before the ciphertext, and the key schedule is repeated N times for extra mixing.",
  [A.toggle('Passphrase', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'), A.number('Key schedule repeats (N)', 20, 1, 256)],
  (data, passphrase, n) => {
    const iv = crypto.getRandomValues(new Uint8Array(10));
    const key = concatBytes([passphrase, iv]);
    return concatBytes([iv, rc4(key, data, 0, n)]);
  }, { nondeterministic: true });
