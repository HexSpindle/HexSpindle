import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, decodeLatin1 } from '../../core/util.js';
import { CHARSET, polymod, hrpExpand, convertBits } from './to_bech32.js';

const SEGWIT_HRPS = ['bc', 'tb', 'ltc', 'tltc', 'bcrt'];

/** Decodes a Bech32/Bech32m string the way BIP-173 / BIP-350 define it. For the known
 * SegWit human-readable parts the first 5-bit group is the witness version and is NOT
 * bit-converted with the rest: it becomes the first output byte on its own, which is
 * what every SegWit address needs (a 20- or 32-byte v0 program leaves 5 stray bits
 * otherwise, so converting the lot rejects real addresses as bad padding). */
function decodeBech32(t) {
  if (t.length > 90) throw new Error(`Invalid Bech32 string: exceeds maximum length of 90 characters (got ${t.length}).`);
  if (/[A-Z]/.test(t) && /[a-z]/.test(t)) throw new Error('Invalid Bech32 string: mixed case is not allowed.');
  t = t.toLowerCase();
  const sep = t.lastIndexOf('1');
  if (sep === -1) throw new Error("Invalid Bech32 string: no separator '1' found.");
  if (sep === 0) throw new Error('Invalid Bech32 string: Human-Readable Part (HRP) cannot be empty.');
  if (sep + 7 > t.length) throw new Error('Invalid Bech32 string: data part is too short (minimum 6 characters for checksum).');
  const hrp = t.slice(0, sep);
  for (const ch of hrp) {
    const c = ch.charCodeAt(0);
    if (c < 33 || c > 126) throw new Error('HRP contains invalid character.');
  }
  const data = [...t.slice(sep + 1)].map(c => {
    const v = CHARSET.indexOf(c);
    if (v < 0) throw new Error(`Invalid character '${c}'.`);
    return v;
  });
  const pm = polymod([...hrpExpand(hrp), ...data]);
  const encoding = pm === 1 ? 'Bech32' : pm === 0x2bc830a3 ? 'Bech32m' : null;
  if (!encoding) throw new Error('Invalid Bech32/Bech32m string: checksum verification failed.');

  const words = data.slice(0, -6);
  let witnessVersion = null, bytes;
  if (SEGWIT_HRPS.includes(hrp) && words.length && words[0] <= 16) {
    try {
      const program = convertBits(words.slice(1), 5, 8, false);
      const validV0 = words[0] === 0 && (program.length === 20 || program.length === 32);
      const validOther = words[0] !== 0 && program.length >= 2 && program.length <= 40;
      if (validV0 || validOther) { witnessVersion = words[0]; bytes = [witnessVersion, ...program]; }
      else bytes = convertBits(words, 5, 8, false);
    } catch (e) { bytes = convertBits(words, 5, 8, false); }
  } else {
    bytes = convertBits(words, 5, 8, false);
  }
  return { hrp, data: bytes, encoding, witnessVersion };
}

module('From Bech32', 'Decodes Bech32 / Bech32m (BIP-173 / BIP-350), verifying the checksum. For SegWit addresses the first 5-bit group is the witness version and becomes the first output byte.',
  [A.select('Output format', ['Raw', 'Hex', 'Bitcoin scriptPubKey', 'HRP: Hex', 'JSON']),
    A.boolean('SegWit address (strip witness version)', false)],
  (t, fmt, segwit) => {
    t = t.trim();
    if (!t.length) return '';
    const decoded = decodeBech32(t);
    let prefix = '';
    if (segwit && decoded.data.length) {
      prefix = `Witness version: ${decoded.data[0]}\n`;
      decoded.data = decoded.data.slice(1);
    }
    const hex = bytesToHex(new Uint8Array(decoded.data));
    if (fmt === 'Hex') return prefix + hex;
    if (fmt === 'HRP: Hex') return `${prefix}${decoded.hrp}: ${hex}`;
    if (fmt === 'JSON') return prefix + JSON.stringify({ hrp: decoded.hrp, encoding: decoded.encoding, data: hex }, null, 2);
    if (fmt === 'Bitcoin scriptPubKey') {
      if (decoded.witnessVersion === null || decoded.data.length < 2) return prefix + hex;
      const version = decoded.data[0], program = decoded.data.slice(1);
      if (version > 16) return prefix + hex;
      const op = version === 0 ? 0 : 0x50 + version;
      return prefix + bytesToHex(new Uint8Array([op, program.length, ...program]));
    }
    // 'Raw' hands back the bytes themselves, so a byte above 0x7f stays one byte
    // instead of being re-encoded as UTF-8.
    if (prefix) return prefix + decodeLatin1(new Uint8Array(decoded.data));
    return new Uint8Array(decoded.data);
  }, { text: true });
