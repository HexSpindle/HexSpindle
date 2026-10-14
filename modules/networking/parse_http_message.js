import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseQuery, parseCookieHeader, parseSetCookie, parseHeaders, header } from './_http_parts.js';

const REQUEST = /^([A-Z][A-Z-]{2,15}) (\S+) HTTP\/(\d(?:\.\d)?)$/, RESPONSE = /^HTTP\/(\d(?:\.\d)?) (\d{3})(?: (.*))?$/;

module('Parse HTTP message',
  'Breaks a raw HTTP request or response (as copied from a proxy, a log, curl -v or a packet capture) into JSON: method, target, path, query parameters, status, headers, cookies and body. '
  + 'A form or JSON body is decoded too. Basic and Bearer credentials in the Authorization header are identified, and Basic ones decoded.',
  [A.boolean('Include the body', true)],
  (t, includeBody) => {
    const text = t.replace(/^\s*\n/, '');
    const split = /\r?\n\r?\n/.exec(text);
    const head = split ? text.slice(0, split.index) : text, body = split ? text.slice(split.index + split[0].length) : '';
    const lines = head.split(/\r?\n/);
    const start = lines.shift().trim();
    const out = {};
    let m;
    if ((m = REQUEST.exec(start))) {
      const q = m[2].indexOf('?');
      Object.assign(out, { type: 'request', method: m[1], target: m[2], path: q < 0 ? m[2] : m[2].slice(0, q), version: m[3] });
      if (q >= 0) out.query = parseQuery(m[2].slice(q + 1).split('#')[0]);
    } else if ((m = RESPONSE.exec(start))) Object.assign(out, { type: 'response', version: m[1], status: +m[2], reason: m[3] || '' });
    else throw new Error(`Not an HTTP request or status line: ${start.slice(0, 80)}`);
    const headers = out.headers = parseHeaders(lines);
    const cookie = header(headers, 'Cookie'), setCookie = header(headers, 'Set-Cookie'), auth = header(headers, 'Authorization');
    if (cookie) out.cookies = parseCookieHeader([].concat(cookie).join('; '));
    if (setCookie) out.setCookies = [].concat(setCookie).map(parseSetCookie);
    if (typeof auth === 'string') {
      const [scheme, credentials = ''] = auth.split(/\s+/, 2);
      out.authorization = { scheme };
      if (/^basic$/i.test(scheme)) { try { const pair = atob(credentials); const colon = pair.indexOf(':'); out.authorization.username = colon < 0 ? pair : pair.slice(0, colon); out.authorization.password = colon < 0 ? '' : pair.slice(colon + 1); } catch { /* not Base64 */ } }
      else if (/^bearer$/i.test(scheme)) out.authorization.token = credentials;
    }
    if (out.type === 'request' && header(headers, 'Host')) out.url = `${/:443$/.test(header(headers, 'Host')) ? 'https' : 'http'}://${header(headers, 'Host')}${out.target.startsWith('/') ? out.target : ''}`;
    if (includeBody && body) {
      const type = String(header(headers, 'Content-Type') || '');
      out.body = body;
      if (/application\/x-www-form-urlencoded/i.test(type)) out.form = parseQuery(body.trim());
      else if (/json/i.test(type)) { try { out.json = JSON.parse(body); } catch { /* left as text */ } }
    }
    out.bodyLength = new TextEncoder().encode(body).length;
    return JSON.stringify(out, null, 2);
  }, { text: true, aliases: ['http request', 'http response', 'raw http', 'burp request'] });
