import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { reFlags } from '../../core/util.js';

const BUILTIN = [
  ['User defined', ''],
  ['IPv4 address', String.raw`\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b`],
  ['IPv6 address', String.raw`(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}`],
  ['Email address', String.raw`\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b`],
  ['URL', String.raw`[A-Za-z][A-Za-z0-9+.-]*://[^\s"'<>]+`],
  ['Domain', String.raw`\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b`],
  ['Windows file path', String.raw`[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*`],
  ['UNIX file path', String.raw`(?:/[A-Za-z0-9_.-]+)+/?`],
  ['MAC address', String.raw`\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b`],
  ['Date (yyyy-mm-dd)', String.raw`\b\d{4}-\d{2}-\d{2}\b`],
  ['Hex string', String.raw`\b(?:[0-9a-fA-F]{2})+\b`],
  ['Number', String.raw`-?\d+(?:\.\d+)?`],
];

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module('Regular expression', 'Searches the input with a regex and highlights or lists the matches.',
  [A.combo('Regex', BUILTIN), A.boolean('Case insensitive', false), A.boolean('Multiline', true), A.boolean('Dot matches all', false),
   A.select('Output format', ['Highlight matches', 'List matches', 'List capture groups', 'List matches with capture groups', 'Count matches'])],
  (t, rx, ci, ml, dot, fmt) => {
    if (!rx) return fmt === 'Highlight matches' ? escapeHtml(t) : t;
    const re = new RegExp(rx, reFlags(ci, ml, dot) + 'g');
    const ms = [...t.matchAll(re)];
    if (fmt === 'Highlight matches') {
      const out = []; let last = 0;
      for (const m of ms) {
        out.push(escapeHtml(t.slice(last, m.index)));
        out.push(`<mark style="background:#7a5c00;color:#ffe08a;border-radius:2px">${escapeHtml(m[0])}</mark>`);
        last = m.index + m[0].length;
      }
      out.push(escapeHtml(t.slice(last)));
      return new Html(`<pre style="white-space:pre-wrap;margin:0">${out.join('')}</pre>`);
    }
    if (fmt === 'Count matches') return String(ms.length);
    if (fmt === 'List matches') return ms.map(m => m[0]).join('\n');
    if (fmt === 'List capture groups') return ms.map(m => m.slice(1).map(g => g || '').join('\t')).join('\n');
    return ms.map(m => m[0] + m.slice(1).map((g, i) => `\n  Group ${i + 1}: ${g}`).join('')).join('\n');
  }, { text: true });
