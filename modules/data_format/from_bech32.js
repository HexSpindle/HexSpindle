import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, decodeLatin1 } from '../../core/util.js';
import { CHARSET, polymod, hrpExpand, convertBits } from './to_bech32.js';

module('From Bech32', 'Decodes Bech32 / Bech32m, verifying the checksum. For SegWit addresses the first 5-bit group is the witness version.',
  [A.select('Output format', ['Raw bytes', 'Hex']), A.boolean('SegWit address (strip witness version)', false)],
  (t, fmt, segwit) => {
    t = t.trim().toLowerCase();
    const i = t.lastIndexOf('1');
    if (i < 1 || t.length - i < 7) throw new Error('Invalid Bech32 string');
    const hrp = t.slice(0, i);
    const data = [...t.slice(i + 1)].map(c => { const v = CHARSET.indexOf(c); if (v < 0) throw new Error('Invalid Bech32 string'); return v; });
    const pm = polymod([...hrpExpand(hrp), ...data]);
    if (pm !== 1 && pm !== 0x2bc830a3) throw new Error('Bech32 checksum failed');
    let payload = data.slice(0, -6);
    let prefix = '';
    if (segwit) {
      prefix = `Witness version: ${payload[0]}\n`;
      payload = payload.slice(1);
    }
    const raw = new Uint8Array(convertBits(payload, 5, 8, false));
    return prefix + (fmt === 'Hex' ? bytesToHex(raw) : decodeLatin1(raw));
  }, { text: true });
