import { module } from './_cat.js';

const GUESSES = {
  8: ['CRC-32', 'Adler-32', 'Fletcher-32'],
  16: ['MD2', 'MD4', 'MD5', 'NTLM/NT Hash', 'LM Hash', 'RIPEMD-128', 'Half MD5', 'Fletcher-64'],
  20: ['SHA-1 (binary)'],
  32: ['MD2', 'MD4', 'MD5', 'NTLM/NT Hash', 'LM Hash', 'RIPEMD-128', 'BLAKE2s-128', 'Domain Cached Credentials'],
  40: ['SHA-1', 'RIPEMD-160', 'MySQL5 (SHA1 of SHA1)', 'Tiger-160', 'Haval-160', 'Double SHA-1'],
  48: ['Tiger-192', 'Haval-192'],
  56: ['SHA-224', 'SHA3-224', 'Haval-224', 'BLAKE2b-224', 'Keccak-224'],
  64: ['SHA-256', 'SHA3-256', 'BLAKE2s-256', 'RIPEMD-256', 'Keccak-256', 'SM3', 'Haval-256', 'GOST R 34.11-94', 'Snefru-256', 'Double SHA-256'],
  80: ['RIPEMD-320'],
  96: ['SHA-384', 'SHA3-384', 'Keccak-384'],
  128: ['SHA-512', 'SHA3-512', 'BLAKE2b-512', 'Whirlpool', 'Keccak-512'],
};

module('Analyse hash', 'Guesses likely hash algorithms from the length and format of a hash string.',
  [],
  (t) => {
    t = t.trim();
    if (t.startsWith('$2') && /^\$2[abxy]?\$\d\d\$[./A-Za-z0-9]{53}$/.test(t)) return 'bcrypt';
    if (t.startsWith('$1$')) return 'MD5 crypt';
    if (t.startsWith('$5$')) return 'SHA-256 crypt';
    if (t.startsWith('$6$')) return 'SHA-512 crypt';
    if (t.startsWith('$argon2')) return 'Argon2';
    if (t.startsWith('$pbkdf2')) return 'PBKDF2';
    let out;
    if (/^[0-9a-fA-F]+$/.test(t)) {
      const c = GUESSES[t.length] || [];
      out = [`Hash length: ${t.length} hex chars (${t.length * 4} bits)`, 'Possible algorithms:', ...c.map(x => '  ' + x)];
      if (!c.length) out.push('  (no known algorithm with this length)');
    } else {
      out = ['Not a plain hexadecimal hash.', `Length: ${t.length} chars`];
    }
    return out.join('\n');
  }, { text: true });
