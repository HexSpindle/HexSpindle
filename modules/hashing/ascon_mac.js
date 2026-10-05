import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { asconMac } from './_ascon.js';

module('Ascon MAC', 'Ascon-Mac: a 128-bit message authentication code from the Ascon family, standardised in NIST SP 800-232. Requires a 16-byte (128-bit) key.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'])],
  (data, key) => {
    if (key.length !== 16) throw new Error(`Invalid key length: ${key.length} bytes. Ascon-Mac requires exactly 16 bytes (128 bits).`);
    return bytesToHex(asconMac(key, data));
  });
