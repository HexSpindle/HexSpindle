import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bigFloorDiv, parseSignedBigInt } from './_filetime.js';

const EPOCH_DIFF = 116444736000000000n;
const MULT = { 'Seconds (s)': 10n ** 9n, 'Milliseconds (ms)': 10n ** 6n, 'Microseconds (μs)': 10n ** 3n, 'Nanoseconds (ns)': 1n };

module('UNIX Timestamp to Windows Filetime', 'Converts a UNIX timestamp to a 64-bit Windows FILETIME.',
  [A.select('Input units', ['Seconds (s)', 'Milliseconds (ms)', 'Microseconds (μs)', 'Nanoseconds (ns)']), A.select('Output format', ['Decimal', 'Hex'])],
  (t, unit, fmt) => {
    const mult = MULT[unit];
    return t.trim().split(/\s+/).filter(Boolean).map(tok => {
      const ft = bigFloorDiv(parseSignedBigInt(tok, false) * mult, 100n) + EPOCH_DIFF;
      return fmt === 'Hex' ? ft.toString(16) : ft.toString();
    }).join('\n');
  },
  { text: true });
