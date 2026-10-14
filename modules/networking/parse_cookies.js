import { module } from './_cat.js';
import { parseCookieHeader, parseSetCookie } from './_http_parts.js';

module('Parse Cookies',
  'Parses HTTP cookies into JSON. A Cookie request header (or a bare "a=1; b=2" string) becomes a name: value object; Set-Cookie response headers become a list with each cookie\'s attributes '
  + 'and notes on anything weak about them (missing Secure, HttpOnly or SameSite, or a broken __Host- / __Secure- prefix). One header per line.',
  [],
  (t) => {
    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error('No cookies in the input');
    const set = lines.filter(l => /^set-cookie:/i.test(l));
    // Attribute names give away a Set-Cookie value pasted without its header name.
    const looksSet = l => /;\s*(?:path|domain|expires|max-age|secure|httponly|samesite)\b/i.test(l);
    if (set.length || lines.every(looksSet)) return JSON.stringify((set.length ? set : lines).map(l => parseSetCookie(l.replace(/^set-cookie:\s*/i, ''))), null, 2);
    const merged = {};
    for (const l of lines) Object.assign(merged, parseCookieHeader(l.replace(/^cookie:\s*/i, '')));
    return JSON.stringify(merged, null, 2);
  }, { text: true, aliases: ['cookie', 'set-cookie', 'cookie jar'] });
