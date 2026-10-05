import { module } from './_cat.js';
import { streamTransform } from './_streams.js';

module('Raw Inflate', 'Decompresses raw (headerless) deflate data, via the browser’s native DecompressionStream.', [], (data) => streamTransform(data, 'deflate-raw', 'decompress'));
