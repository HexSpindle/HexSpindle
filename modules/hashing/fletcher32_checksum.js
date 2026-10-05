import { module } from './_cat.js';
import { fletcher } from './fletcher8_checksum.js';

module('Fletcher-32 Checksum', 'Fletcher checksum over 16-bit words.', [], (data) => fletcher(data, 16));
