import { module } from './_cat.js';

// CEF: CEF:Version|Vendor|Product|Version|SignatureID|Name|Severity|Extension
// The pipe-separated header uses \| and \\ escapes; the extension is space-separated key=value with \= and \\.
const HEADER_FIELDS = ['cefVersion', 'deviceVendor', 'deviceProduct', 'deviceVersion', 'signatureId', 'name', 'severity'];
const LABELS = { src: 'sourceAddress', dst: 'destinationAddress', spt: 'sourcePort', dpt: 'destinationPort', suser: 'sourceUser', duser: 'destinationUser', proto: 'transportProtocol', act: 'action',
  msg: 'message', shost: 'sourceHost', dhost: 'destinationHost', smac: 'sourceMac', dmac: 'destinationMac', request: 'requestUrl', app: 'applicationProtocol', cnt: 'count', in: 'bytesIn', out: 'bytesOut',
  rt: 'receiptTime', deviceDirection: 'direction', cs1: 'customString1', cs2: 'customString2', dvc: 'deviceAddress', dvchost: 'deviceHost' };

function splitHeader(text) {
  const parts = [];
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\' && i + 1 < text.length) { cur += text[i + 1]; i++; }
    else if (text[i] === '|') { parts.push(cur); cur = ''; }
    else cur += text[i];
  }
  parts.push(cur);
  return parts;
}

function parseExtension(text) {
  const out = {};
  // Keys are tokens; a value runs until the next " key=" boundary.
  const re = /([A-Za-z][\w.]*)=((?:[^\\]|\\.)*?)(?=(?: [A-Za-z][\w.]*=)|$)/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = m[2].replace(/\\([=\\|n r])/g, (_, c) => c === 'n' ? '\n' : c === 'r' ? '\r' : c);
  return out;
}

export function parseCef(line) {
  const start = line.indexOf('CEF:');
  if (start < 0) throw new Error('No "CEF:" header found');
  const syslogPrefix = start > 0 ? line.slice(0, start).trim() : undefined;
  const parts = splitHeader(line.slice(start + 4));
  if (parts.length < 8) throw new Error('A CEF record has 7 header fields and an extension');
  const out = {};
  if (syslogPrefix) out.syslogPrefix = syslogPrefix;
  HEADER_FIELDS.forEach((f, i) => out[f] = parts[i]);
  const ext = parseExtension(parts.slice(7).join('|'));
  // Resolve customString labels (cs1Label names what cs1 holds) and expand short keys to readable names.
  const extension = {};
  for (const [k, v] of Object.entries(ext)) {
    if (/Label$/.test(k)) continue;
    const label = ext[`${k}Label`];
    extension[label || LABELS[k] || k] = v;
  }
  out.extension = extension;
  return out;
}

module('Parse CEF',
  'Parses ArcSight Common Event Format (CEF) log records into JSON: the vendor, product, signature, name and severity from the header, and every key=value pair from the extension. '
  + 'Short extension keys are expanded to readable names, and customString labels (cs1Label, …) are applied. A leading syslog prefix is kept. One record per line.',
  [],
  (t) => {
    const rows = t.split(/\r?\n/).filter(l => l.includes('CEF:')).map(parseCef);
    if (!rows.length) throw new Error('No CEF records found');
    return JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2);
  }, { text: true, aliases: ['cef', 'arcsight', 'common event format'] });
