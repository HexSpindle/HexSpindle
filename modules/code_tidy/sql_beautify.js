import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const CLAUSES = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION ALL', 'UNION', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN', 'ON', 'AND', 'OR'];

const MAJOR = new Set(['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM']);

const CLAUSE_RX = new RegExp('\\b(' + [...CLAUSES].sort((a, b) => b.length - a.length).join('|') + ')\\b', 'i');

module('SQL Beautify', 'Formats SQL with clause-per-line layout.', [A.string('Indent string', '    ')],
  (t, indent) => {
    indent = indent.replace(/\\t/g, '\t');
    const strings = [];
    t = t.replace(/'(?:''|[^'])*'|"[^"]*"/g, (m) => { strings.push(m); return `\0${strings.length - 1}\0`; });
    t = t.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '');
    t = t.replace(/\s+/g, ' ').trim();
    const out = [];
    const pieces = t.split(CLAUSE_RX);
    let cur = '';
    for (const p of pieces) {
      if (p === undefined) continue;
      const up = p.toUpperCase().trim();
      if (CLAUSES.includes(up)) {
        out.push(cur.replace(/\s+$/, ''));
        cur = MAJOR.has(up) ? up + ' ' : indent + up + ' ';
      } else {
        let piece = p;
        if (cur.startsWith('SELECT') || cur.startsWith('SET')) {
          piece = piece.replace(/,\s*/g, ',\n' + indent);
        }
        cur += piece.trim() ? piece.trim() + ' ' : '';
      }
    }
    out.push(cur.replace(/\s+$/, ''));
    const res = out.filter((l) => l.trim()).join('\n');
    return res.replace(/\0(\d+)\0/g, (_, i) => strings[parseInt(i, 10)]);
  },
  { text: true }
);
