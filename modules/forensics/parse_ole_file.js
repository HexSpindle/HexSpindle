import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { readOle, isOle } from './_ole.js';
import { detect } from '../../core/filetypes.js';

const clsidText = c => c.every(b => b === 0) ? null : `${bytesToHex(c.slice(0, 4).reverse())}-${bytesToHex(c.slice(4, 6).reverse())}-${bytesToHex(c.slice(6, 8).reverse())}-${bytesToHex(c.slice(8, 10))}-${bytesToHex(c.slice(10, 16))}`;
// A few CLSIDs that identify what the document is (and some abused by exploits).
const KNOWN = { '00020906-0000-0000-c000-000000000046': 'Word document', '00020820-0000-0000-c000-000000000046': 'Excel workbook', '00020830-0000-0000-c000-000000000046': 'Excel worksheet',
  '64818d10-4f9b-11cf-86ea-00aa00b929e8': 'PowerPoint presentation', '000c1084-0000-0000-c000-000000000046': 'Windows Installer (MSI)', '00020d0b-0000-0000-c000-000000000046': 'Outlook message',
  '0002ce02-0000-0000-c000-000000000046': 'Equation Editor 3.0 (CVE-2017-11882)', '00021401-0000-0000-c000-000000000046': 'Shell link (LNK)', '0003000c-0000-0000-c000-000000000046': 'OLE Package' };

module('Parse OLE File',
  'Lists the storages and streams inside an OLE compound file (the container used by legacy Office documents .doc/.xls/.ppt, .msi installers, Outlook .msg and vbaProject.bin). '
  + 'Shows the directory tree with each stream\'s size and type, the document CLSID (and names it when known, including the Equation Editor class abused by exploits), and whether VBA macros are present. '
  + 'A stream can be extracted by number. Nothing is executed.',
  [A.number('Stream to extract (0 = list all)', 0)],
  (data, which) => {
    if (!isOle(data)) throw new Error('Not an OLE compound file (it does not start with D0 CF 11 E0)');
    const ole = readOle(data);
    const streams = ole.files.filter(f => !f.isStorage);
    const pick = Math.trunc(which);
    if (pick >= 1) { const s = streams[pick - 1]; if (!s) throw new Error(`There is no stream ${pick} (found ${streams.length})`); return ole.streamOf(s); }
    const root = ole.files.find(f => f.type === 5);
    const lines = ['OLE compound file'];
    const rootClsid = root && clsidText(root.clsid);
    if (rootClsid) lines.push(`Root CLSID: ${rootClsid}${KNOWN[rootClsid] ? ` — ${KNOWN[rootClsid]}` : ''}`);
    lines.push(`${ole.files.filter(f => f.isStorage).length} storage(s), ${streams.length} stream(s)`, '', 'Directory:');
    let n = 0;
    for (const f of ole.files) {
      const depth = f.path.split('/').length - 1;
      if (f.isStorage) { const cls = clsidText(f.clsid); lines.push(`${'  '.repeat(depth + 1)}[${f.type === 5 ? 'Root' : 'Storage'}] ${f.name}${cls && KNOWN[cls] ? `  (${KNOWN[cls]})` : ''}`); }
      else { n++; const file = detect(ole.streamOf(f).subarray(0, 64))[0]; lines.push(`${'  '.repeat(depth + 1)}#${n} ${f.name}  ${f.size} bytes${file ? `  [${file[0]}]` : ''}`); }
    }
    const hasVba = ole.files.some(f => /(^|\/)(VBA|Macros)(\/|$)/i.test(f.path) || /\/VBA\//i.test(f.path + '/'));
    const equation = ole.files.some(f => { const c = clsidText(f.clsid); return c && /0002ce0[0-9a-f]/i.test(c); });
    if (hasVba) lines.push('', 'This document contains VBA macros (a VBA / Macros storage is present). Use Extract VBA Macros to read them.');
    if (equation) lines.push('', 'An Equation Editor object is embedded — a common exploit vehicle (CVE-2017-11882 / CVE-2018-0802).');
    lines.push('', 'Use "Stream to extract" to pull a stream out by its # number.');
    return lines.join('\n');
  }, { aliases: ['ole', 'cfbf', 'ole2', 'compound file', 'doc', 'xls', 'msg', 'msi', 'structured storage'] });
