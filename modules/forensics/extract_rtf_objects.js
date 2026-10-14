import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1, bytesToHex } from '../../core/util.js';
import { detect } from '../../core/filetypes.js';

// Extracts embedded objects from an RTF document. Malicious RTF hides payloads (OLE packages, equation-editor
// exploits, linked objects) in \object groups as hex-encoded \objdata. This decodes them without any rendering.
function hexDecode(text) {
  const h = text.replace(/[^0-9a-fA-F]/g, '');
  return Uint8Array.from((h.length % 2 ? h.slice(0, -1) : h).match(/../g) || [], x => parseInt(x, 16));
}

// An OLE1 "Package" / native object stream begins with a header naming the real class and file.
function describeObject(bytes) {
  const text = decodeLatin1(bytes.subarray(0, 512));
  const className = /^\x01\x05\x00\x00\x02\x00\x00\x00([\x20-\x7e]{1,64})\x00/.exec(text)?.[1] || /([A-Za-z][\w.]{2,40})\x00/.exec(text)?.[1];
  const file = detect(bytes)[0];
  // An OLE package embeds the original filename and path as null-terminated strings after the header.
  const strings = [...text.matchAll(/([\x20-\x7e]{4,})\x00/g)].map(m => m[1]).slice(0, 4);
  return { className, fileType: file ? `${file[0]} (${file[2]})` : null, strings };
}

module('Extract RTF Objects',
  'Extracts the embedded objects from an RTF document. Malicious RTF files hide payloads — OLE packages, equation-editor exploit objects, linked files — inside \\object groups as hex-encoded \\objdata. '
  + 'This decodes each one back to bytes, identifies its OLE class and file type, and lists or extracts them. The document is never rendered and nothing is executed.',
  [A.number('Object to extract (0 = list all)', 0)],
  (data, which) => {
    const text = decodeLatin1(data);
    if (!/^\s*\{\\rtf/.test(text)) throw new Error('This does not start with {\\rtf; it is not an RTF document');
    // \objdata holds the object as hex; \*\objclass names its type; some samples also use \binN with raw bytes.
    const objects = [...text.matchAll(/\\objdata\b([\s\S]*?)(?:\}|\\objdata|\\result)/g)].map(m => hexDecode(m[1]));
    const classes = [...text.matchAll(/\\objclass\s+([^\\{}]+)/g)].map(m => m[1].trim());
    // Also pull any standalone hex blobs after \bin or in \*\datastore, which some droppers use.
    if (!objects.length) throw new Error('No \\objdata objects found in this RTF');
    const pick = Math.trunc(which);
    if (pick >= 1) { const o = objects[pick - 1]; if (!o) throw new Error(`There is no object ${pick} (found ${objects.length})`); return o; }
    const lines = [`${objects.length} embedded object(s) in this RTF:`, ''];
    objects.forEach((o, i) => {
      const d = describeObject(o);
      lines.push(`  ${i + 1}. ${o.length} bytes  OLE class: ${classes[i] || d.className || 'unknown'}${d.fileType ? `  content: ${d.fileType}` : ''}`);
      if (d.strings.length) lines.push(`       embedded strings: ${d.strings.map(s => JSON.stringify(s)).join(', ')}`);
      lines.push(`       first bytes: ${bytesToHex(o.subarray(0, 16))}`);
    });
    const equation = objects.some(o => decodeLatin1(o).includes('Equation') || classes.some(c => /Equation/i.test(c)));
    if (equation) lines.push('', 'An Equation Editor object is present — a classic vehicle for CVE-2017-11882 / CVE-2018-0802. Treat with care.');
    lines.push('', 'Use "Object to extract" to pull one out, then Detect File Type or Parse OLE File on it.');
    return lines.join('\n');
  }, { aliases: ['rtf', 'objdata', 'rtf objects', 'maldoc', 'equation editor', 'cve-2017-11882'] });
