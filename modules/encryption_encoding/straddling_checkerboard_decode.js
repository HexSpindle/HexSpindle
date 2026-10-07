import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { STRADDLING_SYMBOLS, straddlingDecode } from './_classical_ciphers.js';

module('Straddling Checkerboard Decode', 'Decodes the variable-length digit stream by recognizing the two row-prefix digits, with matching support for single-digit or VIC-style numeric escape conventions.',
  [A.string('Header digits (permutation of 0-9)', '0123456789'), A.string('Two row-prefix digits', '26'), A.string('28-symbol order', STRADDLING_SYMBOLS), A.select('Digit mode', ['Single-digit escape', 'VIC triple-digit mode'], 'Single-digit escape')],
  (t, header, prefixes, symbols, mode) => straddlingDecode(t, header, prefixes, symbols, mode), { text: true });
