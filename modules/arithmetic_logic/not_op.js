import { module } from './_cat.js';

module('NOT', 'Bitwise NOT (inverts every bit).', [], data => Uint8Array.from(data, b => ~b & 255));
