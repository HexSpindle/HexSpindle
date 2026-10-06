import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { gostHash } from './_hash_util.js';

module('GOST Hash', 'The GOST R 34.11-94 hash (built on the GOST 28147-89 block cipher with a selectable S-box) or its successor Streebog (GOST R 34.11-2012).',
  [A.select('Algorithm', ['GOST 28147 (1994)', 'GOST R 34.11 (Streebog, 2012)']), A.select('Digest length', ['256', '512']),
    A.select('sBox', ['E-TEST', 'E-A', 'E-B', 'E-C', 'E-D', 'E-SC', 'E-Z', 'D-TEST', 'D-A', 'D-SC'])],
  (data, algo, length, sBox) => gostHash(data, algo === 'GOST 28147 (1994)'
    ? { version: 1994, sBox } : { version: 2012, length: parseInt(length, 10) }));
