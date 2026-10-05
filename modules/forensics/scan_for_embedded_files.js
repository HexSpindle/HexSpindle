import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { SIGNATURES } from '../../core/filetypes.js';

function indexOfBytes(data, pat, from) {
  outer: for (let i = from; i <= data.length - pat.length; i++) {
    for (let j = 0; j < pat.length; j++) if (data[i + j] !== pat[j]) continue outer;
    return i;
  }
  return -1;
}

module('Scan for Embedded Files', 'Searches the whole input for file signatures at any offset.',
  [A.boolean('Images', true), A.boolean('Documents', true), A.boolean('Archives', true), A.boolean('Executables', true), A.boolean('Include short (2-3 byte) signatures', false)],
  (data, img, doc, arc, exe, short) => {
    const cats = {
      image: img, photoshop: img, ico: img, pdf: doc, rtf: doc, ole2: doc, zip: arc, rar: arc,
      '7-zip': arc, gzip: arc, bzip2: arc, xz: arc, elf: exe, 'windows exe': exe, 'mach-o': exe, java: exe, webassembly: exe,
    };
    const out = [];
    for (const [name, , , magic, off] of SIGNATURES) {
      if (off || (magic.length < 4 && !short)) continue;
      const key = name.toLowerCase();
      let allowed = true;
      for (const k of Object.keys(cats)) { if (key.startsWith(k)) { allowed = cats[k]; break; } }
      if (!allowed) continue;
      let i = indexOfBytes(data, magic, 0);
      while (i !== -1) { out.push([i, name]); i = indexOfBytes(data, magic, i + 1); }
    }
    out.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    const header = "Scanning data for 'magic bytes' which may indicate embedded files. The following results may be false positives and should not be treated as reliable. Any sufficiently long file is likely to contain these magic bytes coincidentally.\n";
    if (!out.length) return header + '\nNo embedded files were found.';
    return header + '\n' + out.map(([o, n]) => `Offset ${o} (0x${o.toString(16)}): ${n}`).join('\n');
  });
