// Shared parsing for the HTTP operations: query strings, cookies and header blocks.

export function decodeComponent(s, plusAsSpace = true) {
  const v = plusAsSpace ? s.replace(/\+/g, ' ') : s;
  try { return decodeURIComponent(v); } catch { return v.replace(/%([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
}

// Returns an object; a parameter that repeats becomes an array, in order of appearance.
export function parseQuery(query, plusAsSpace = true) {
  const out = {};
  for (const pair of query.replace(/^[?#]/, '').split(/[&;]/)) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decodeComponent(eq < 0 ? pair : pair.slice(0, eq), plusAsSpace), value = eq < 0 ? '' : decodeComponent(pair.slice(eq + 1), plusAsSpace);
    if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = Array.isArray(out[key]) ? [...out[key], value] : [out[key], value]; else out[key] = value;
  }
  return out;
}

export function parseCookieHeader(value) {
  const out = {};
  for (const part of value.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) { if (part.trim()) out[part.trim()] = ''; continue; }
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  return out;
}

export function parseSetCookie(value) {
  const [first, ...rest] = value.split(';');
  const eq = first.indexOf('=');
  const cookie = { name: (eq < 0 ? first : first.slice(0, eq)).trim(), value: eq < 0 ? '' : first.slice(eq + 1).trim(), attributes: {} };
  for (const part of rest) {
    const i = part.indexOf('=');
    const name = (i < 0 ? part : part.slice(0, i)).trim();
    if (name) cookie.attributes[name.toLowerCase()] = i < 0 ? true : part.slice(i + 1).trim();
  }
  const a = cookie.attributes, notes = [];
  if (!a.secure) notes.push('no Secure flag: sent over plain HTTP too');
  if (!a.httponly) notes.push('no HttpOnly flag: readable by page scripts');
  if (!a.samesite) notes.push('no SameSite attribute: browser default applies');
  else if (/^none$/i.test(a.samesite) && !a.secure) notes.push('SameSite=None without Secure is rejected by browsers');
  if (cookie.name.startsWith('__Host-') && (!a.secure || a.domain || a.path !== '/')) notes.push('__Host- prefix requires Secure, Path=/ and no Domain');
  if (cookie.name.startsWith('__Secure-') && !a.secure) notes.push('__Secure- prefix requires Secure');
  if (!a.expires && !a['max-age']) notes.push('session cookie: no Expires or Max-Age');
  cookie.notes = notes;
  return cookie;
}

// Header lines into an object keyed by the name as written; repeated headers become arrays. Folded lines are joined.
export function parseHeaders(lines) {
  const headers = {};
  let last = null;
  for (const line of lines) {
    if (/^[ \t]/.test(line) && last) { const v = headers[last]; if (Array.isArray(v)) v[v.length - 1] += ' ' + line.trim(); else headers[last] += ' ' + line.trim(); continue; }
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    const name = line.slice(0, colon).trim(), value = line.slice(colon + 1).trim();
    const existing = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    if (existing) headers[existing] = Array.isArray(headers[existing]) ? [...headers[existing], value] : [headers[existing], value];
    else headers[name] = value;
    last = existing || name;
  }
  return headers;
}
export const header = (headers, name) => { const k = Object.keys(headers).find(h => h.toLowerCase() === name.toLowerCase()); return k ? headers[k] : undefined; };
