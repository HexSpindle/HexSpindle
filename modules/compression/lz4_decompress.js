import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { lz4BlockDecompress, lz4FrameDecompress } from './_lz4.js';

module('LZ4 Decompress', 'Decompresses LZ4 frame data (or a raw block if the uncompressed size is given).', [A.number('Uncompressed size (block only, 0 = frame)', 0, 0)],
  (data, size) => size ? lz4BlockDecompress(data, size) : lz4FrameDecompress(data));
