import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rc4 } from './rc4.js';
import { concatBytes } from '../../core/util.js';

module('CipherSaber2 Decrypt', 'Decrypts CipherSaber-2 data (the 10-byte IV is read from the start of the input).',
  [A.toggle('Passphrase', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'), A.number('Key schedule repeats (N)', 20, 1, 256)],
  (data, passphrase, n) => {
    if (data.length < 10) throw new Error('Input is shorter than the 10-byte IV');
    const iv = data.slice(0, 10), ct = data.slice(10);
    const key = concatBytes([passphrase, iv]);
    return rc4(key, ct, 0, n);
  });
