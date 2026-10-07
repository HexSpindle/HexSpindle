import { fetchJson, pruneEmpty } from './_ip_enrichment.js';

const GOOGLE_DOH = 'https://dns.google/resolve';

export async function doh(name, type) {
  const url = `${GOOGLE_DOH}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&do=1`;
  const { data } = await fetchJson(url, { headers: { Accept: 'application/json' } }, 20000);
  return data || {};
}

export function dnsAnswers(data, type = null) {
  const wanted = type == null ? null : Number(type);
  return (Array.isArray(data?.Answer) ? data.Answer : [])
    .filter(row => wanted == null || Number(row?.type) === wanted)
    .map(row => row?.data)
    .filter(v => typeof v === 'string' && v.length);
}

export function stripDnsDot(value) {
  return String(value || '').replace(/\.$/, '');
}

export function unquoteTxt(value) {
  let s = String(value || '').trim();
  // Google DoH can return one or more quoted TXT chunks. Rejoin them.
  const chunks = [...s.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m => m[1]);
  if (chunks.length) s = chunks.join('');
  return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

export function reverseDnsName(ip) {
  if (!String(ip).includes(':')) return ip.split('.').reverse().join('.') + '.in-addr.arpa';
  const hex = expandIpv6(ip).replace(/:/g, '');
  return [...hex].reverse().join('.') + '.ip6.arpa';
}

export function cymruOriginName(ip) {
  if (!String(ip).includes(':')) return ip.split('.').reverse().join('.') + '.origin.asn.cymru.com';
  const hex = expandIpv6(ip).replace(/:/g, '');
  return [...hex].reverse().join('.') + '.origin6.asn.cymru.com';
}

export function expandIpv6(ip) {
  let value = String(ip).split('%')[0].toLowerCase();
  // Convert an embedded dotted-quad tail to two hex groups first.
  const m = value.match(/(^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (m) {
    const oct = m[2].split('.').map(Number);
    if (oct.some(n => n < 0 || n > 255 || !Number.isInteger(n))) throw new Error('Invalid IPv6 address');
    const pair = ((oct[0] << 8) | oct[1]).toString(16) + ':' + ((oct[2] << 8) | oct[3]).toString(16);
    value = value.slice(0, m.index + (m[1] ? 1 : 0)) + pair;
  }
  const halves = value.split('::');
  if (halves.length > 2) throw new Error('Invalid IPv6 address');
  const left = halves[0] ? halves[0].split(':').filter(Boolean) : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':').filter(Boolean) : [];
  const fill = 8 - left.length - right.length;
  if (fill < 0 || (halves.length === 1 && fill !== 0)) throw new Error('Invalid IPv6 address');
  const groups = halves.length === 2 ? [...left, ...Array(fill).fill('0'), ...right] : left;
  if (groups.length !== 8 || groups.some(g => !/^[0-9a-f]{1,4}$/.test(g))) throw new Error('Invalid IPv6 address');
  return groups.map(g => g.padStart(4, '0')).join(':');
}

export function dnsMeta(data) {
  return pruneEmpty({
    dns_status: data?.Status,
    dnssec_validated: data?.AD,
    recursion_available: data?.RA,
  });
}
