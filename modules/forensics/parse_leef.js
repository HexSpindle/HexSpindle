import { module } from './_cat.js';

// LEEF 1.0: LEEF:1.0|Vendor|Product|Version|EventID|key=value<tab>key=value
// LEEF 2.0: LEEF:2.0|Vendor|Product|Version|EventID|DelimiterChar|key=value…  (the delimiter can be a single char or x09 / 0x09)
const HEADER_1 = ['leefVersion', 'vendor', 'product', 'version', 'eventId'];

export function parseLeef(line) {
  const start = line.indexOf('LEEF:');
  if (start < 0) throw new Error('No "LEEF:" header found');
  const syslogPrefix = start > 0 ? line.slice(0, start).trim() : undefined;
  const parts = line.slice(start + 5).split('|');
  const version = parts[0];
  const is2 = version.startsWith('2');
  const headerCount = is2 ? 6 : 5;
  if (parts.length < headerCount + 1) throw new Error(`A LEEF ${version} record has ${headerCount} header fields and attributes`);
  const out = {};
  if (syslogPrefix) out.syslogPrefix = syslogPrefix;
  HEADER_1.forEach((f, i) => out[f] = parts[i]);
  let delimiter = '\t';
  if (is2) {
    const d = parts[5];
    delimiter = /^(?:x09|0x09)$/i.test(d) ? '\t' : d.startsWith('x') || d.startsWith('0x') ? String.fromCharCode(parseInt(d.replace(/^0?x/i, ''), 16)) : d || '\t';
  }
  const body = parts.slice(headerCount).join('|');
  const attributes = {};
  for (const pair of body.split(delimiter)) {
    const eq = pair.indexOf('=');
    if (eq > 0) attributes[pair.slice(0, eq).trim()] = pair.slice(eq + 1);
  }
  out.delimiter = delimiter === '\t' ? 'tab' : JSON.stringify(delimiter);
  out.attributes = attributes;
  return out;
}

module('Parse LEEF',
  'Parses IBM QRadar Log Event Extended Format (LEEF) 1.0 and 2.0 records into JSON: the vendor, product and event ID from the header, and every key=value attribute. '
  + 'LEEF 2.0\'s custom delimiter (including the common tab, written x09) is handled. A leading syslog prefix is kept. One record per line.',
  [],
  (t) => {
    const rows = t.split(/\r?\n/).filter(l => l.includes('LEEF:')).map(parseLeef);
    if (!rows.length) throw new Error('No LEEF records found');
    return JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2);
  }, { text: true, aliases: ['leef', 'qradar', 'log event extended format'] });
