import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { hotp, otpSecret, otpReport } from './generate_hotp.js';

module('Generate TOTP', 'Generates a time-based one-time password (RFC 6238). Input is the Base32 secret (empty = random secret). Output is the otpauth:// URI and the code.',
  [A.number('Code length', 6, 4, 10), A.number('Period (s)', 30, 1), A.number('Epoch offset', 0), A.select('Algorithm', ['SHA1', 'SHA256', 'SHA512']),
    A.string('Name', 'Account')],
  async (t, digits, period, offset, algo, name) => {
    const key = otpSecret(t);
    const now = Math.floor(Date.now() / 1000) - offset;
    const counter = BigInt(Math.floor(now / period));
    const code = await hotp(key, counter, digits, algo.toLowerCase());
    return otpReport('totp', name ?? 'Account', key, algo, digits, `period=${encodeURIComponent(period)}`, code);
  }, { text: true, nondeterministic: true });
