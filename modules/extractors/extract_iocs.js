import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV4_FULL = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6 = /(?<![\w:])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![\w:])/g;
const EMAIL = /[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g;
const URL = /[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s"'<>)\]}]+/g;
const DOMAIN = /\b(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}\b/g;
const MAC = /\b[0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5}\b/g;
const HASH_LENS = [32, 40, 64, 128];
const HASH_RE = /\b[0-9a-fA-F]{32,128}\b/g;
const CVE = /\bCVE-\d{4}-\d{4,7}\b/g;
const REGKEY = /\b(?:HKEY_[A-Z_]+|HKLM|HKCU|HKCR|HKU|HKCC)\\[^\s"'<>]+/g;
const WINPATH = /[A-Za-z]:\\(?:[^\\\/:*?"<>|\r\n]+\\)*[^\\\/:*?"<>|\r\n\s]*/g;
const BTC = /\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{11,71})\b/g;

function isValidIPv6(s) {
  if (/:::/.test(s)) return false;
  if ((s.match(/::/g) || []).length > 1) return false;
  let parts;
  if (s.includes('::')) {
    const [left, right] = s.split('::');
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];
    parts = [...leftParts, ...rightParts];
    if (parts.length > 7) return false;
  } else {
    parts = s.split(':');
    if (parts.length !== 8) return false;
  }
  return parts.every(p => /^[0-9a-fA-F]{1,4}$/.test(p));
}

function uniq(arr) { return [...new Set(arr)]; }

module('Extract IOCs', 'Pulls indicators of compromise (IPs, domains, URLs, emails, hashes, CVEs, registry keys, Windows paths, MAC addresses, Bitcoin addresses) into one de-duplicated, categorised report. Built for incident response and threat-intel triage.',
  [A.select('Output format', ['Grouped text', 'CSV', 'JSON']), A.boolean('Defang IPs/URLs/domains in output', false)],
  (t, fmt, defang) => {
    const domainCandidates = uniq(t.match(DOMAIN) || []).filter(d => !IPV4_FULL.test(d));
    let groups = {
      'IPv4': t.match(IPV4) || [],
      'IPv6': (t.match(IPV6) || []).filter(isValidIPv6),
      'Domain': domainCandidates,
      'URL': t.match(URL) || [],
      'Email': t.match(EMAIL) || [],
      'MD5/SHA1/SHA256/SHA512': (t.match(HASH_RE) || []).filter(h => HASH_LENS.includes(h.length)),
      'CVE': t.match(CVE) || [],
      'Registry key': t.match(REGKEY) || [],
      'Windows path': t.match(WINPATH) || [],
      'MAC address': t.match(MAC) || [],
      'Bitcoin address': t.match(BTC) || [],
    };
    for (const k of Object.keys(groups)) groups[k] = uniq(groups[k]);

    if (defang) {
      const fang = s => s.replaceAll('http', 'hxxp').replaceAll('://', '[://]').replaceAll('.', '[.]');
      for (const k of ['IPv4', 'IPv6', 'Domain', 'URL']) groups[k] = groups[k].map(fang);
    }

    groups = Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length));

    if (fmt === 'JSON') return JSON.stringify(groups, null, 2);

    if (fmt === 'CSV') {
      const lines = ['type,value'];
      for (const [k, vs] of Object.entries(groups)) for (const v of vs) lines.push(`"${k}","${v}"`);
      return lines.join('\n');
    }

    const out = [];
    const total = Object.values(groups).reduce((n, v) => n + v.length, 0);
    out.push(`Total indicators: ${total}  (${Object.entries(groups).map(([k, v]) => `${k}: ${v.length}`).join(', ')})\n`);
    for (const [k, vs] of Object.entries(groups)) {
      out.push(`== ${k} (${vs.length}) ==`);
      out.push(...vs);
      out.push('');
    }
    return out.join('\n').trimEnd();
  }, { text: true });
