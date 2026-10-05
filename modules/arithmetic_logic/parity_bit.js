import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function popcount(b) { let c = 0; while (b) { c += b & 1; b >>= 1; } return c; }

module('Parity Bit', 'Computes or checks a parity bit for each byte of the input.',
  [A.select('Type', ['Even', 'Odd']), A.select('Mode', ['Calculate (append bit, as a bit-string per byte)', 'Check (report violations)'])],
  (data, kind, mode) => {
    const wantEven = kind === 'Even';
    if (mode.startsWith('Calculate')) {
      const out = [];
      for (const b of data) {
        const ones = popcount(b);
        const bit = wantEven ? ones % 2 : 1 - (ones % 2);
        out.push(b.toString(2).padStart(8, '0') + bit);
      }
      return out.join(' ');
    }
    const bad = [];
    for (let i = 0; i < data.length; i++) {
      const b = data[i];
      const ones = popcount(b & 0x7f);
      const parityBit = (b >> 7) & 1;
      const expected = wantEven ? ones % 2 : 1 - (ones % 2);
      if (parityBit !== expected) bad.push(i);
    }
    return `${bad.length} parity violation(s)` + (bad.length ? ` at byte offsets: [${bad.join(', ')}]` : '');
  });
