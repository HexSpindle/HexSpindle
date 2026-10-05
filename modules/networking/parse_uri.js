import { module } from './_cat.js';

const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+\-.]*$/;

function splitNetloc(url, start) {
  let delim = url.length;
  for (const c of ['/', '?', '#']) {
    const idx = url.indexOf(c, start);
    if (idx >= 0) delim = Math.min(delim, idx);
  }
  return [url.slice(start, delim), url.slice(delim)];
}

/** Mirrors urllib.parse.urlsplit()'s component-splitting algorithm (not full RFC validation). */
function urlsplit(url) {
  let scheme = '', netloc = '', query = '', fragment = '', rest = url;
  const i = rest.indexOf(':');
  if (i > 0 && SCHEME_RE.test(rest.slice(0, i))) { scheme = rest.slice(0, i).toLowerCase(); rest = rest.slice(i + 1); }
  if (rest.slice(0, 2) === '//') { [netloc, rest] = splitNetloc(rest, 2); }
  const hashIdx = rest.indexOf('#');
  if (hashIdx !== -1) { fragment = rest.slice(hashIdx + 1); rest = rest.slice(0, hashIdx); }
  const qIdx = rest.indexOf('?');
  if (qIdx !== -1) { query = rest.slice(qIdx + 1); rest = rest.slice(0, qIdx); }
  return { scheme, netloc, path: rest, query, fragment };
}

function userinfo(netloc) {
  const at = netloc.lastIndexOf('@');
  if (at === -1) return [null, null];
  const info = netloc.slice(0, at);
  const colon = info.indexOf(':');
  return colon === -1 ? [info, null] : [info.slice(0, colon), info.slice(colon + 1)];
}

function hostinfo(netloc) {
  const at = netloc.lastIndexOf('@');
  const hp = at === -1 ? netloc : netloc.slice(at + 1);
  const br = hp.indexOf('[');
  let hostname, port;
  if (br !== -1) {
    const brEnd = hp.indexOf(']', br);
    hostname = brEnd === -1 ? hp.slice(br + 1) : hp.slice(br + 1, brEnd);
    const after = brEnd === -1 ? '' : hp.slice(brEnd + 1);
    const colon = after.indexOf(':');
    port = colon === -1 ? null : after.slice(colon + 1);
  } else {
    const colon = hp.indexOf(':');
    [hostname, port] = colon === -1 ? [hp, null] : [hp.slice(0, colon), hp.slice(colon + 1)];
  }
  return [hostname || null, port || null];
}

function hostnameOf(netloc) {
  const [h] = hostinfo(netloc);
  if (!h) return null;
  const pct = h.indexOf('%');
  return pct === -1 ? h.toLowerCase() : h.slice(0, pct).toLowerCase() + h.slice(pct);
}
function portOf(netloc) {
  const [, p] = hostinfo(netloc);
  if (p === null) return null;
  if (!/^[0-9]+$/.test(p)) throw new Error(`Port could not be cast to integer value as '${p}'`);
  const n = parseInt(p, 10);
  if (n < 0 || n > 65535) throw new Error('Port out of range 0-65535');
  return n;
}

function unquotePlus(s) {
  const withSpaces = s.replace(/\+/g, ' ');
  try { return decodeURIComponent(withSpaces); }
  catch { return withSpaces.replace(/%[0-9A-Fa-f]{2}/g, m => { try { return decodeURIComponent(m); } catch { return '�'; } }); }
}

function parseQs(qs) {
  const map = new Map();
  for (const nv of qs.split('&')) {
    if (!nv) continue;
    const eq = nv.indexOf('=');
    const name = eq === -1 ? nv : nv.slice(0, eq);
    const value = eq === -1 ? '' : nv.slice(eq + 1);
    const k = unquotePlus(name), v = unquotePlus(value);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  }
  return map;
}

module('Parse URI', 'Splits a URI into scheme, host, port, path, query parameters and fragment.', [],
  (t) => {
    const u = urlsplit(t.trim());
    const [username, password] = userinfo(u.netloc);
    const hostname = hostnameOf(u.netloc);
    const port = portOf(u.netloc);
    const out = [];
    for (const [k, v] of [['Protocol', u.scheme], ['Username', username], ['Password', password], ['Hostname', hostname], ['Port', port], ['Path', u.path], ['Fragment', u.fragment]]) {
      if (v !== null && v !== undefined && v !== '') out.push(`${k}:\t${v}`);
    }
    if (u.query) {
      out.push('Arguments:');
      for (const [k, vs] of parseQs(u.query)) for (const v of vs) out.push(`\t${k} = ${v}`);
    }
    return out.join('\n');
  }, { text: true });
