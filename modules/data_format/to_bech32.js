import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';

export const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

export function polymod(values) {
  const gen = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >>> i) & 1) chk ^= gen[i];
  }
  return chk >>> 0;
}

export function hrpExpand(hrp) {
  const out = [];
  for (const ch of hrp) out.push(ch.charCodeAt(0) >> 5);
  out.push(0);
  for (const ch of hrp) out.push(ch.charCodeAt(0) & 31);
  return out;
}

export function convertBits(data, frm, to, pad = true) {
  let acc = 0, bits = 0;
  const ret = [];
  const maxv = (1 << to) - 1;
  for (const v of data) {
    acc = (acc << frm) | v;
    bits += frm;
    while (bits >= to) { bits -= to; ret.push((acc >> bits) & maxv); }
  }
  if (pad && bits) ret.push((acc << (to - bits)) & maxv);
  else if (!pad && (bits >= frm || (acc << (to - bits)) & maxv)) throw new Error('Invalid padding');
  return ret;
}

module('To Bech32', 'Encodes data as Bech32 / Bech32m (BIP-173 / BIP-350).',
  [A.string('Human-Readable Part', 'bc'), A.select('Encoding', ['Bech32', 'Bech32m']), A.select('Input format', ['Raw bytes', 'Hex'])],
  (data, hrp, enc, fmt) => {
    if (fmt === 'Hex') data = parseHex(decodeLatin1(data));
    const five = convertBits(data, 8, 5);
    const constVal = enc === 'Bech32' ? 1 : 0x2bc830a3;
    const pm = polymod([...hrpExpand(hrp), ...five, 0, 0, 0, 0, 0, 0]) ^ constVal;
    const check = [];
    for (let i = 0; i < 6; i++) check.push((pm >>> (5 * (5 - i))) & 31);
    return hrp + '1' + [...five, ...check].map(d => CHARSET[d]).join('');
  });
