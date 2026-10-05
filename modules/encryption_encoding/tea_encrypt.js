import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { teaEcb, TEA_PADDINGS } from './_tea.js';

module('TEA Encrypt', 'Tiny Encryption Algorithm (ECB; PKCS5 padding by default). 16-byte key.',
  [A.toggle('Key (16 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.number('Rounds', 32, 1, 128), A.select('Padding', TEA_PADDINGS, 'PKCS5')],
  (data, key, rounds, padding) => {
    if (key.length !== 16) throw new Error('Key must be 16 bytes');
    return bytesToHex(teaEcb(data, key, rounds, false, padding));
  });
