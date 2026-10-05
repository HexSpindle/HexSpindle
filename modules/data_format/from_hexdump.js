import { module } from './_cat.js';
import { fromHexCC } from './from_hex.js';

module('From Hexdump', 'Extracts the bytes from a hexdump (offset and ASCII columns are stripped).', [],
  (t) => {
    const regex = /^\s*(?:[\dA-F]{4,16}h?:?)?[ \t]+((?:[\dA-F]{2} ){1,8}(?:[ \t]|[\dA-F]{2}-)(?:[\dA-F]{2} ){1,8}|(?:[\dA-F]{4} )+(?:[\dA-F]{2})?|(?:[\dA-F]{2} )*[\dA-F]{2})/igm;
    const out = [];
    let block;
    while ((block = regex.exec(t))) out.push(...fromHexCC(block[1].replace(/-/g, ' ')));
    return Uint8Array.from(out);
  }, { text: true });
