import { module } from './_cat.js';
import { A } from '../../core/registry.js';

let lib = null;
/** The sql-formatter bundle is ~66 KB, so it is only fetched the first time this op runs. */
async function formatter() {
  if (!lib) lib = await import('./_sql_formatter.mjs');
  return lib;
}

module('SQL Beautify', 'Indents and pretty-prints SQL (sql-formatter, MySQL dialect).', [A.string('Indent string', '\\t')],
  async (t, indent) => {
    const { formatDialect, mysql } = await formatter();
    const indentStr = indent.replace(/\\t/g, '\t');
    // Bind variables (:name) are not valid MySQL, so hide them behind placeholders while formatting.
    const binds = {};
    let n = 0;
    const masked = t.replace(/:\w+/g, (m) => { const p = `__BIND_${n++}__`; binds[p] = m; return p; });
    const out = formatDialect(masked, {
      dialect: mysql,
      useTabs: indentStr === '\t',
      tabWidth: indentStr.length || 4,
      indentStyle: 'standard',
    });
    return out.replace(/__BIND_\d+__/g, (m) => binds[m] || m);
  },
  { text: true }
);
