import { module } from './_cat.js';
import { brotliDecompress } from './_brotli.js';

module(
  'Brotli Decompress',
  'Decompresses an RFC 7932 Brotli stream, including streams that use Brotli\'s built-in static dictionary.',
  [],
  (data) => brotliDecompress(data),
);
