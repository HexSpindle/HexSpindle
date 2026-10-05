import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('To Hexdump', 'Creates a hexdump (offset, hex bytes, ASCII) of the input.',
  [A.number('Width', 16, 1), A.boolean('Upper case hex', false), A.boolean('Include final length', false), A.boolean('UNIX format', false)],
  (data, width, upper, final, unix) => {
    width = Math.trunc(width);
    const hx2 = b => (upper ? b.toString(16).toUpperCase() : b.toString(16)).padStart(2, '0');
    const lines = [];
    for (let i = 0; i < data.length; i += width) {
      const chunk = data.subarray(i, i + width);
      const asc = [...chunk].map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
      if (unix) {
        const groups = [];
        for (let j = 0; j < chunk.length; j += 2) groups.push([...chunk.subarray(j, j + 2)].map(hx2).join(''));
        const hx = groups.join(' ').padEnd(Math.floor(width * 5 / 2));
        lines.push(`${i.toString(16).padStart(8, '0')}: ${hx}  ${asc}`);
      } else {
        const hx = [...chunk].map(hx2).join(' ').padEnd(width * 3 - 1);
        lines.push(`${i.toString(16).padStart(8, '0')}  ${hx}  |${asc}|`);
      }
    }
    if (final) lines.push(data.length.toString(16).padStart(8, '0'));
    return lines.join('\n');
  });
