import { module } from './_cat.js';
import { fletcher } from './fletcher8_checksum.js';

module('Fletcher-64 Checksum', 'Fletcher checksum over 32-bit words.', [], (data) => fletcher(data, 32));
