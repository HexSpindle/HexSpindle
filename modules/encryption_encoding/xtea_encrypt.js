import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { xteaEcb, TEA_PADDINGS } from './_tea.js';

module('XTEA Encrypt', 'eXtended TEA (ECB; PKCS5 padding by default) - fixes weaknesses in the original TEA. 16-byte key.',
  [A.toggle('Key (16 bytes)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.number('Rounds', 32, 1, 128), A.select('Padding', TEA_PADDINGS, 'PKCS5')],
  (data, key, rounds, padding) => {
    if (key.length !== 16) throw new Error('Key must be 16 bytes');
    return bytesToHex(xteaEcb(data, key, rounds, false, padding));
  });
