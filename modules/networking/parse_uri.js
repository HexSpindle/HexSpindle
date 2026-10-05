import { module } from './_cat.js';

const protocolPattern = /^([a-z0-9.+-]+:)/i;
const portPattern = /:[0-9]*$/;
const simplePathPattern = /^(\/\/?(?!\/)[^?\s]*)(\?[^\s]*)?$/;
const delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'];
const unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims);
const autoEscape = ['\''].concat(unwise);
const nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape);
const hostEndingChars = ['/', '?', '#'];
const hostnameMaxLen = 255;
const hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/;
const hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/;
const hostlessProtocol = { 'javascript': true, 'javascript:': true };
const unsafeProtocol = hostlessProtocol;
const slashedProtocol = { 'http:': true, 'https:': true, 'ftp:': true, 'gopher:': true, 'file:': true };

function toASCII(host) {
  if (!/[^\x00-\x7f]/.test(host)) return host;
  try { return new URL('http://' + host).hostname; } catch { return ''; }
}

function urlParse(url) {
  const u = { protocol: null, auth: null, port: null, hostname: null, hash: null, query: null, pathname: null };
  let hasHash = false, hasAt = false, start = -1, end = -1, rest = '', lastPos = 0;
  for (let i = 0, inWs = false, split = false; i < url.length; ++i) {
    const code = url.charCodeAt(i);
    const isWs = code < 33 || code === 0xa0 || code === 0xfeff;
    if (start === -1) {
      if (isWs) continue;
      lastPos = start = i;
    } else if (inWs) {
      if (!isWs) { end = -1; inWs = false; }
    } else if (isWs) {
      end = i;
      inWs = true;
    }
    if (!split) {
      if (code === 0x40) hasAt = true;
      else if (code === 0x23) { hasHash = true; split = true; }
      else if (code === 0x3f) split = true;
      else if (code === 0x5c) {
        if (i - lastPos > 0) rest += url.slice(lastPos, i);
        rest += '/';
        lastPos = i + 1;
      }
    } else if (!hasHash && code === 0x23) {
      hasHash = true;
    }
  }
  if (start !== -1) {
    if (lastPos === start) rest = end === -1 ? url.slice(start) : url.slice(start, end);
    else if (end === -1 && lastPos < url.length) rest += url.slice(lastPos);
    else if (end !== -1 && lastPos < end) rest += url.slice(lastPos, end);
  }

  if (!hasHash && !hasAt) {
    const simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      u.pathname = simplePath[1];
      if (simplePath[2]) u.query = simplePath[2].substr(1);
      return u;
    }
  }

  let proto = protocolPattern.exec(rest), lowerProto, slashes;
  if (proto) {
    proto = proto[0];
    lowerProto = proto.toLowerCase();
    u.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }
  if (proto || rest.match(/^\/\/[^@/]+@[^@/]+/)) {
    slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) rest = rest.substr(2);
  }

  if (!hostlessProtocol[proto] && (slashes || (proto && !slashedProtocol[proto]))) {
    let hostEnd = -1;
    for (const c of hostEndingChars) {
      const hec = rest.indexOf(c);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) hostEnd = hec;
    }
    const atSign = hostEnd === -1 ? rest.lastIndexOf('@') : rest.lastIndexOf('@', hostEnd);
    if (atSign !== -1) {
      u.auth = decodeURIComponent(rest.slice(0, atSign));
      rest = rest.slice(atSign + 1);
    }
    hostEnd = -1;
    for (const c of nonHostChars) {
      const hec = rest.indexOf(c);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) hostEnd = hec;
    }
    if (hostEnd === -1) hostEnd = rest.length;
    let host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);
    const port = portPattern.exec(host);
    if (port) {
      if (port[0] !== ':') u.port = port[0].substr(1);
      host = host.substr(0, host.length - port[0].length);
    }
    u.hostname = host || '';

    const ipv6Hostname = u.hostname[0] === '[' && u.hostname[u.hostname.length - 1] === ']';
    if (!ipv6Hostname) {
      const hostparts = u.hostname.split(/\./);
      for (let i = 0; i < hostparts.length; i++) {
        const part = hostparts[i];
        if (!part || part.match(hostnamePartPattern)) continue;
        let newpart = '';
        for (let j = 0; j < part.length; j++) newpart += part.charCodeAt(j) > 127 ? 'x' : part[j];
        if (!newpart.match(hostnamePartPattern)) {
          const validParts = hostparts.slice(0, i);
          const notHost = hostparts.slice(i + 1);
          const bit = part.match(hostnamePartStart);
          if (bit) { validParts.push(bit[1]); notHost.unshift(bit[2]); }
          if (notHost.length) rest = '/' + notHost.join('.') + rest;
          u.hostname = validParts.join('.');
          break;
        }
      }
    }
    u.hostname = u.hostname.length > hostnameMaxLen ? '' : u.hostname.toLowerCase();
    if (!ipv6Hostname) u.hostname = toASCII(u.hostname);
    if (ipv6Hostname) {
      u.hostname = u.hostname.substr(1, u.hostname.length - 2);
      if (rest[0] !== '/') rest = '/' + rest;
    }
  }

  if (!unsafeProtocol[lowerProto]) {
    for (const ae of autoEscape) {
      if (rest.indexOf(ae) === -1) continue;
      let esc = encodeURIComponent(ae);
      if (esc === ae) esc = escape(ae);
      rest = rest.split(ae).join(esc);
    }
  }
  const hash = rest.indexOf('#');
  if (hash !== -1) { u.hash = rest.substr(hash); rest = rest.slice(0, hash); }
  const qm = rest.indexOf('?');
  if (qm !== -1) { u.query = rest.substr(qm + 1); rest = rest.slice(0, qm); }
  if (rest) u.pathname = rest;
  if (slashedProtocol[lowerProto] && u.hostname && !u.pathname) u.pathname = '/';
  return u;
}

module('Parse URI', 'Splits a URI into protocol, auth, host, port, path, query arguments and hash.', [],
  (t) => {
    const uri = urlParse(t);
    let output = '';
    if (uri.protocol) output += 'Protocol:\t' + uri.protocol + '\n';
    if (uri.auth) output += 'Auth:\t\t' + uri.auth + '\n';
    if (uri.hostname) output += 'Hostname:\t' + uri.hostname + '\n';
    if (uri.port) output += 'Port:\t\t' + uri.port + '\n';
    if (uri.pathname) output += 'Path name:\t' + uri.pathname + '\n';
    if (uri.query) {
      const queryObj = Object.create(null);
      for (const [key, value] of new URLSearchParams(uri.query)) {
        if (Object.prototype.hasOwnProperty.call(queryObj, key)) {
          if (Array.isArray(queryObj[key])) queryObj[key].push(value);
          else queryObj[key] = [queryObj[key], value];
        } else {
          queryObj[key] = value;
        }
      }
      let padding = 0;
      for (const k of Object.keys(queryObj)) padding = k.length > padding ? k.length : padding;
      output += 'Arguments:\n';
      for (const key in queryObj) {
        output += '\t' + key.padEnd(padding, ' ');
        output += queryObj[key].length ? ' = ' + queryObj[key] + '\n' : '\n';
      }
    }
    if (uri.hash) output += 'Hash:\t\t' + uri.hash + '\n';
    return output;
  }, { text: true });
