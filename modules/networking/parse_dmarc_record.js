import { module } from './_cat.js';

const POLICY = { none: 'take no action (monitor only)', quarantine: 'treat as suspicious (usually the spam folder)', reject: 'reject the message' };
const ALIGNMENT = { r: 'relaxed (same organisational domain)', s: 'strict (exact domain match)' };
const TAGS = {
  v: () => 'version', p: v => `policy for the domain: ${POLICY[v] || 'not a valid policy'}`, sp: v => `policy for subdomains: ${POLICY[v] || 'not a valid policy'}`,
  np: v => `policy for non-existent subdomains: ${POLICY[v] || 'not a valid policy'}`, pct: v => `applies to ${v}% of failing mail`, rua: v => `aggregate reports go to ${v.replace(/mailto:/gi, '').split(',').join(', ')}`,
  ruf: v => `failure (forensic) reports go to ${v.replace(/mailto:/gi, '').split(',').join(', ')}`, adkim: v => `DKIM alignment: ${ALIGNMENT[v] || v}`, aspf: v => `SPF alignment: ${ALIGNMENT[v] || v}`,
  fo: v => `failure report options: ${v}`, rf: v => `failure report format: ${v}`, ri: v => `aggregate report interval: ${v} seconds`,
};

module('Parse DMARC Record',
  'Explains a DMARC record (the "v=DMARC1; p=…" TXT record published at _dmarc.domain): what receivers are asked to do with mail that fails SPF and DKIM alignment, where reports go, '
  + 'and what is weak about the policy (p=none, partial pct, no reporting address, or a looser subdomain policy).',
  [],
  (t) => {
    const record = t.replace(/^[^"]*?TXT\s+/i, '').replace(/"\s*"/g, '').replace(/"/g, '').trim();
    if (!/^v=DMARC1\b/i.test(record)) throw new Error('A DMARC record starts with v=DMARC1');
    const tags = {};
    for (const part of record.split(';')) { const eq = part.indexOf('='); if (eq > 0) tags[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim(); }
    const lines = [`Record: ${record}`, ''], warnings = [];
    for (const [k, v] of Object.entries(tags)) lines.push(`${k.padEnd(6)} ${TAGS[k] ? TAGS[k](v.toLowerCase() === v || k === 'rua' || k === 'ruf' ? v : v.toLowerCase()) : 'unknown tag'}${k === 'v' ? '' : ''}`);
    const p = (tags.p || '').toLowerCase(), sp = (tags.sp || '').toLowerCase(), strength = { none: 0, quarantine: 1, reject: 2 };
    if (!POLICY[p]) warnings.push('p= is missing or invalid: the record is not a usable policy');
    else if (p === 'none') warnings.push('p=none only monitors: spoofed mail is still delivered');
    if (sp && POLICY[sp] && POLICY[p] && strength[sp] < strength[p]) warnings.push(`subdomains get a weaker policy (sp=${sp}) than the domain itself`);
    if (tags.pct && +tags.pct < 100) warnings.push(`pct=${tags.pct}: the policy applies to only part of the failing mail`);
    if (!tags.rua) warnings.push('no rua address: the domain owner receives no aggregate reports');
    lines.push('', warnings.length ? 'Warnings:\n' + warnings.map(w => `  - ${w}`).join('\n') : 'No problems found.');
    return lines.join('\n');
  }, { text: true, aliases: ['dmarc', '_dmarc', 'v=dmarc1'] });
