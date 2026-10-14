import { module } from './_cat.js';
import { decodeLatin1 } from '../../core/util.js';

// A static triage of a PDF, in the spirit of pdfid: it counts structural keywords and flags the ones that make a
// PDF able to act on opening (JavaScript, auto-run actions, launches, embedded files). It does not render anything.
const KEYWORDS = ['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref'];
const RISKY = [
  ['/JavaScript', 'JavaScript is present'], ['/JS', 'JavaScript is present (abbreviated)'], ['/OpenAction', 'an action runs automatically when the document opens'],
  ['/AA', 'additional actions run on events (page open, field change, …)'], ['/Launch', 'can launch an external application or command'], ['/EmbeddedFile', 'contains an embedded file'],
  ['/URI', 'contains a link to a URL'], ['/SubmitForm', 'can submit form data to a URL'], ['/GoToR', 'can open another (possibly remote) document'], ['/GoToE', 'can go to an embedded document'],
  ['/ImportData', 'can import external data'], ['/RichMedia', 'contains rich media (Flash / video)'], ['/XFA', 'uses an XFA form (scriptable)'], ['/AcroForm', 'contains a form'], ['/ObjStm', 'uses object streams (can hide objects)'],
];

const countAll = (text, needle) => { let n = 0, i = 0; while ((i = text.indexOf(needle, i)) >= 0) { n++; i += needle.length; } return n; };

export function analysePdf(text) {
  const header = /%PDF-(\d\.\d)/.exec(text.slice(0, 1024));
  if (!header) throw new Error('No %PDF- header found; this is not a PDF');
  const lines = [`PDF version ${header[1]}`, `Size: ${text.length} bytes`];
  const objs = countAll(text, ' obj') || countAll(text, '0 obj');
  lines.push(`Objects: about ${(text.match(/\b\d+\s+\d+\s+obj\b/g) || []).length}`, `Streams: ${countAll(text, 'stream') - countAll(text, 'endstream')}`,
    `Cross-reference updates (startxref): ${countAll(text, 'startxref')}  ${countAll(text, 'startxref') > 1 ? '(the file was updated after creation — incremental updates can hide content)' : ''}`.trimEnd());
  // The /Names, /EmbeddedFile and action dictionaries are where droppers hide their payload entry points.
  lines.push('', 'Structural keywords:', ...KEYWORDS.map(k => `  ${k.padEnd(10)} ${(text.match(new RegExp(`\\b${k}\\b`, 'g')) || []).length}`));
  const findings = [];
  lines.push('', 'Active-content and risk markers:');
  for (const [key, meaning] of RISKY) { const n = countAll(text, key) + countAll(text, key.replace('/', '/#4a').slice(0, 0) || key); if (n) { lines.push(`  ${key.padEnd(14)} ${String(n).padStart(3)}  ${meaning}`); if (/JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|SubmitForm|GoToR|ImportData/.test(key)) findings.push(key); } }
  // Pull out the URLs and launch targets for a quick look.
  const uris = [...new Set((text.match(/\/URI\s*\(((?:\\.|[^()\\])*)\)/g) || []).map(m => m.replace(/^\/URI\s*\(|\)$/g, '')))].slice(0, 20);
  if (uris.length) lines.push('', 'URLs:', ...uris.map(u => `  ${u}`));
  const launches = [...new Set((text.match(/\/Launch[\s\S]{0,200}?\/(?:F|Win)[\s\S]{0,60}?\(((?:\\.|[^()\\])*)\)/g) || []))];
  if (launches.length) lines.push('', 'Launch actions found — inspect these manually.');
  if (/\/JavaScript|\/JS/.test(text)) {
    // PDF string literals allow balanced parentheses, so read each /JS (...) with a depth counter.
    const js = [];
    for (const m of text.matchAll(/\/(?:JavaScript|JS)\s*\(/g)) {
      let i = m.index + m[0].length, depth = 1, s = '';
      for (; i < text.length && depth; i++) { const c = text[i]; if (c === '\\') { s += text[i] + (text[i + 1] || ''); i++; continue; } if (c === '(') depth++; else if (c === ')') { if (--depth === 0) break; } s += c; }
      if (s) js.push(s);
      if (js.length >= 3) break;
    }
    if (js.length) lines.push('', 'Inline JavaScript (first fragments):', ...js.map(j => `  ${j.replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, '$1').slice(0, 160)}`));
  }
  lines.push('', findings.length ? `This PDF can act when opened (${[...new Set(findings)].join(', ')}). Treat it as suspicious and analyse its streams (Extract PDF Streams) before opening.` : 'No active-content markers were found.');
  return lines.join('\n');
}

module('Analyse PDF',
  'Triages a PDF without rendering it, the way pdfid does: counts the structural keywords and flags the markers that let a PDF act when it opens — '
  + 'JavaScript (/JS, /JavaScript), automatic actions (/OpenAction, /AA), application launches (/Launch), embedded files, form submissions and links. '
  + 'Lists the embedded URLs and the first JavaScript fragments. Nothing in the document is executed.',
  [],
  (data) => analysePdf(decodeLatin1(data)), { aliases: ['pdf', 'pdfid', 'malicious pdf', 'pdf analysis', 'maldoc'] });
