import { module } from './_cat.js';
import { MOD } from './to_modhex.js';

module('From Modhex', 'Converts Yubico modified hexadecimal back to bytes.', [],
  (t) => {
    const v = [...t.toLowerCase()].filter(c => MOD.includes(c)).map(c => MOD.indexOf(c));
    const out = [];
    for (let i = 0; i + 1 < v.length; i += 2) out.push((v[i] << 4) | v[i + 1]);
    return new Uint8Array(out);
  }, { text: true });
