import { module } from './_cat.js';
import { zstdStoreCompress } from './_zstd.js';

module('Zstandard Compress', "Writes a valid Zstandard (zstd) frame using only Raw/RLE blocks (store-only: no Huffman/FSE entropy coding is implemented in this browser-side port, so output is not smaller than input, but is correctly decodable by any zstd tool).",
  [], (data) => zstdStoreCompress(data));
