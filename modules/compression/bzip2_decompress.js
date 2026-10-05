import { module } from './_cat.js';
import { bzip2Decompress } from './_bzip2.js';

module('Bzip2 Decompress', 'Decompresses bzip2 data.', [], (data) => bzip2Decompress(data));
