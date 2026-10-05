import { module } from './_cat.js';
import { streamTransform } from './_streams.js';

module('Gzip', 'Compresses with gzip, via the browser’s native CompressionStream.', [], (data) => streamTransform(data, 'gzip', 'compress'));
