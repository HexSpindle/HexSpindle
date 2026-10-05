import { module } from './_cat.js';
import { streamTransform } from './_streams.js';

module('Zlib Deflate', 'Compresses with zlib-wrapped deflate, via the browser’s native CompressionStream.', [], (data) => streamTransform(data, 'deflate', 'compress'));
