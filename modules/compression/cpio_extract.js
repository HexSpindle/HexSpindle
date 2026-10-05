import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';

module('CPIO Extract', "Lists a 'newc' format cpio archive, or extracts one file from it.", [A.string('Extract file (name)', '')],
  (data, name) => {
    let i = 0;
    const files = [];
    const ascii = decodeLatin1(data);
    while (i + 110 <= data.length) {
      if (ascii.substr(i, 6) !== '070701') break;
      const fields = [];
      for (let j = 0; j < 13; j++) fields.push(parseInt(ascii.substr(i + 6 + j * 8, 8), 16));
      const namesize = fields[11], filesize = fields[6];
      i += 110;
      const fname = ascii.substr(i, namesize - 1);
      i += namesize;
      i += (4 - (i % 4)) % 4;
      if (fname === 'TRAILER!!!') break;
      const content = data.subarray(i, i + filesize);
      i += filesize;
      i += ((4 - (i % 4)) % 4);
      files.push([fname, content]);
    }
    const target = name || (files.length === 1 ? files[0][0] : '');
    if (target) {
      for (const [fname, content] of files) if (fname === target) return content;
      throw new Error(`No such file in archive: ${target}`);
    }
    return files.map(([n, c]) => `${String(c.length).padStart(10)}  ${n}`).join('\n') + "\n\nSet 'Extract file' to a name above to extract it.";
  });
