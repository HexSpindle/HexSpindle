// SPDX-License-Identifier: MIT
// Local, same-origin IOC matching. abuse.ch exports only available if explicitly authorized.
import { feedManifest, readMirrorText, readMirrorCache, writeMirrorCache } from './_feed_mirror.js';
import { formatRows } from './_ip_enrichment.js';
import { StructuredResult } from '../../core/registry.js';

const hot = new Map(), pending = new Map();
const SOURCES = { threatfox: 'abusech_threatfox', urlhaus: 'abusech_urlhaus' };
export function indicatorKey(value) {
  const s = String(value || '').trim();
  if (!s || s.length > 8192) return '';
  // Domains, hashes, and IP addresses are case insensitive. For full URLs preserve
  // exact spelling/path/query: case may change the requested resource.
  return /^https?:\/\//i.test(s) ? s : s.toLowerCase();
}
export function parseIndicators(text) {
  let values = String(text ?? '').trim().split(/\r?\n/g);
  if (values.length === 1 && values[0].startsWith('[')) {
    try { const j = JSON.parse(values[0]); if (Array.isArray(j)) values = j.map(v => typeof v === 'string' ? v : v?.indicator || v?.url || ''); } catch { /* plain lines */ }
  }
  const out = [...new Set(values.map(x => String(x).trim()).filter(Boolean))];
  if (!out.length) throw new Error('Enter one IOC or URL per line');
  if (out.length > 5000) throw new Error('Limit 5,000 indicators per operation run');
  return out;
}
export function parseIndex(text, expected = 'threatfox') {
  const rows = new Map();let seen = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const item = JSON.parse(line);
    const key = indicatorKey(item.indicator);
    if (!key) continue;
    if (expected === 'urlhaus' && !/^https?:\/\//i.test(key)) continue;
    if (!rows.has(key)) rows.set(key, []);
    if (rows.get(key).length < 20) rows.get(key).push(item);
    seen++;
    if (seen > 1500000) throw new Error('Dataset entry limit exceeded');
  }
  if (!seen) throw new Error('Published IOC feed contains no recognized indicators');
  return rows;
}
export async function loadIndex(kind) {
  const id = SOURCES[kind]; if (!id) throw new Error('Unknown IOC feed');
  const manifest = await feedManifest();
  const info = manifest?.datasets?.[id];
  if (!info) throw new Error(`${kind} dataset not published. An API key alone does not authorize public mirroring; the publisher requires the explicit rights-confirmation setting.`);
  const sha=info.sha256;
  if (hot.get(id)?.sha === sha) return hot.get(id);
  if (pending.has(id)) return pending.get(id);
  const job=(async()=>{
    const key=`abusech:${id}`;
    const cached=await readMirrorCache(key);
    if (cached?.sha===sha && Array.isArray(cached.entries)) {
      const value={sha, rows:new Map(cached.entries), info};hot.set(id,value);return value;
    }
    const {text}=await readMirrorText(id,manifest,140_000_000);
    const rows=parseIndex(text,kind);
    const value={sha,rows,info};hot.set(id,value);
    await writeMirrorCache(key,{sha,entries:[...rows.entries()]});
    return value;
  })().finally(()=>pending.delete(id));
  pending.set(id,job);return job;
}
export async function lookupAbusech(kind,input,output='JSON') {
  const tokens=parseIndicators(input), {rows,info}=await loadIndex(kind);
  const items=tokens.map(indicator=>({indicator,found:rows.has(indicatorKey(indicator)),
    source:kind==='threatfox'?'ThreatFox':'URLhaus',
    matches:rows.get(indicatorKey(indicator))||[],
    snapshot_retrieved_at:info.source_retrieved_at}));
  return new StructuredResult(formatRows(items, output), {
    type: 'indicator-enrichment', provider: `abusech_${kind}`, rows: items,
  });
}
