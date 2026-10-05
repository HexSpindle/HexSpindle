import { module } from './_cat.js';
import { fletcher } from './fletcher8_checksum.js';

module('Fletcher-16 Checksum', 'Fletcher checksum over 8-bit words.', [], (data) => fletcher(data, 8));
