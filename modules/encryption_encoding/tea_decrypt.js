import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { teaEcb, TEA_PADDINGS } from './_tea.js';

module('TEA Decrypt', 'TEA decryption (ECB). Padding is removed according to the Padding option (ZERO padding is not stripped).',
  [A.toggle('Key (16 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.number('Rounds', 32, 1, 128), A.select('Padding', TEA_PADDINGS, 'PKCS5')],
  (data, key, rounds, padding) => {
    if (key.length !== 16) throw new Error('Key must be 16 bytes');
    return teaEcb(parseHex(decodeLatin1(data)), key, rounds, true, padding);
  });
