import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Bit shift left', 'Shifts the bits in each byte towards the left by the specified amount.', [A.number('Amount', 1, 0)],
  (data, n) => data.map(b => (b << n) & 0xff));
