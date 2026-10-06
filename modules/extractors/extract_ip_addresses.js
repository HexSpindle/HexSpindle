
import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

// Capture full IPv6-like tokens, then validate all eight 16-bit groups.
// This also accepts compressed, IPv4-embedded and zone-scoped IPv6,
// including [IPv6] in URLs.
const IPV6_CANDIDATE = /\[[0-9a-fA-F:.]+(?:%[A-Za-z0-9_.~-]+)?\]|[0-9a-fA-F:.]+(?:%[A-Za-z0-9_.~-]+)?/g;

const toInt = ip => ip.split('.').reduce((n, x) => n * 256 + +x, 0);

const validIPv4 = ip =>
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(ip);

// Preserve the original IPv4 internal/external classification.
const INTERNAL_V4 = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['255.255.255.255', 32],
].map(([base, bits]) => [toInt(base), 2 ** (32 - bits)]);

const isInternalIPv4 = ip => {
  const n = typeof ip === 'number' ? ip : toInt(ip);
  return INTERNAL_V4.some(
    ([start, size]) => n >= start && n < start + size
  );
};

// Return the 128-bit numeric address, and its IPv4 component if mapped.
// Validate before accepting: merely containing colons is not enough for IPv6.
function parseIPv6(address) {
  const percent = address.indexOf('%');
  const zone = percent < 0 ? '' : address.slice(percent);

  if (percent >= 0 && !/^%[A-Za-z0-9_.~-]+$/.test(zone)) {
    return null;
  }

  let ip = percent < 0 ? address : address.slice(0, percent);
  if (!ip.includes(':')) return null;

  if (ip.includes('.')) {
    const lastColon = ip.lastIndexOf(':');
    const v4 = ip.slice(lastColon + 1);

    if (lastColon < 0 || !validIPv4(v4)) return null;

    const n = toInt(v4);
    ip = ip.slice(0, lastColon + 1) +
      (n >>> 16).toString(16) + ':' +
      (n & 0xffff).toString(16);
  }

  const split = ip.split('::');
  if (split.length > 2) return null;

  const left = split[0] ? split[0].split(':') : [];
  const right = split.length === 2 && split[1]
    ? split[1].split(':')
    : [];

  const groups = [...left, ...right];

  if (groups.some(x => !/^[0-9a-fA-F]{1,4}$/.test(x))) {
    return null;
  }

  if (split.length === 1 && groups.length !== 8) return null;
  if (split.length === 2 && groups.length >= 8) return null;

  const full = [
    ...left,
    ...Array(split.length === 2 ? 8 - groups.length : 0).fill('0'),
    ...right,
  ];

  let value = 0n;

  for (const group of full) {
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }

  const mappedIPv4 = value >> 32n === 0xffffn
    ? Number(value & 0xffffffffn)
    : null;

  return { value, zone, mappedIPv4 };
}

const inPrefix = (value, base, bits) =>
  (value >> BigInt(128 - bits)) ===
  (base >> BigInt(128 - bits));

const PREFIXES = {
  global: parseIPv6('2000::').value,
  nat64: parseIPv6('64:ff9b::').value,
};

// Known non-global blocks within 2000::/3.
const INTERNAL_V6 = [
  ['2001:2::', 48],    // Benchmarking
  ['2001:10::', 28],   // Deprecated ORCHID
  ['2001:db8::', 32],  // Documentation (RFC 3849)
  ['3fff::', 20],      // Documentation (RFC 9637)
].map(([base, bits]) => [parseIPv6(base).value, bits]);

function isInternalIPv6(parsed) {
  // IPv4-mapped IPv6 inherits its IPv4 classification.
  if (parsed.mappedIPv4 !== null) {
    return isInternalIPv4(parsed.mappedIPv4);
  }

  if (inPrefix(parsed.value, PREFIXES.nat64, 96)) {
    return false;
  }

  // Outside global unicast includes:
  // ::/128, ::1/128, fc00::/7, fe80::/10,
  // ff00::/8 and other reserved/special ranges.
  if (!inPrefix(parsed.value, PREFIXES.global, 3)) {
    return true;
  }

  return INTERNAL_V6.some(
    ([base, bits]) => inPrefix(parsed.value, base, bits)
  );
}

function extractIPs(text) {
  const found = [];
  const ipv6Spans = [];

  for (const match of text.matchAll(IPV6_CANDIDATE)) {
    let ip = match[0];
    let start = match.index;

    if (ip.startsWith('[')) {
      ip = ip.slice(1, -1);
      start++;
    } else {
      // Allow labels such as "ip:2001:db8::1".
      if (/[A-Za-z0-9_]/.test(text[start - 1] || '')) {
        const colon = ip.indexOf(':');
        if (colon < 0) continue;

        start += colon + 1;
        ip = ip.slice(colon + 1);
      }

      if (ip.startsWith(':') && !ip.startsWith('::')) {
        ip = ip.slice(1);
        start++;
      }

      if (ip.endsWith(':') && !ip.endsWith('::')) {
        ip = ip.slice(0, -1);
      }
    }

    if (!ip.includes('::') &&
        (ip.match(/:/g) || []).length < 7) {
      continue;
    }

    const end = start + ip.length;

    if (/[A-Za-z0-9_]/.test(text[end] || '')) {
      continue;
    }

    const parsed = parseIPv6(ip);
    if (!parsed) continue;

    found.push({
      ip,
      start,
      family: 6,
      value: parsed.value,
      internal: isInternalIPv6(parsed),
      key: `6:${parsed.value}:${parsed.zone}`,
    });

    ipv6Spans.push([start, end]);
  }

  let spanIndex = 0;

  for (const match of text.matchAll(IPV4)) {
    const start = match.index;
    const end = start + match[0].length;

    // Avoid extracting IPv4 components of IPv6 addresses twice.
    while (
      spanIndex < ipv6Spans.length &&
      ipv6Spans[spanIndex][1] <= start
    ) {
      spanIndex++;
    }

    if (
      spanIndex < ipv6Spans.length &&
      start < ipv6Spans[spanIndex][1] &&
      end > ipv6Spans[spanIndex][0]
    ) {
      continue;
    }

    const ip = match[0];
    const value = toInt(ip);

    found.push({
      ip,
      start,
      family: 4,
      value,
      internal: isInternalIPv4(value),
      key: `4:${value}`,
    });
  }

  // Preserve original text order when Sort is disabled.
  found.sort((a, b) => a.start - b.start);

  return found;
}

module(
  'Extract IP addresses',

  'Extracts IPv4 and IPv6 addresses (including compressed, scoped and IPv4-mapped IPv6). ' +
  'Internal includes IPv4 private/loopback/link-local/CGNAT and IPv6 local, loopback, multicast, ' +
  'documentation and other non-global ranges. IPv4-mapped IPv6 inherits its embedded IPv4 classification.',

  [
    A.boolean('Sort', true),
    A.boolean('Unique', true),
    A.boolean('Exclude internal addresses', false),
    A.boolean('Exclude external addresses', false),

    // Appended to maintain compatibility with existing recipes.
    A.boolean('Exclude IPv4 addresses', false),
    A.boolean('Exclude IPv6 addresses', false),
  ],

  (
    t,
    sort,
    uniq,
    noInternal = false,
    noExternal = false,
    noIPv4 = false,
    noIPv6 = false
  ) => {
    let found = extractIPs(String(t));

    if (noIPv4) {
      found = found.filter(x => x.family !== 4);
    }

    if (noIPv6) {
      found = found.filter(x => x.family !== 6);
    }

    if (noInternal) {
      found = found.filter(x => !x.internal);
    }

    if (noExternal) {
      found = found.filter(x => x.internal);
    }

    if (uniq) {
      const seen = new Set();

      found = found.filter(x =>
        seen.has(x.key)
          ? false
          : (seen.add(x.key), true)
      );
    }

    if (sort) {
      found.sort(
        (a, b) =>
          a.family - b.family ||
          (a.value < b.value ? -1 : a.value > b.value ? 1 : 0)
      );
    }

    return found.map(x => x.ip).join('\n');
  },

  { text: true }
);
