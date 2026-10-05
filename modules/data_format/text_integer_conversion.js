import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function textToBigInt(text) {
  if (text.length === 0) return 0n;
  let result = 0n;
  for (let i = 0; i < text.length; i++) {
    const code = BigInt(text.charCodeAt(i));
    if (code > 255n) throw new Error(`Character at position ${i} exceeds Latin-1 range (0-255). Only ASCII and Latin-1 characters are supported.`);
    result = (result << 8n) | code;
  }
  return result;
}

function bigIntToText(value) {
  if (value === 0n) return '';
  const bytes = [];
  let num = value;
  while (num > 0n) { bytes.unshift(Number(num & 0xffn)); num >>= 8n; }
  return String.fromCharCode(...bytes);
}

module('Text-Integer Conversion', "Converts between text strings and large integers (decimal or hexadecimal). Text is interpreted as a big-endian sequence of character codes, e.g. ABC is 0x414243 (hex) is 4276803 (decimal). Input format is auto-detected: digits only -> decimal; 0x prefix -> hexadecimal; anything else (optionally quoted) -> text. Text input may only contain ASCII/Latin-1 characters (code point < 256).",
  [A.select('Output format', ['String', 'Decimal', 'Hexadecimal'])],
  (t, outputFormat) => {
    const trimmed = t.trim();
    let bigIntValue;
    if (!trimmed) {
      bigIntValue = 0n;
    } else if (/^0x[0-9a-f]+$/i.test(trimmed) || /^[+-]?[0-9]+$/.test(trimmed)) {
      bigIntValue = BigInt(trimmed);
    } else if (/^["'].*["']$/.test(trimmed)) {
      bigIntValue = textToBigInt(trimmed.slice(1, -1));
    } else {
      bigIntValue = textToBigInt(trimmed);
    }

    if (outputFormat === 'String') return bigIntToText(bigIntValue);
    if (outputFormat === 'Decimal') return bigIntValue.toString();
    return '0x' + bigIntValue.toString(16);
  }, { text: true });
