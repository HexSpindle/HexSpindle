import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';

module('Strings', 'Extracts printable ASCII strings (like the Unix `strings` tool).', [A.number('Minimum length', 4, 1), A.boolean('Show offset', false)],
  (data, minlen, offs) => {
    const t = decodeLatin1(data);
    const re = new RegExp(`[\\x20-\\x7e]{${minlen},}`, 'g');
    const out = [];
    let m;
    while ((m = re.exec(t)) !== null) out.push((offs ? m.index.toString(16).padStart(8, '0') + ': ' : '') + m[0]);
    return out.join('\n');
  });
