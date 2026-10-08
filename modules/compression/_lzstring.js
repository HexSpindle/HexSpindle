/*!
 * Portions derived from LZ-String.
 * Copyright (c) 2013 Pieroxy.
 * License: MIT
 *
 * Adapted for HexSpindle.
 * Full license and attribution notices: /THIRD_PARTY_NOTICES.md
 */

const KEY_STR_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const KEY_STR_URI_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';

const baseReverseDic = {};
function getBaseValue(alphabet, character) {
  if (!baseReverseDic[alphabet]) {
    baseReverseDic[alphabet] = {};
    for (let i = 0; i < alphabet.length; i++) baseReverseDic[alphabet][alphabet.charAt(i)] = i;
  }
  return baseReverseDic[alphabet][character];
}

function _compress(uncompressed, bitsPerChar, getCharFromInt) {
  if (uncompressed == null) return '';
  let i, value;
  const context_dictionary = {};
  const context_dictionaryToCreate = {};
  let context_c = '', context_wc = '', context_w = '';
  let context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2;
  const context_data = [];
  let context_data_val = 0, context_data_position = 0;

  const emitBit = (bit) => {
    context_data_val = (context_data_val << 1) | bit;
    if (context_data_position === bitsPerChar - 1) {
      context_data_position = 0;
      context_data.push(getCharFromInt(context_data_val));
      context_data_val = 0;
    } else {
      context_data_position++;
    }
  };

  const emitWord = (w) => {
    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, w)) {
      if (w.charCodeAt(0) < 256) {
        for (i = 0; i < context_numBits; i++) emitBit(0);
        value = w.charCodeAt(0);
        for (i = 0; i < 8; i++) { emitBit(value & 1); value >>= 1; }
      } else {
        value = 1;
        for (i = 0; i < context_numBits; i++) { emitBit(value); value = 0; }
        value = w.charCodeAt(0);
        for (i = 0; i < 16; i++) { emitBit(value & 1); value >>= 1; }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
      delete context_dictionaryToCreate[w];
    } else {
      value = context_dictionary[w];
      for (i = 0; i < context_numBits; i++) { emitBit(value & 1); value >>= 1; }
    }
    context_enlargeIn--;
    if (context_enlargeIn === 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
  };

  for (let ii = 0; ii < uncompressed.length; ii++) {
    context_c = uncompressed.charAt(ii);
    if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
      context_dictionary[context_c] = context_dictSize++;
      context_dictionaryToCreate[context_c] = true;
    }
    context_wc = context_w + context_c;
    if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
      context_w = context_wc;
    } else {
      emitWord(context_w);
      context_dictionary[context_wc] = context_dictSize++;
      context_w = String(context_c);
    }
  }

  if (context_w !== '') emitWord(context_w);

  value = 2;
  for (i = 0; i < context_numBits; i++) { emitBit(value & 1); value >>= 1; }

  for (;;) {
    context_data_val <<= 1;
    if (context_data_position === bitsPerChar - 1) { context_data.push(getCharFromInt(context_data_val)); break; }
    else context_data_position++;
  }
  return context_data.join('');
}

function _decompress(length, resetValue, getNextValue) {
  const dictionary = [];
  let enlargeIn = 4, dictSize = 4, numBits = 3, entry = '';
  const result = [];
  let i, w, bits, resb, maxpower, power, c;
  const data = { val: getNextValue(0), position: resetValue, index: 1 };

  for (i = 0; i < 3; i++) dictionary[i] = i;

  const readBits = (n) => {
    let b = 0; let pw = 1; const max = Math.pow(2, n);
    while (pw !== max) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
      b |= (resb > 0 ? 1 : 0) * pw;
      pw <<= 1;
    }
    return b;
  };

  const next = readBits(2);
  switch (next) {
    case 0: c = String.fromCharCode(readBits(8)); break;
    case 1: c = String.fromCharCode(readBits(16)); break;
    case 2: return '';
    default: return null;
  }
  dictionary[3] = c;
  w = c;
  result.push(c);
  for (;;) {
    if (data.index > length) return null;
    bits = readBits(numBits);
    switch (bits) {
      case 0: dictionary[dictSize++] = String.fromCharCode(readBits(8)); c = dictSize - 1; enlargeIn--; break;
      case 1: dictionary[dictSize++] = String.fromCharCode(readBits(16)); c = dictSize - 1; enlargeIn--; break;
      case 2: return result.join('');
      default: c = bits;
    }
    if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }

    if (dictionary[c] !== undefined) entry = dictionary[c];
    else if (c === dictSize) entry = w + w.charAt(0);
    else return null;

    result.push(entry);
    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;
    w = entry;
    if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
  }
}

export function compress(uncompressed) {
  return _compress(uncompressed, 16, (a) => String.fromCharCode(a));
}
export function decompress(compressed) {
  if (compressed == null) return '';
  if (compressed === '') return null;
  return _decompress(compressed.length, 32768, (index) => compressed.charCodeAt(index));
}
export function compressToBase64(input) {
  if (input == null) return '';
  const res = _compress(input, 6, (a) => KEY_STR_BASE64.charAt(a));
  switch (res.length % 4) {
    case 1: return res + '===';
    case 2: return res + '==';
    case 3: return res + '=';
    default: return res;
  }
}
export function decompressFromBase64(input) {
  if (input == null) return '';
  if (input === '') return null;
  return _decompress(input.length, 32, (index) => getBaseValue(KEY_STR_BASE64, input.charAt(index)));
}
export function compressToEncodedURIComponent(input) {
  if (input == null) return '';
  return _compress(input, 6, (a) => KEY_STR_URI_SAFE.charAt(a));
}
export function decompressFromEncodedURIComponent(input) {
  if (input == null) return '';
  if (input === '') return null;
  input = input.replace(/ /g, '+');
  return _decompress(input.length, 32, (index) => getBaseValue(KEY_STR_URI_SAFE, input.charAt(index)));
}
