import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// Fetch the comparatively large Brotli codec only when a Brotli operation runs.
// Keep one shared module-import promise, including for concurrent executions.
let brotliLibraryPromise;
function loadBrotli() {
  return brotliLibraryPromise ??= import('./_brotli.js').catch(error => {
    brotliLibraryPromise = null; // Allow a retry after a transient load failure.
    throw error;
  });
}

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
  async (data, quality, mode, lgwin) => {
    const modeValue = MODE_VALUES[mode];
    if (modeValue === undefined) throw new Error(`Unknown Brotli mode: ${mode}`);
    const { brotliCompress } = await loadBrotli();
    return brotliCompress(data, quality, modeValue, lgwin);
  },
);
