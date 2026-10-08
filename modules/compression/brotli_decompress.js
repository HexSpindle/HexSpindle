import { module } from './_cat.js';

// Importing the codec only on demand prevents a large dependency from loading
// during initial operation-registry setup.
let brotliLibraryPromise;
function loadBrotli() {
  return brotliLibraryPromise ??= import('./_brotli.js').catch(error => {
    brotliLibraryPromise = null;
    throw error;
  });
}

module(
  'Brotli Decompress',
  'Decompresses an RFC 7932 Brotli stream, including streams that use Brotli\'s built-in static dictionary.',
  [],
  async (data) => {
    const { brotliDecompress } = await loadBrotli();
    return brotliDecompress(data);
  },
);
