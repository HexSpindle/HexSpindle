import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Parse TLV', 'Converts a Type-Length-Value (TLV) encoded byte stream into a JSON array of {key, length, value} records.',
  [A.boolean('Show values as hex', true), A.number('Type/Key size', 1), A.number('Length size', 1), A.boolean('Use BER', false)],
  (data, _hexv, bytesInKey = 1, bytesInLength = 1, ber = false) => {
    bytesInKey = Number(bytesInKey); bytesInLength = Number(bytesInLength);
    if (bytesInKey <= 0 && bytesInLength <= 0) throw new Error('Type or Length size must be greater than 0');
    let loc = 0;
    const getValue = n => {
      const v = [];
      for (let i = 0; i < n; i++) {
        if (loc > data.length) return v;
        v.push(data[loc]);
        loc++;
      }
      return v;
    };
    const getLength = () => {
      let n = bytesInLength, bigEndian = false;
      if (ber) {
        const first = data[loc];
        loc++;
        if (first & 0x80) { n = first & ~0x80; bigEndian = true; } else return first & ~0x80;
      }
      let length = 0;
      for (let i = 0; i < n; i++) {
        if (bigEndian) length = (length << 8) + data[loc];
        else length += data[loc] * Math.pow(Math.pow(2, 8), i);
        loc++;
      }
      return length;
    };
    const out = [];
    while (data.length > loc) {
      const key = bytesInKey ? getValue(bytesInKey) : undefined;
      const length = getLength();
      const value = getValue(length);
      out.push({ key, length, value });
    }
    return JSON.stringify(out, null, 4);
  });
