import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseTar } from './_tar.js';

module('Untar', 'Lists a tar archive, or extracts one file from it (the only file is extracted automatically).', [A.string('Extract file (name)', '')],
  (data, name) => {
    const all = parseTar(data);
    const files = all.filter(e => e.typeflag === '0' || e.typeflag === '\0');
    const target = name || (files.length === 1 ? files[0].name : '');
    if (target) {
      const e = files.find(e => e.name === target);
      if (!e) throw new Error(`No such file in archive: ${target}`);
      return e.content;
    }
    return all.map(e => `${String(e.size).padStart(10)}  ${e.name}`).join('\n') + "\n\nSet 'Extract file' to a name above to extract it.";
  });
