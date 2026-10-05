import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ENCODINGS, decodeBytes, encodeText } from './encode_text.js';
import { decodeUtf8, decodeLatin1 } from '../../core/util.js';

module('Text Encoding Brute Force', 'Decodes the input under many encodings so you can spot the readable one.', [A.select('Mode', ['Encode', 'Decode'], 'Decode')],
  (data, mode) => ENCODINGS.map(e => {
    let r;
    try {
      r = mode === 'Decode' ? decodeBytes(data, e) : decodeLatin1(encodeText(decodeUtf8(data), e, true));
    } catch (ex) {
      r = `<${ex.message}>`;
    }
    return e.padEnd(24) + r;
  }).join('\n'));
