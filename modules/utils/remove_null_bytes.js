import { module } from './_cat.js';

module('Remove null bytes', 'Deletes all 0x00 bytes.', [],
  (data) => Uint8Array.from(data.filter((b) => b !== 0)));
