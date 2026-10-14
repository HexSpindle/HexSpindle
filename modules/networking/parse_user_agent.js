import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseUserAgent } from './_user_agent.js';

const detailed = ua => `Browser
    Name: ${ua.browser.name || 'unknown'}
    Version: ${ua.browser.version || 'unknown'}
Device
    Model: ${ua.device.model || 'unknown'}
    Type: ${ua.device.type || 'unknown'}
    Vendor: ${ua.device.vendor || 'unknown'}
Engine
    Name: ${ua.engine.name || 'unknown'}
    Version: ${ua.engine.version || 'unknown'}
OS
    Name: ${ua.os.name || 'unknown'}
    Version: ${ua.os.version || 'unknown'}
CPU
    Architecture: ${ua.cpu.architecture || 'unknown'}`;

// A line is treated as a user agent if it carries a product/version token (Mozilla/5.0, curl/8.4.0, HTTP libs)
// or a well-known UA marker, or the engine recognises a client/OS/engine. This rejects log prose and prompts.
// Decide whether a line is a user agent. Many legitimate clients (bots, scanners, HTTP libraries) do not use the
// Product/Version form, so a line counts as a UA when it carries a product/version token OR the engine recognises
// a specific client/OS/engine in it. Two guards suppress false positives: HTTP request lines (which also contain a
// slash-version), and the tabular "Label . . . . : value" layout of command output (ipconfig, systeminfo, netsh),
// where the engine would otherwise latch onto an isolated word such as "Node".
const UA_HINT = /\S\/\d|\b(?:Mozilla|Opera|AppleWebKit|Gecko|Trident|Presto|KHTML|Chrome|Safari|Firefox|Edge?|bot|crawler|spider|curl|Wget|okhttp|Dalvik|CFNetwork|facebookexternalhit)\b/i;
const REQUEST_LINE = /^(?:GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT|TRACE|PROPFIND|MKCOL)\b.*\bHTTP\/\d/i;
const TABULAR_PROSE = /(?:[.…]\s+){2,}|\.\s*\.\s*\.|:\s*$/;
const recognised = line => { const p = parseUserAgent(line); return !!(p.browser.name || p.os.name || p.engine.name); };
export const looksLikeUserAgent = line => !REQUEST_LINE.test(line) && !TABULAR_PROSE.test(line) && (UA_HINT.test(line) || recognised(line));

const COLUMNS = [['Client', r => r.browser.name], ['Version', r => r.browser.version], ['Kind', r => r.kind], ['OS', r => r.os.name], ['OS version', r => r.os.version],
  ['Device', r => r.device.model], ['Vendor', r => r.device.vendor], ['Type', r => r.device.type], ['Engine', r => r.engine.name], ['CPU', r => r.cpu.architecture]];
const flat = r => Object.fromEntries([...COLUMNS.map(([name, get]) => [name, get(r) || '']), ['User agent', r.ua]]);
const csvCell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

function table(rows) {
  const cells = rows.map(r => COLUMNS.map(([, get]) => String(get(r) || '-')));
  const widths = COLUMNS.map(([name], i) => Math.min(34, Math.max(name.length, ...cells.map(c => c[i].length))));
  const line = values => values.map((v, i) => (v.length > widths[i] ? v.slice(0, widths[i] - 1) + '…' : v).padEnd(widths[i])).join('  ').trimEnd();
  return [line(COLUMNS.map(c => c[0])), line(widths.map(w => '-'.repeat(w))), ...cells.map(line)].join('\n');
}

function summary(rows) {
  const tally = get => { const m = new Map(); for (const r of rows) { const k = get(r) || 'unknown'; m.set(k, (m.get(k) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
  const block = (title, get, limit = 15) => { const t = tally(get); return `${title}\n${t.slice(0, limit).map(([k, n]) => `${String(n).padStart(6)}  ${k}`).join('\n')}${t.length > limit ? `\n        … and ${t.length - limit} more` : ''}`; };
  const automated = rows.filter(r => /bot|scanner|tool|monitoring|automation/.test(r.kind)).length;
  return [`User agents: ${rows.length} (${new Set(rows.map(r => r.ua)).size} distinct), ${automated} automated (bots, scanners, tools, monitoring)`,
    block('By kind', r => r.kind), block('By client', r => r.browser.name), block('By client and major version', r => r.browser.name ? `${r.browser.name} ${String(r.browser.version || '').split('.')[0]}`.trim() : ''),
    block('By operating system', r => r.os.name ? `${r.os.name} ${r.os.version || ''}`.trim() : ''), block('By device type', r => r.device.type), block('By device vendor', r => r.device.vendor)].join('\n\n');
}

module('Parse User Agent',
  'Identifies the client (browser, in-app browser, email client, HTTP library, command-line tool, crawler, monitoring probe or security scanner), its version, the device, rendering engine, operating system and CPU from User-Agent strings. '
  + 'Each input line must be a user-agent string; lines that are not (log prose, headers around the value) are skipped — to pull user agents out of access logs, use Extract User Agents first. '
  + 'Give one user agent for a detailed breakdown, or many (one per line) for a table, CSV, JSON or a summary of counts.',
  [A.select('Output', ['Auto', 'Detailed', 'Table', 'CSV', 'JSON', 'Summary'])],
  (t, output = 'Auto') => {
    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return detailed(parseUserAgent(''));
    const valid = lines.filter(looksLikeUserAgent);
    const skipped = lines.length - valid.length;
    if (!valid.length) throw new Error('No user-agent strings found. A user agent looks like "Mozilla/5.0 (…) …" or "curl/8.4.0". To pull user agents out of access logs or JSON, run "Extract User Agents" first.');
    const rows = valid.map(parseUserAgent);
    const mode = output === 'Auto' ? (rows.length === 1 ? 'Detailed' : 'Table') : output;
    const note = skipped ? `\n\n(${skipped} line${skipped === 1 ? '' : 's'} skipped: not a user-agent string)` : '';
    if (mode === 'Detailed') return rows.map((r, i) => (rows.length > 1 ? `# ${i + 1}: ${r.ua}\n` : '') + detailed(r)).join('\n\n') + note;
    if (mode === 'Table') return table(rows) + note;
    if (mode === 'CSV') return [[...COLUMNS.map(c => c[0]), 'User agent'].join(','), ...rows.map(r => Object.values(flat(r)).map(csvCell).join(','))].join('\n');
    if (mode === 'JSON') return JSON.stringify(rows.map(flat), null, 2);
    return summary(rows) + note;
  }, { text: true, aliases: ['ua', 'useragent', 'user-agent', 'browser detection'] });
