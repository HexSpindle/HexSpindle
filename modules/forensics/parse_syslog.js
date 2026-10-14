import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const FACILITIES = ['kernel', 'user', 'mail', 'daemon', 'auth', 'syslog', 'lpr', 'news', 'uucp', 'cron', 'authpriv', 'ftp', 'ntp', 'audit', 'alert', 'clock', 'local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'];
const SEVERITIES = ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'informational', 'debug'];
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function priority(pri) {
  const n = +pri;
  return { priority: n, facility: `${n >> 3} (${FACILITIES[n >> 3] || 'unknown'})`, severity: `${n & 7} (${SEVERITIES[n & 7]})` };
}

// RFC 5424: <pri>version timestamp host app procid msgid [structured-data] msg
function parse5424(line) {
  const m = /^<(\d{1,3})>(\d) (\S+) (\S+) (\S+) (\S+) (\S+) (?:(-)|(\[.*?\](?:\s*\[.*?\])*))(?: (.*))?$/s.exec(line);
  if (!m) return null;
  const out = { format: 'RFC 5424', ...priority(m[1]), version: +m[2], timestamp: m[3] === '-' ? null : m[3], host: m[4] === '-' ? null : m[4], app: m[5] === '-' ? null : m[5], pid: m[6] === '-' ? null : m[6], messageId: m[7] === '-' ? null : m[7] };
  if (m[9]) { out.structuredData = {}; for (const el of m[9].matchAll(/\[([^\s\]]+)((?:\s+[^\s=\]]+="(?:[^"\\]|\\.)*")*)\]/g)) { const params = {}; for (const p of el[2].matchAll(/([^\s=]+)="((?:[^"\\]|\\.)*)"/g)) params[p[1]] = p[2].replace(/\\(.)/g, '$1'); out.structuredData[el[1]] = params; } }
  out.message = (m[10] || '').replace(/^﻿/, '');
  return out;
}

// RFC 3164 (BSD): <pri>Mmm dd hh:mm:ss host tag: message
function parse3164(line) {
  const m = /^(?:<(\d{1,3})>)?([A-Z][a-z]{2}) {1,2}(\d{1,2}) (\d{2}:\d{2}:\d{2}) (\S+) (.*)$/s.exec(line);
  if (!m) return null;
  const out = { format: m[1] ? 'RFC 3164 (BSD)' : 'BSD syslog (no priority)' };
  if (m[1]) Object.assign(out, priority(m[1]));
  const now = new Date();
  out.timestamp = new Date(Date.UTC(now.getUTCFullYear(), MONTHS[m[2]], +m[3], ...m[4].split(':').map(Number))).toISOString().replace('.000', '').replace(/\d{4}/, 'YYYY');
  out.host = m[5];
  const tag = /^([\w\-./]+)(?:\[(\d+)\])?:?\s*(.*)$/s.exec(m[6]);
  if (tag) { out.tag = tag[1]; if (tag[2]) out.pid = tag[2]; out.message = tag[3]; } else out.message = m[6];
  return out;
}

module('Parse Syslog',
  'Parses syslog messages in RFC 5424 (modern) and RFC 3164 (older BSD) format, with or without a <priority> prefix. Decodes the facility and severity from the priority value, '
  + 'the timestamp, host, application and process ID, and RFC 5424 structured-data elements. One message per line; a line that is not syslog is reported as such.',
  [A.select('Output', ['JSON', 'Table'])],
  (t, output) => {
    const rows = t.split(/\r?\n/).filter(l => l.trim()).map(line => parse5424(line) || parse3164(line) || { format: 'not syslog', message: line });
    if (output === 'Table') {
      const cols = ['severity', 'facility', 'host', 'app', 'tag', 'message'];
      const cell = (r, c) => String((c === 'app' ? r.app || r.tag : r[c]) ?? '').replace(/\s+/g, ' ');
      const widths = cols.map(c => Math.min(60, Math.max(c.length, ...rows.map(r => cell(r, c).length))));
      const fmt = vals => vals.map((v, i) => (v.length > widths[i] ? v.slice(0, widths[i] - 1) + '…' : v).padEnd(widths[i])).join('  ').trimEnd();
      return [fmt(cols), fmt(widths.map(w => '-'.repeat(w))), ...rows.map(r => fmt(cols.map(c => cell(r, c))))].join('\n');
    }
    return JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2);
  }, { text: true, aliases: ['syslog', 'rfc5424', 'rfc3164', 'bsd syslog'] });
