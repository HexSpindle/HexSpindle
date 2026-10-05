import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { hotp, b32decode } from './generate_hotp.js';

module('Generate TOTP', 'Generates a time-based one-time password (RFC 6238). Input is the Base32 secret.',
  [A.number('Code length', 6, 4, 10), A.number('Period (s)', 30, 1), A.number('Epoch offset', 0), A.select('Algorithm', ['SHA1', 'SHA256', 'SHA512'])],
  async (t, digits, period, offset, algo) => {
    const key = b32decode(t);
    const now = Math.floor(Date.now() / 1000) - offset;
    const counter = BigInt(Math.floor(now / period));
    const code = await hotp(key, counter, digits, algo.toLowerCase());
    const remaining = period - (((now % period) + period) % period);
    return `${code}  (valid for ${remaining}s)`;
  }, { text: true, nondeterministic: true });
