import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { lz4BlockCompress, lz4FrameCompress } from './_lz4.js';

module('LZ4 Compress', 'Compresses with LZ4 (frame or raw block).', [A.select('Format', ['Frame', 'Block (raw)'])],
  (data, fmt) => fmt === 'Frame' ? lz4FrameCompress(data) : lz4BlockCompress(data));
