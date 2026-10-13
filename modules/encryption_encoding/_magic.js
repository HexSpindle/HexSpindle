// Magic hints for ciphers and encodings: recognisable formats, small keyspaces that can simply be tried,
// and ciphertext that can be identified but not opened without its key.
import { decodes, needsKey, delimiterOf, numericTokens, printableAscii, distinctLetters } from '../../core/magic-detect.js';

const letterShare = text => { const solid = text.replace(/\s/g, ''); return solid.length ? solid.replace(/[^A-Za-z]/g, '').length / solid.length : 0; };

// ---- Recognisable formats ------------------------------------------------------------------------

// Flask session cookie: payload.timestamp.signature (a JWT's second part is a long "eyJ…" instead).
decodes('Flask Session Decode', ({ single, compact }) => single && /^\.?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{4,8}\.[A-Za-z0-9_-]{20,}$/.test(compact) ? 0.9 : null);

decodes('Cetacean Cipher Decode', ({ ascii, text }) => {
  const solid = text.replace(/\s/g, '');
  return ascii && solid.length >= 16 && solid.length % 16 === 0 && /^[Ee]+$/.test(solid) ? 0.95 : null;
});

// Citrix passwords are ASCII; anything else coming out means the input was not CTX1.
decodes('Citrix CTX1 Decode', ({ single, compact }) => single && compact.length >= 8 && compact.length % 4 === 0 && /^[A-P]+$/.test(compact) ? { fit: 0.6, verify: printableAscii } : null);

decodes('Bacon Cipher Decode', ({ ascii, text }) => {
  if (!ascii) return null;
  const solid = text.replace(/\s/g, '');
  if (solid.length < 10 || solid.length % 5) return null;
  const translation = /^[ABab]+$/.test(solid) ? 'A/B' : /^[01]+$/.test(solid) && solid.length % 8 ? '0/1' : null;
  if (!translation) return null;
  return [{ fit: 0.85, args: ['Standard (I=J and U=V)', translation, false] }, { fit: 0.8, args: ['Complete', translation, false], label: 'Bacon Cipher Decode (complete alphabet)' }];
});

decodes('A1Z26 Cipher Decode', ({ ascii, text }) => {
  if (!ascii) return null;
  const tokens = numericTokens(text), delimiter = delimiterOf(text);
  return tokens.length >= 3 && delimiter && delimiter !== 'Tab' && tokens.every(x => /^\d{1,2}$/.test(x) && +x >= 1 && +x <= 26) ? { fit: 0.8, args: [delimiter] } : null;
});

// ---- Small keyspaces: every key is tried and the most readable result kept -------------------------

const AFFINE_A = [3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];   // a = 1 is a plain Caesar shift, which ROT13 already covers
decodes('Affine Cipher Decode', ({ ascii, text }) => ascii && text.length >= 12 && letterShare(text) >= 0.6 && distinctLetters(text) >= 8
  ? { fit: 0.6, weak: true, needsWords: 3, variants: AFFINE_A.flatMap(a => Array.from({ length: 26 }, (_, b) => ({ args: [a, b], label: `Affine Cipher Decode (a=${a}, b=${b})` }))) } : null);

// Transposition ciphers keep the letters and move them, so the whole text has to be decoded to judge a key.
decodes('Rail Fence Cipher Decode', ({ ascii, text }) => ascii && text.length >= 16 && letterShare(text) >= 0.6 && distinctLetters(text) >= 8
  ? { fit: 0.55, weak: true, whole: true, needsWords: 3, variants: [2, 3, 4, 5, 6, 7, 8].map(rails => ({ args: [rails, 0], label: `Rail Fence Cipher Decode (${rails} rails)` })) } : null);

// ---- Identifiable, but locked without a key --------------------------------------------------------

const opensslSalted = ({ at, compact, single }) => at('Salted__') || (single && compact.startsWith('U2FsdGVkX1'));
needsKey('Derive EVP key', 'passphrase', ctx => opensslSalted(ctx) ? { fit: 0.9, label: 'OpenSSL salted ciphertext: Derive EVP key, then AES / Triple DES Decrypt' } : null);
needsKey('Fernet Decrypt', 'key', ({ single, compact }) => single && /^gAAAAA[A-Za-z0-9_-]{90,}={0,2}$/.test(compact) ? 0.9 : null);
needsKey('JWT Verify', 'secret or public key', ({ single, compact }) => single && /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(compact) ? 0.5 : null);
needsKey('Flask Session Verify', 'secret key', ({ single, compact }) => single && /^\.?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{4,8}\.[A-Za-z0-9_-]{20,}$/.test(compact) ? 0.5 : null);
needsKey('ADFGVX Cipher Decode', 'keys', ({ ascii, text }) => { const s = text.replace(/\s/g, ''); return ascii && s.length >= 20 && s.length % 2 === 0 && /^[ADFGVX]+$/.test(s) && /V/.test(s) ? 0.85 : null; });
needsKey('ADFGX Cipher Decode', 'keys', ({ ascii, text }) => { const s = text.replace(/\s/g, ''); return ascii && s.length >= 20 && s.length % 2 === 0 && /^[ADFGX]+$/.test(s) ? 0.85 : null; });
