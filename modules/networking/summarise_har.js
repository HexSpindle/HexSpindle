import { module } from './_cat.js';

const kb = n => `${(n / 1024).toFixed(1)} KB`;
const top = (map, n, format = v => v) => [...map.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, n).map(([k, v]) => `${String(v.n).padStart(6)}  ${format(v)}  ${k}`);
const add = (map, key, bytes = 0, ms = 0) => { if (!key) return; const e = map.get(key) || { n: 0, bytes: 0, ms: 0 }; e.n++; e.bytes += bytes || 0; e.ms += ms || 0; map.set(key, e); };

module('Summarise HAR',
  'Summarises an HTTP Archive (.har) file, as exported from a browser\'s network panel: how many requests, total transferred and load time, and breakdowns by host, '
  + 'resource type, status code, HTTP method and the slowest and largest responses. Useful for spotting what makes a page slow or which third parties it contacts.',
  [],
  (t) => {
    let har;
    try { har = JSON.parse(t); } catch { throw new Error('Not valid JSON'); }
    const entries = har?.log?.entries;
    if (!Array.isArray(entries)) throw new Error('Not a HAR file (no log.entries array)');
    const byHost = new Map(), byType = new Map(), byStatus = new Map(), byMethod = new Map();
    let transfer = 0, content = 0;
    const requests = [];
    for (const e of entries) {
      const url = e.request?.url || '';
      let host = ''; try { host = new URL(url).host; } catch { host = url.split('/')[2] || '(unknown)'; }
      const bytes = Math.max(e.response?._transferSize ?? 0, 0) || e.response?.bodySize > 0 ? Math.max(e.response._transferSize ?? e.response.bodySize ?? 0, 0) : 0;
      const mime = (e.response?.content?.mimeType || '').split(';')[0] || '(none)';
      const kind = e._resourceType || (/javascript/.test(mime) ? 'script' : /css/.test(mime) ? 'stylesheet' : /html/.test(mime) ? 'document' : /image/.test(mime) ? 'image' : /font/.test(mime) ? 'font' : mime.split('/')[0] || 'other');
      transfer += bytes; content += e.response?.content?.size || 0;
      add(byHost, host, bytes, e.time); add(byType, kind, bytes, e.time); add(byStatus, String(e.response?.status ?? '?')); add(byMethod, e.request?.method || '?');
      requests.push({ url, time: e.time || 0, bytes, size: e.response?.content?.size || 0, status: e.response?.status });
    }
    const out = [`HAR: ${entries.length} requests, ${kb(transfer)} transferred, ${kb(content)} uncompressed`,
      `Total time (sum of request durations): ${(requests.reduce((s, r) => s + r.time, 0) / 1000).toFixed(2)} s across ${byHost.size} hosts`,
      `By host (requests, transferred)\n${top(byHost, 15, v => kb(v.bytes).padStart(10)).join('\n')}`,
      `By resource type\n${top(byType, 15, v => kb(v.bytes).padStart(10)).join('\n')}`,
      `By status code\n${top(byStatus, 15, () => '').join('\n').replace(/ {2,}  /g, '  ')}`,
      `By method: ${[...byMethod].map(([k, v]) => `${k}=${v.n}`).join(', ')}`,
      `Slowest responses\n${requests.slice().sort((a, b) => b.time - a.time).slice(0, 10).map(r => `${String(Math.round(r.time)).padStart(7)} ms  ${r.status ?? '?'}  ${r.url.slice(0, 90)}`).join('\n')}`,
      `Largest responses\n${requests.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 10).map(r => `${kb(r.bytes).padStart(10)}  ${r.status ?? '?'}  ${r.url.slice(0, 90)}`).join('\n')}`];
    return out.join('\n\n');
  }, { text: true, aliases: ['har', 'http archive', 'network log', 'waterfall'] });
