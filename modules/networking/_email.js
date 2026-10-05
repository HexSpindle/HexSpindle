export function splitMessage(text) {
  const norm = text.replace(/\r\n/g, '\n');
  const idx = norm.indexOf('\n\n');
  if (idx === -1) return { headersBlock: norm, body: '' };
  return { headersBlock: norm.slice(0, idx), body: norm.slice(idx + 2) };
}

export function splitHeaders(block) {
  const lines = block.split('\n');
  const headers = [];
  let current = null;
  for (const line of lines) {
    if (current && /^[ \t]/.test(line)) { current[1] += '\n' + line; continue; }
    const idx = line.indexOf(':');
    if (idx === -1) { current = null; continue; }
    current = [line.slice(0, idx), line.slice(idx + 1).replace(/^[ \t]+/, '')];
    headers.push(current);
  }
  return headers;
}

export function getHeader(headers, name) {
  const low = name.toLowerCase();
  const h = headers.find(([k]) => k.toLowerCase() === low);
  return h ? h[1] : null;
}
export function getAllHeaders(headers, name) {
  const low = name.toLowerCase();
  return headers.filter(([k]) => k.toLowerCase() === low).map(([, v]) => v);
}

export function parseAddr(s) {
  s = (s || '').trim();
  if (!s) return ['', ''];
  const m = /^(.*)<([^<>]*)>\s*$/.exec(s);
  if (m) {
    let name = m[1].trim();
    if (name.length >= 2 && name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
    return [name, m[2].trim()];
  }
  return ['', s];
}

const MONTHNAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const DAYNAMES = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const TIMEZONES = { UT: 0, UTC: 0, GMT: 0, Z: 0, AST: -400, ADT: -300, EST: -500, EDT: -400, CST: -600, CDT: -500, MST: -700, MDT: -600, PST: -800, PDT: -700 };

function parsedateTz(data) {
  if (!data) return null;
  let parts = data.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (parts[0].endsWith(',') || DAYNAMES.has(parts[0].toLowerCase())) parts.shift();
  else { const i = parts[0].lastIndexOf(','); if (i >= 0) parts[0] = parts[0].slice(i + 1); }
  if (parts.length === 3) {
    const stuff = parts[0].split('-');
    if (stuff.length === 3) parts = [...stuff, ...parts.slice(1)];
  }
  if (parts.length === 4) {
    const s = parts[3];
    let i = s.indexOf('+');
    if (i === -1) i = s.indexOf('-');
    if (i > 0) parts.splice(3, 1, s.slice(0, i), s.slice(i));
    else parts.push('');
  }
  if (parts.length < 5) return null;
  parts = parts.slice(0, 5);
  let [dd, mm, yy, tm, tz] = parts;
  if (!(dd && mm && yy)) return null;
  mm = mm.toLowerCase();
  if (!MONTHNAMES.includes(mm)) {
    [dd, mm] = [mm, dd.toLowerCase()];
    if (!MONTHNAMES.includes(mm)) return null;
  }
  let mo = MONTHNAMES.indexOf(mm) + 1;
  if (mo > 12) mo -= 12;
  if (dd.endsWith(',')) dd = dd.slice(0, -1);
  if (yy.includes(':')) [yy, tm] = [tm, yy];
  if (yy.endsWith(',')) { yy = yy.slice(0, -1); if (!yy) return null; }
  if (!/^[0-9]/.test(yy)) [yy, tz] = [tz, yy];
  if (tm.endsWith(',')) tm = tm.slice(0, -1);
  let tmParts = tm.split(':');
  let thh, tmm, tss;
  if (tmParts.length === 2) { [thh, tmm] = tmParts; tss = '0'; }
  else if (tmParts.length === 3) { [thh, tmm, tss] = tmParts; }
  else if (tmParts.length === 1 && tm.includes('.')) {
    const dp = tm.split('.');
    if (dp.length === 2) { [thh, tmm] = dp; tss = '0'; }
    else if (dp.length === 3) { [thh, tmm, tss] = dp; }
    else return null;
  } else return null;
  let yn = parseInt(yy, 10), dn = parseInt(dd, 10), hh = parseInt(thh, 10), mi = parseInt(tmm, 10), ss = parseInt(tss, 10);
  if ([yn, dn, hh, mi, ss].some(Number.isNaN)) return null;
  if (yn < 100) yn += yn > 68 ? 1900 : 2000;
  let tzoffset = null;
  const tzU = tz.toUpperCase();
  if (tzU in TIMEZONES) tzoffset = TIMEZONES[tzU];
  else {
    if (/^[+-]?\d+$/.test(tz)) tzoffset = parseInt(tz, 10);
    if (tzoffset === 0 && tz.startsWith('-')) tzoffset = null;
  }
  let tzSeconds = null;
  if (tzoffset !== null) {
    const sign = tzoffset < 0 ? -1 : 1;
    const abs = Math.abs(tzoffset);
    tzSeconds = sign * (Math.floor(abs / 100) * 3600 + (abs % 100) * 60);
  }
  return { yy: yn, mm: mo, dd: dn, hh, mi, ss, tzSeconds };
}

export function parseDateToDatetime(s) {
  const p = parsedateTz(s);
  if (!p) return null;
  const tz = p.tzSeconds ?? 0;
  const ms = Date.UTC(p.yy, p.mm - 1, p.dd, p.hh, p.mi, p.ss) - tz * 1000;
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  let iso = `${pad(p.yy, 4)}-${pad(p.mm)}-${pad(p.dd)}T${pad(p.hh)}:${pad(p.mi)}:${pad(p.ss)}`;
  if (p.tzSeconds !== null) {
    const sign = p.tzSeconds < 0 ? '-' : '+';
    const abs = Math.abs(p.tzSeconds);
    iso += `${sign}${pad(Math.floor(abs / 3600))}:${pad(Math.floor((abs % 3600) / 60))}`;
  }
  return { ms, iso };
}
