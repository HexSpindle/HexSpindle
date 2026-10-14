import { module } from './_cat.js';
import { A } from '../../core/registry.js';

let dataPromise = null;
function getData() {
  if (!dataPromise) dataPromise = import('./_attack_data.mjs').then(d => ({
    collection: d.collection, version: d.version, techniques: d.techniques,
    byId: new Map(d.techniques.map(t => [t.id, t])),
  }));
  return dataPromise;
}

const TACTIC_LABEL = s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const url = id => `https://attack.mitre.org/techniques/${id.replace('.', '/')}`;
const idRe = /^T\d{4}(?:\.\d{3})?$/i;

function card(t, byId) {
  const parent = t.sub ? byId.get(t.id.split('.')[0]) : null;
  const lines = [`${t.id}  ${t.name}${parent ? `   (sub-technique of ${parent.id} ${parent.name})` : ''}`];
  lines.push(`Tactics:    ${t.tactics.map(TACTIC_LABEL).join(', ') || '(none)'}`);
  if (t.platforms.length) lines.push(`Platforms:  ${t.platforms.join(', ')}`);
  lines.push(`Reference:  ${url(t.id)}`, '', t.desc || '(no description)');
  if (t.mitigations.length) lines.push('', `Mitigations: ${t.mitigations.join(', ')}`);
  return lines.join('\n');
}

module('MITRE ATT&CK Lookup',
  'Looks up MITRE ATT&CK (Enterprise) techniques offline. Give one or more technique IDs (such as T1059 or T1059.001) to get each technique\'s name, tactics, platforms, description, mitigations and reference URL; '
  + 'or give a keyword (such as "powershell" or "credential dumping") to search techniques by name. Useful for turning an ID flagged by the other analysis operations into context during triage.',
  [A.select('Mode', ['Auto', 'Technique details', 'Search by keyword']), A.boolean('Search descriptions too (keyword mode)', false), A.number('Max search results', 25, 1)],
  async (t, mode, searchDesc, maxResults) => {
    const { collection, version, techniques, byId } = await getData();
    const tokens = t.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    const ids = tokens.filter(x => idRe.test(x)).map(x => x.toUpperCase());
    const details = mode === 'Technique details' || (mode === 'Auto' && ids.length && ids.length === tokens.length);
    if (details) {
      if (!ids.length) throw new Error('No ATT&CK technique IDs found (expected e.g. T1059 or T1059.001)');
      return ids.map(id => byId.has(id) ? card(byId.get(id), byId) : `${id}  — not found in ${collection} (${version}); it may be deprecated, revoked, or from another ATT&CK domain`).join('\n\n' + '─'.repeat(60) + '\n\n');
    }
    const query = t.trim().toLowerCase();
    if (!query) throw new Error('Enter a technique ID or a keyword to search');
    const limit = Math.max(1, Math.trunc(maxResults));
    const scored = [];
    for (const tech of techniques) {
      const name = tech.name.toLowerCase();
      let score = 0;
      if (name === query) score = 100;
      else if (name.startsWith(query)) score = 80;
      else if (name.includes(query)) score = 60;
      else if (tech.id.toLowerCase() === query) score = 100;
      else if (searchDesc && tech.desc.toLowerCase().includes(query)) score = 30;
      if (score) scored.push([score, tech]);
    }
    if (!scored.length) throw new Error(`No techniques match "${t.trim()}"${searchDesc ? '' : ' (try enabling description search)'}`);
    scored.sort((a, b) => b[0] - a[0] || a[1].id.localeCompare(b[1].id));
    const shown = scored.slice(0, limit);
    const rows = shown.map(([, tech]) => `${tech.id.padEnd(11)} ${tech.name}${tech.tactics.length ? `  [${tech.tactics.map(TACTIC_LABEL).join(', ')}]` : ''}`);
    return `${scored.length} technique(s) match "${t.trim()}" in ${collection} (${version})${scored.length > limit ? `, showing ${limit}` : ''}:\n\n${rows.join('\n')}\n\nGive a specific ID for its full details.`;
  }, { text: true, aliases: ['mitre', 'att&ck', 'attack', 'technique', 'ttp', 'tactics'] });
