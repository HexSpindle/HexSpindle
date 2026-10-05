import { module } from './_cat.js';
import { MOD } from './to_modhex.js';
import { fromHexCC } from './from_hex.js';

module('From Modhex', 'Converts Yubico modified hexadecimal back to bytes.', [],
  (t) => {
    const hex = t.toLowerCase().replace(/\s/g, '').split(/[^cbdefghijklnrtuv]/gi).join('')
      .replace(/./g, c => '0123456789abcdef'[MOD.indexOf(c)]);
    return fromHexCC(hex, 'None');
  }, { text: true });
