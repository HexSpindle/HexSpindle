import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { secureRandomBytes } from './_cat.js';

module('Pseudo-Random Number Generator', 'Generates cryptographically secure random bytes (the input is ignored).',
  [A.number('Number of bytes', 32, 1, 1048576), A.select('Output as', ['Hex', 'Integer', 'Byte array', 'Raw'])],
  (data, n, fmt) => {
    const b = secureRandomBytes(Math.trunc(n));
    if (fmt === 'Hex') return bytesToHex(b);
    if (fmt === 'Integer') { let v = 0n; for (let i = b.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(b[i]); return v.toString(); }
    if (fmt === 'Byte array') return JSON.stringify([...b]);
    return b;
  }, { nondeterministic: true });
