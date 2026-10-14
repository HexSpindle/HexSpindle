import { module } from './_cat.js';
import { A } from '../../core/registry.js';

let tablesPromise = null;
function getTables() {
  if (!tablesPromise) tablesPromise = import('./_oui_data.mjs').then(d => {
    const toMap = packed => { const m = new Map(); for (const line of packed.split('\n')) { if (!line) continue; const [hex, short, long] = line.split('\t'); m.set(hex, { short, long: long || short }); } return m; };
    return { mal: toMap(d.MAL), mam: toMap(d.MAM), mas: toMap(d.MAS) };
  });
  return tablesPromise;
}

// Find MAC addresses / OUI prefixes in the input. Separated (3–8 octets, ':' or '-') and Cisco dotted forms are
// matched anywhere — so MACs embedded in log lines (ipconfig, DHCP, ARP) are resolved — while bare hex is only
// accepted when a whole line is exactly 6/12/16 hex digits, to avoid matching hashes, IDs or offsets in prose.
const EMBEDDED = /\b[0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){2,7}\b|\b[0-9A-Fa-f]{4}(?:\.[0-9A-Fa-f]{4}){1,3}\b/g;
function findMacs(text) {
  const tokens = [];
  for (const m of text.matchAll(EMBEDDED)) tokens.push(m[0]);
  for (const line of text.split(/\r?\n/)) { const s = line.trim(); if (/^(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{12}|[0-9A-Fa-f]{16})$/.test(s)) tokens.push(s); }
  return tokens;
}

function lookup(token, tables) {
  const input = token.trim();
  const hex = input.replace(/[.:-]/g, '').toUpperCase();
  const oui = hex.slice(0, 6).replace(/(..)(..)(..)/, '$1:$2:$3');
  const first = parseInt(hex.slice(0, 2), 16);
  const multicast = !!(first & 0x01), local = !!(first & 0x02);
  let hit = null, block = null;
  if (hex.length >= 9 && tables.mas.has(hex.slice(0, 9))) { hit = tables.mas.get(hex.slice(0, 9)); block = 'MA-S (36-bit)'; }
  else if (hex.length >= 7 && tables.mam.has(hex.slice(0, 7))) { hit = tables.mam.get(hex.slice(0, 7)); block = 'MA-M (28-bit)'; }
  else if (tables.mal.has(hex.slice(0, 6))) { hit = tables.mal.get(hex.slice(0, 6)); block = 'MA-L (24-bit)'; }
  return { input, oui, vendor: hit ? hit.short : '', registrant: hit ? hit.long : '', block: block || '', found: !!hit, local, multicast };
}

const addrNote = r => r.multicast ? 'multicast/broadcast' : r.local ? 'locally administered (randomised/manual — OUI is not a real assignment)' : 'unicast, globally unique';

function detailed(r) {
  const lines = [`${r.input}  [OUI ${r.oui}]`, `    Vendor:     ${r.found ? r.vendor : 'not found in the IEEE registry'}`];
  if (r.found && r.registrant && r.registrant !== r.vendor) lines.push(`    Registrant: ${r.registrant}`);
  if (r.found) lines.push(`    Block:      ${r.block}`);
  lines.push(`    Address:    ${addrNote(r)}`);
  return lines.join('\n');
}

const COLUMNS = [['Input', r => r.input], ['OUI', r => r.oui], ['Vendor', r => r.found ? r.vendor : 'not found'],
  ['Registrant', r => r.registrant], ['Block', r => r.block], ['Address', r => addrNote(r).split(' (')[0]]];
const csvCell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

function table(rows) {
  const cells = rows.map(r => COLUMNS.map(([, get]) => String(get(r) || '-')));
  const widths = COLUMNS.map(([name], i) => Math.min(40, Math.max(name.length, ...cells.map(c => c[i].length))));
  const line = vals => vals.map((v, i) => (v.length > widths[i] ? v.slice(0, widths[i] - 1) + '…' : v).padEnd(widths[i])).join('  ').trimEnd();
  return [line(COLUMNS.map(c => c[0])), line(widths.map(w => '-'.repeat(w))), ...cells.map(line)].join('\n');
}
const flat = r => ({ input: r.input, oui: r.oui, vendor: r.found ? r.vendor : null, registrant: r.found ? r.registrant : null, block: r.block || null, found: !!r.found, locallyAdministered: !!r.local, multicast: !!r.multicast });

function summary(rows) {
  const tally = get => { const m = new Map(); for (const r of rows) { const k = get(r); if (!k) continue; m.set(k, (m.get(k) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
  const block = (title, get, limit = 20) => { const t = tally(get); return `${title}\n${t.slice(0, limit).map(([k, n]) => `${String(n).padStart(6)}  ${k}`).join('\n') || '  (none)'}${t.length > limit ? `\n        … and ${t.length - limit} more` : ''}`; };
  const found = rows.filter(r => r.found).length;
  return [`MAC addresses: ${rows.length} (${new Set(rows.map(r => r.input)).size} distinct), ${found} resolved to a vendor, ${rows.length - found} unknown`
    + `\nAddress types: ${rows.filter(r => !r.local && !r.multicast).length} unicast/global, ${rows.filter(r => r.local).length} locally administered, ${rows.filter(r => r.multicast).length} multicast/broadcast`,
    block('By vendor', r => r.found ? r.vendor : ''), block('By registration block', r => r.block)].join('\n\n');
}

module('MAC Vendor Lookup',
  'Looks up the manufacturer of a network interface from its MAC address or OUI prefix, using the public IEEE registry (MA-L, MA-M and MA-S blocks). '
  + 'Accepts MAC addresses in any common format — 00:1A:2B:3C:4D:5E, 00-1a-2b-3c-4d-5e, 001a.2b3c.4d5e, or bare hex (001A2B / 001A2B3C4D5E) — and finds the longest registered prefix. '
  + 'MACs embedded in log lines (ipconfig, DHCP, ARP) are picked out automatically; text with no MAC in it returns an error rather than a bogus result. Locally administered and multicast/broadcast addresses are flagged. '
  + 'Give one address for a detailed breakdown, or many for a table, CSV, JSON or a summary of counts by vendor.',
  [A.select('Output', ['Auto', 'Detailed', 'Table', 'CSV', 'JSON', 'Summary'])],
  async (t, output = 'Auto') => {
    const tokens = findMacs(t);
    if (!tokens.length) throw new Error('No MAC addresses or OUI prefixes found in the input. Expected e.g. 00:1A:2B:3C:4D:5E, 001a.2b3c.4d5e or 001A2B. (To list the MACs from logs on their own, use Extract MAC addresses.)');
    const tables = await getTables();
    const rows = tokens.map(tok => lookup(tok, tables));
    const mode = output === 'Auto' ? (rows.length === 1 ? 'Detailed' : 'Table') : output;
    if (mode === 'Detailed') return rows.map(detailed).join('\n\n');
    if (mode === 'Table') return table(rows);
    if (mode === 'CSV') return [COLUMNS.map(c => c[0]).concat('Found', 'Local', 'Multicast').join(','),
      ...rows.map(r => [...COLUMNS.map(([, g]) => String(g(r) || '')), r.found, r.local, r.multicast].map(v => csvCell(String(v))).join(','))].join('\n');
    if (mode === 'JSON') return JSON.stringify(rows.map(flat), null, 2);
    return summary(rows);
  }, { text: true, aliases: ['mac', 'oui', 'mac vendor', 'mac address', 'ethernet vendor', 'nic manufacturer'] });
