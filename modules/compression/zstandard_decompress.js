import { module } from './_cat.js';
import { zstdDecompress } from './_zstd.js';

module('Zstandard Decompress', 'Decompresses Zstandard (zstd) data - all block types (Raw, RLE and Huffman/FSE-compressed), multiple and skippable frames - using the bundled pure-JS fzstd decoder. Each frame’s declared content size and content checksum (when present) are verified. Dictionary-compressed frames are not supported.',
  [], (data) => zstdDecompress(data));
