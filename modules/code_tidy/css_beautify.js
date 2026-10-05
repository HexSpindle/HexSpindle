import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('CSS Beautify', 'Indents and formats CSS.', [A.string('Indent string', '    ')],
  (t, indent) => {
    indent = indent.replace(/\\t/g, '\t');
    t = t.replace(/\s+/g, ' ');
    const out = [];
    let level = 0;
    let buf = '';
    let inStr = null;
    for (const c of t) {
      if (inStr) {
        buf += c;
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c; buf += c;
      } else if (c === '{') {
        out.push(indent.repeat(level) + buf.trim() + ' {'); buf = ''; level += 1;
      } else if (c === '}') {
        if (buf.trim()) out.push(indent.repeat(level) + buf.trim() + ';');
        buf = ''; level = Math.max(0, level - 1); out.push(indent.repeat(level) + '}');
        if (level === 0) out.push('');
      } else if (c === ';') {
        out.push(indent.repeat(level) + buf.trim() + ';'); buf = '';
      } else {
        buf += c;
      }
    }
    if (buf.trim()) out.push(indent.repeat(level) + buf.trim());
    let res = out.join('\n');
    res = res.replace(/^(\s*[\w-]+):\s*/gm, '$1: ');
    res = res.replace(/(?<=[^\s:]):(?=\S)/g, ':');
    return res.trim();
  },
  { text: true }
);
