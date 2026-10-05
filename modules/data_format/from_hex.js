import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';

module('From Hex', 'Converts hexadecimal text back to bytes. Delimiters, 0x and \\x prefixes are ignored.',
  [A.select('Delimiter', ['Auto', 'Space', 'Comma', 'Semi-colon', 'Colon', 'Line feed', 'CRLF', 'None'])],
  (data) => parseHex(decodeLatin1(data)));
