import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Bit shift right', 'Shifts the bits in each byte towards the right by the specified amount (logical or arithmetic).',
  [A.number('Amount', 1, 0), A.select('Type', ['Logical shift', 'Arithmetic shift'])],
  (data, n, kind) => {
    const mask = kind === 'Logical shift' ? 0 : 0x80;
    return data.map(b => ((b >>> n) ^ (b & mask)) & 0xff);
  });
