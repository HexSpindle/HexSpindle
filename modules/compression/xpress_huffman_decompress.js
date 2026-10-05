import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { xpressDecompressHuffman } from './_xpress.js';

module('XPRESS LZ77+Huffman Decompress', "Decompresses data using Microsoft's XPRESS LZ77+Huffman algorithm (MS-XCA section 2.2). The uncompressed size must be known in advance (e.g. from the WOF chunk table or WIM header), so it is taken as an argument.",
  [A.number('Decompressed size', 4096, 1)],
  (data, size) => xpressDecompressHuffman(data, size));
