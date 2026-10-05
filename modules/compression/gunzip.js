import { module } from './_cat.js';
import { streamTransform } from './_streams.js';

module('Gunzip', 'Decompresses gzip data, via the browser’s native DecompressionStream.', [], (data) => streamTransform(data, 'gzip', 'decompress'));
