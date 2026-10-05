import { module } from './_cat.js';
import { zstdDecompress } from './_zstd.js';

module('Zstandard Decompress', "Decompresses Zstandard (zstd) frames made of Raw/RLE blocks only. Real-world zstd output almost always uses 'Compressed' blocks (Huffman/FSE entropy coding), which aren't implemented in this browser-side port, and will throw a clear error rather than produce garbage.",
  [], (data) => zstdDecompress(data));
