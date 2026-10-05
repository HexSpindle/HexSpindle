import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesEqual } from '../../core/util.js';
import { bcryptHash, parseBcryptHash } from './bcrypt.js';

module('Bcrypt compare', 'Checks whether the input matches a bcrypt hash.', [A.string('Hash', '')],
  (data, h) => {
    h = h.trim();
    const { cost, saltBytes16 } = parseBcryptHash(h);
    const recomputed = bcryptHash(data, saltBytes16, cost);
    return bytesEqual(new TextEncoder().encode(recomputed), new TextEncoder().encode(h)) ? 'Match: ' + h : 'No match';
  });
