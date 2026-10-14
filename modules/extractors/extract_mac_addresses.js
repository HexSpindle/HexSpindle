import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// Unambiguous MAC forms are matched by default. Bare 12-hex is opt-in because it also matches hashes and IDs.
const COLON = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g;      // 00:1a:2b:3c:4d:5e or 00-1a-2b-...
const CISCO = /\b[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\b/g; // 001a.2b3c.4d5e
const BARE = /\b[0-9A-Fa-f]{12}\b/g;

const normalise = mac => { const h = mac.replace(/[^0-9A-Fa-f]/g, '').toLowerCase(); return h.match(/../g).join(':'); };

module('Extract MAC addresses',
  'Pulls MAC addresses out of arbitrary text — ipconfig / ifconfig output, DHCP leases, ARP tables, switch logs. '
  + 'Matches colon- and hyphen-separated addresses and, optionally, Cisco dotted (001a.2b3c.4d5e) and bare 12-hex forms. '
  + 'Feed the result into MAC Vendor Lookup to identify the manufacturers.',
  [A.boolean('Unique', true), A.boolean('Include Cisco dotted form', true), A.boolean('Include bare 12-hex (also matches hashes / IDs)', false),
    A.boolean('Normalise to 00:1a:2b:3c:4d:5e', false), A.boolean('Sort', false)],
  (t, uniq, cisco, bare, norm, sort) => {
    let found = t.match(COLON) || [];
    if (cisco) found = found.concat(t.match(CISCO) || []);
    if (bare) found = found.concat(t.match(BARE) || []);
    if (norm) found = found.map(normalise);
    if (uniq) { const seen = new Set(); found = found.filter(m => { const k = m.replace(/[^0-9A-Fa-f]/g, '').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); }
    if (sort) found = found.slice().sort((a, b) => a.replace(/[^0-9A-Fa-f]/g, '').localeCompare(b.replace(/[^0-9A-Fa-f]/g, '')));
    return found.join('\n');
  }, { text: true, aliases: ['mac', 'extract mac', 'mac address', 'ethernet address'] });
