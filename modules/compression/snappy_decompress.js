import { module } from './_cat.js';
import { snappyDecompress } from './_snappy.js';

module('Snappy Decompress', 'Decompresses Snappy data.', [], (data) => snappyDecompress(data));
