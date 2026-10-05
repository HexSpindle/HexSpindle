import { module } from './_cat.js';
import { A } from '../../core/registry.js';

export const MOD = 'cbdefghijklnrtuv';

module('To Modhex', 'Converts data to Yubico modified hexadecimal.', [A.select('Delimiter', ['Space', 'Comma', 'None'], 'None')],
  (data, d) => {
    const sep = { Space: ' ', Comma: ',', None: '' }[d];
    return [...data].map(b => MOD[b >> 4] + MOD[b & 15]).join(sep);
  });
