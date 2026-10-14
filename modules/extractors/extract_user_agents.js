import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// A product/version token or a well-known marker signals a user-agent string (as opposed to surrounding log text).
// HTTP request lines ("GET / HTTP/1.1") also carry a slash-version token, so they are excluded explicitly.
const UA_HINT = /\S\/\d|\b(?:Mozilla|Opera|AppleWebKit|Gecko|Trident|Presto|KHTML|Chrome|Safari|Firefox|Edge?|bot|crawler|spider|robot|fetch|monitor|scan|curl|Wget|okhttp|libwww|Dalvik|CFNetwork|facebookexternalhit)\b/i;
const REQUEST_LINE = /^(?:GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT|TRACE|PROPFIND|MKCOL)\b.*\bHTTP\/\d/i;
const looksLikeUa = s => s.length >= 6 && s.length <= 2048 && UA_HINT.test(s) && !REQUEST_LINE.test(s);

module('Extract User Agents',
  'Pulls user-agent strings out of text — web server access logs (the quoted UA field), JSON logs ("user_agent": "…"), and "User-Agent:" headers, as well as raw user agents one per line. '
  + 'Feed the result into Parse User Agent to break them down, or to a table/summary of clients.',
  [A.boolean('Unique', true)],
  (t, uniq) => {
    const found = [];
    const add = s => { const v = (s || '').trim().replace(/\\(["/])/g, '$1'); if (v && looksLikeUa(v)) found.push(v); };
    // 1. Explicit User-Agent / x-... headers (to end of line, optional surrounding quotes).
    for (const m of t.matchAll(/^[^\n\r]*?\buser[-_]?agent\b\s*[:=]\s*"?([^"\n\r]+?)"?\s*$/gim)) add(m[1]);
    // 2. JSON string fields named user_agent / ua / useragent.
    for (const m of t.matchAll(/"(?:user[-_]?agent|ua|useragent)"\s*:\s*"((?:[^"\\]|\\.)+)"/gi)) add(m[1]);
    // 3. Any double-quoted token that looks like a user agent (Apache/Nginx combined log format).
    for (const m of t.matchAll(/"((?:[^"\\]|\\.){6,2048}?)"/g)) add(m[1]);
    // 4. Whole lines that are themselves a user agent (a pasted list of raw UAs).
    for (const line of t.split(/\r?\n/)) { const s = line.trim(); if (s && !s.includes('"') && looksLikeUa(s)) add(s); }
    let out = found;
    if (uniq) { const seen = new Set(); out = out.filter(u => (seen.has(u) ? false : (seen.add(u), true))); }
    return out.join('\n');
  }, { text: true, aliases: ['user agent', 'useragent', 'extract ua', 'access log'] });
