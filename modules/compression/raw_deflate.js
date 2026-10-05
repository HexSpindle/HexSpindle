import { module } from './_cat.js';
import { streamTransform } from './_streams.js';

module('Raw Deflate', 'Compresses with raw (headerless) deflate, via the browser’s native CompressionStream.', [], (data) => streamTransform(data, 'deflate-raw', 'compress'));
