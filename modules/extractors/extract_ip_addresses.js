import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

const toInt = ip => ip.split('.').reduce((n, x) => n * 256 + +x, 0);

// Ranges that are not reachable on the public internet: this-network, private (RFC 1918),
// carrier-grade NAT, loopback, link-local and the limited broadcast address.
const INTERNAL = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['255.255.255.255', 32],
].map(([base, bits]) => [toInt(base), 2 ** (32 - bits)]);

const isInternal = ip => { const n = toInt(ip); return INTERNAL.some(([start, size]) => n >= start && n < start + size); };

module('Extract IP addresses',
  'Pulls IPv4 addresses out of text. Internal addresses are private (10/8, 172.16/12, 192.168/16), loopback (127/8), ' +
  'link-local (169.254/16), carrier-grade NAT (100.64/10), 0.0.0.0/8 and 255.255.255.255; every other address counts as external.',
  [A.boolean('Sort', true), A.boolean('Unique', true), A.boolean('Exclude internal addresses', false), A.boolean('Exclude external addresses', false)],
  (t, sort, uniq, noInternal = false, noExternal = false) => {
    let found = t.match(IPV4) || [];
    if (noInternal) found = found.filter(ip => !isInternal(ip));
    if (noExternal) found = found.filter(ip => isInternal(ip));
    if (uniq) found = [...new Set(found)];
    if (sort) found.sort((a, b) => toInt(a) - toInt(b));
    return found.join('\n');
  }, { text: true });
