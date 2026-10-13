// Magic hints for data-format operations: how each one's input can be recognised.
import { decodes, delimiterOf, numericTokens } from '../../core/magic-detect.js';

decodes('From Braille', ({ utf8 }) => {
  if (!utf8) return null;
  const cells = (utf8.match(/[⠀-⣿]/g) || []).length;
  if (cells < 3 || cells / utf8.replace(/\s/g, '').length < 0.5) return null;
  return [{ fit: 0.9, args: ['Braille ASCII'] }, { fit: 0.8, args: ['Grade 1'], label: 'From Braille (Grade 1)' }];
});

// The operation verifies the Bech32 checksum, so a successful decode is trustworthy even though the payload is binary.
decodes('From Bech32', ({ single, compact }) =>
  single && /^[a-z0-9]{1,83}1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}$/.test(compact.toLowerCase()) && (compact === compact.toLowerCase() || compact === compact.toUpperCase())
    ? { fit: 0.9, args: ['JSON', false], trust: 0.85 } : null);

decodes('From Charcode', ({ ascii, text }) => {
  if (!ascii) return null;
  const tokens = numericTokens(text), delimiter = delimiterOf(text);
  if (tokens.length < 3 || !delimiter) return null;
  // Byte-sized codes are From Hex / From Decimal territory; this is for code points above 255.
  if (tokens.every(x => /^\d{1,7}$/.test(x) && +x <= 0x10ffff) && tokens.some(x => +x > 255)) return { fit: 0.7, args: [delimiter, 10], label: 'From Charcode (decimal)', needsQuality: true };
  if (tokens.every(x => /^[0-9a-fA-F]{2,6}$/.test(x)) && tokens.some(x => x.length > 2)) return { fit: 0.6, args: [delimiter, 16], needsQuality: true };
  return null;
});

decodes('From Hex Content', ({ ascii, text }) => ascii && /\|(?:[0-9a-fA-F]{2}\s?)+\|/.test(text) ? 0.9 : null);

// Modhex uses only 16 letters. A short run of them can be an ordinary word, a long one almost never is
// (a YubiKey OTP is 44 characters and decodes to binary, so it is trusted on its shape alone).
decodes('From Modhex', ({ single, compact }) => {
  if (!single || compact.length < 8 || compact.length % 2 || !/^[cbdefghijklnrtuv]+$/i.test(compact)) return null;
  return compact.length >= 32 ? { fit: 0.85, trust: 0.7 } : compact.length >= 16 ? { fit: 0.7 } : { fit: 0.5, needsQuality: true };
});

decodes('From Punycode', ({ ascii, text }) => ascii && /(?:^|\.)xn--[a-z0-9-]{2,}/i.test(text) ? { fit: 0.9, args: [true] } : null);

// Schema-less binary formats have no signature; a map whose first key is a short text string is the common shape.
const printableRun = (bytes, from, length) => {
  if (length < 1 || from + length > bytes.length) return false;
  for (let i = from; i < from + length; i++) if (bytes[i] < 0x20 || bytes[i] > 0x7e) return false;
  return true;
};
decodes('From MessagePack', ({ bytes }) => {
  if (bytes.length < 4) return null;
  const map = (bytes[0] >= 0x81 && bytes[0] <= 0x8f) || bytes[0] === 0xde, key = bytes[bytes[0] === 0xde ? 3 : 1];
  return map && key >= 0xa1 && key <= 0xbf && printableRun(bytes, (bytes[0] === 0xde ? 3 : 1) + 1, key & 0x1f) ? { fit: 0.8, needsQuality: true } : null;
});
decodes('CBOR Decode', ({ bytes }) => {
  if (bytes.length < 4) return null;
  const key = bytes[1];
  return bytes[0] >= 0xa1 && bytes[0] <= 0xb7 && key >= 0x61 && key <= 0x77 && printableRun(bytes, 2, key & 0x1f) ? { fit: 0.8, needsQuality: true } : null;
});
