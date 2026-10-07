import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { STRADDLING_SYMBOLS, straddlingEncode } from './_classical_ciphers.js';

module('Straddling Checkerboard Encode', 'Variable-length monôme-binôme/straddling checkerboard. Eight common symbols get one digit; the remaining twenty get a row-prefix plus column digit. Supports single-digit escape or VIC-style triple-digit numeric mode.',
  [A.string('Header digits (permutation of 0-9)', '0123456789'), A.string('Two row-prefix digits', '26'), A.string('28-symbol order', STRADDLING_SYMBOLS), A.select('Digit mode', ['Single-digit escape', 'VIC triple-digit mode'], 'Single-digit escape')],
  (t, header, prefixes, symbols, mode) => straddlingEncode(t, header, prefixes, symbols, mode), { text: true });
