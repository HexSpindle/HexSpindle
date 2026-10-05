import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';
import { baseToBytes } from './_base.js';
import { BTC, RIPPLE } from './to_base58.js';

module('From Base58', 'Decodes Base58 data.',
  [A.combo('Alphabet', [['Bitcoin', BTC], ['Ripple', RIPPLE]]), A.boolean('Remove non-alphabet chars', true)],
  (data, alphabet, remove) => {
    let t = decodeLatin1(data);
    if (remove) t = [...t].filter(c => alphabet.includes(c)).join('');
    return baseToBytes(t, alphabet);
  });
