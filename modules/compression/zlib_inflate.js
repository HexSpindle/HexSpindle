import { module } from './_cat.js';
import { streamTransform } from './_streams.js';

module('Zlib Inflate', 'Decompresses zlib-wrapped deflate data, via the browser’s native DecompressionStream.', [], (data) => streamTransform(data, 'deflate', 'decompress'));
