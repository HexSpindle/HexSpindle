import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bigFloorDiv, parseSignedBigInt } from './_filetime.js';

const EPOCH_DIFF = 116444736000000000n;
const DIV = { 'Seconds (s)': 10n ** 9n, 'Milliseconds (ms)': 10n ** 6n, 'Microseconds (μs)': 10n ** 3n, 'Nanoseconds (ns)': 1n };

module('Windows Filetime to UNIX Timestamp', 'Converts a 64-bit Windows FILETIME (100ns since 1601) to a UNIX timestamp.',
  [A.select('Output units', ['Seconds (s)', 'Milliseconds (ms)', 'Microseconds (μs)', 'Nanoseconds (ns)']), A.select('Input format', ['Decimal', 'Hex'])],
  (t, unit, fmt) => {
    const hex = fmt === 'Hex';
    return t.trim().split(/\s+/).filter(Boolean).map(tok => {
      const ft = parseSignedBigInt(tok, hex);
      const ns = (ft - EPOCH_DIFF) * 100n;
      return bigFloorDiv(ns, DIV[unit]).toString();
    }).join('\n');
  },
  { text: true });
