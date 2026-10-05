import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex } from '../../core/util.js';
import { sm2Decrypt } from './_sm2.js';

module('SM2 Decrypt', 'Decrypts a message produced by SM2 Encrypt with the matching 32-byte (64 hex character) private key.',
  [
    A.string('Private Key', 'DEADBEEF'),
    A.select('Input Format', ['C1C3C2', 'C1C2C3']),
    A.select('Curve', ['sm2p256v1']),
  ],
  (data, priv, format) => {
    priv = priv.trim().toLowerCase();
    if (priv.length !== 64) throw new Error('Input private key must be in hex; and should be 32 bytes');
    const plaintext = sm2Decrypt(BigInt('0x' + priv), parseHex(data), format);
    return plaintext;
  }, { text: true, nondeterministic: true });
