import { module } from './_cat.js';

const QUALIFIER = { '+': 'pass', '-': 'fail (reject)', '~': 'softfail (accept but mark)', '?': 'neutral' };
const MECHANISM = {
  all: () => 'every other sender', ip4: v => `IPv4 ${v}`, ip6: v => `IPv6 ${v}`, a: v => `the A / AAAA records of ${v || 'this domain'}`, mx: v => `the mail servers (MX) of ${v || 'this domain'}`,
  include: v => `whatever ${v}'s SPF record allows`, exists: v => `senders for which ${v} resolves`, ptr: v => `hosts whose reverse DNS is under ${v || 'this domain'}`,
};
// Each of these costs the receiver a DNS query; RFC 7208 allows ten in total.
const LOOKUPS = new Set(['include', 'a', 'mx', 'ptr', 'exists', 'redirect']);

module('Parse SPF Record',
  'Explains an SPF record (the "v=spf1 …" TXT record that lists who may send mail for a domain): every mechanism in plain words, in the order receivers evaluate them, '
  + 'with warnings for the common mistakes (+all, no terminating all, more than ten DNS lookups, deprecated ptr).',
  [],
  (t) => {
    const record = t.replace(/^[^"]*?TXT\s+/i, '').replace(/"\s*"/g, '').replace(/^"|"$/g, '').trim();
    if (!/^v=spf1(?:\s|$)/i.test(record)) throw new Error('An SPF record starts with v=spf1');
    const lines = [`Record: ${record}`, ''], warnings = [];
    let lookups = 0, sawAll = false, redirect = null;
    for (const term of record.split(/\s+/).slice(1)) {
      const mod = /^(redirect|exp)=(.+)$/i.exec(term);
      if (mod) {
        if (mod[1].toLowerCase() === 'redirect') { redirect = mod[2]; lookups++; lines.push(`redirect      use ${mod[2]}'s SPF record instead when nothing above matched`); }
        else lines.push(`exp           explanation text for rejections is published at ${mod[2]}`);
        continue;
      }
      const m = /^([+\-~?]?)([a-z0-9]+)(?:[:=]?(.*))?$/i.exec(term), name = m ? m[2].toLowerCase() : '';
      if (!m || !MECHANISM[name]) { lines.push(`?             ${term}  (not a recognised mechanism)`); warnings.push(`"${term}" is not a valid SPF term; receivers treat the whole record as a permanent error`); continue; }
      const value = (m[3] || '').replace(/^[:/]/, c => c === '/' ? '/' : '');
      if (LOOKUPS.has(name)) lookups++;
      if (sawAll) warnings.push(`"${term}" comes after "all" and is never evaluated`);
      if (name === 'all') { sawAll = true; if ((m[1] || '+') === '+') warnings.push('"+all" lets anyone send as this domain'); else if (m[1] === '?') warnings.push('"?all" gives no protection: unlisted senders are neither passed nor failed'); }
      if (name === 'ptr') warnings.push('"ptr" is deprecated (RFC 7208) and slow; many receivers ignore it');
      lines.push(`${(m[1] || '+').padEnd(2)}${name.padEnd(12)}${QUALIFIER[m[1] || '+']}: ${MECHANISM[name](value)}`);
    }
    if (!sawAll && !redirect) warnings.push('no "all" mechanism or redirect: unlisted senders get a neutral result');
    if (lookups > 10) warnings.push(`${lookups} DNS-querying terms: more than the limit of 10, so receivers return a permanent error`);
    lines.push('', `DNS-querying terms: ${lookups} of 10 allowed (nested includes count too)`);
    if (record.length > 255) warnings.push('longer than 255 characters: must be published as several quoted strings in one TXT record');
    lines.push('', warnings.length ? 'Warnings:\n' + warnings.map(w => `  - ${w}`).join('\n') : 'No problems found.');
    return lines.join('\n');
  }, { text: true, aliases: ['spf', 'sender policy framework', 'v=spf1'] });
