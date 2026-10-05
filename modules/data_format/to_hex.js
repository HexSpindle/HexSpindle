import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const STYLES = {
  'Space': [' ', ''], 'Comma': [',', ''], 'Semi-colon': [';', ''], 'Colon': [':', ''],
  'Line feed': ['\n', ''], 'CRLF': ['\r\n', ''], 'None': ['', ''], '0x': [' ', '0x'],
  '0x with comma': [',', '0x'], '\\x': ['', '\\x'],
};

module('To Hex', 'Converts the input to hexadecimal.', [A.select('Delimiter', Object.keys(STYLES)), A.number('Bytes per line', 0, 0)],
  (data, style, perLine) => {
    const [sep, pre] = STYLES[style];
    const items = [...data].map(b => pre + b.toString(16).padStart(2, '0'));
    if (!perLine) return items.join(sep);
    const lines = [];
    for (let i = 0; i < items.length; i += perLine) lines.push(items.slice(i, i + perLine).join(sep));
    return lines.join('\n');
  });
