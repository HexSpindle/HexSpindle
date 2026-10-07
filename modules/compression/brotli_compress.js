import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { brotliCompress } from './_brotli.js';

const MODES = ['Generic', 'Text', 'Font (WOFF2)'];
const MODE_VALUES = Object.freeze({
  Generic: 0,
  Text: 1,
  'Font (WOFF2)': 2,
});

module(
  'Brotli Compress',
  'Compresses bytes into an RFC 7932 Brotli stream. Quality controls the compression ratio/speed trade-off (0-11); mode tunes the encoder for generic data, text, or WOFF2 font data; window bits controls the LZ77 sliding window (10-24).',
  [
    A.number('Quality', 11, 0, 11, 1),
    A.select('Mode', MODES, 'Generic'),
    A.number('Window bits (lgwin)', 22, 10, 24, 1),
  ],
  (data, quality, mode, lgwin) => {
    const modeValue = MODE_VALUES[mode];
    if (modeValue === undefined) throw new Error(`Unknown Brotli mode: ${mode}`);
    return brotliCompress(data, quality, modeValue, lgwin);
  },
);
