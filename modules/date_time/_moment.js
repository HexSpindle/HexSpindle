const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysInYear = (y) => (isLeap(y) ? 366 : 365);
const daysInMonth = (y, m) => (m < 0 || m > 11 ? NaN : m === 1 ? (isLeap(y) ? 29 : 28) : 31 - ((m % 7) % 2));

function createUTCDate(y, mo = 0, d = 1, h = 0, mi = 0, s = 0, ms = 0) {
  if (y < 100 && y >= 0) {
    const date = new Date(Date.UTC(y + 400, mo, d, h, mi, s, ms));
    if (isFinite(date.getUTCFullYear())) date.setUTCFullYear(y);
    return date;
  }
  return new Date(Date.UTC(y, mo, d, h, mi, s, ms));
}

function createDate(y, mo = 0, d = 1, h = 0, mi = 0, s = 0, ms = 0) {
  if (y < 100 && y >= 0) {
    const date = new Date(y + 400, mo, d, h, mi, s, ms);
    if (isFinite(date.getFullYear())) date.setFullYear(y);
    return date;
  }
  return new Date(y, mo, d, h, mi, s, ms);
}

const extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
const basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

const isoDates = [
  [['YYYYYY', '-', 'MM', '-', 'DD'], /[+-]\d{6}-\d\d-\d\d/],
  [['YYYY', '-', 'MM', '-', 'DD'], /\d{4}-\d\d-\d\d/],
  [['GGGG', '-', 'W', 'WW', '-', 'E'], /\d{4}-W\d\d-\d/],
  [['GGGG', '-', 'W', 'WW'], /\d{4}-W\d\d/, false],
  [['YYYY', '-', 'DDD'], /\d{4}-\d{3}/],
  [['YYYY', '-', 'MM'], /\d{4}-\d\d/, false],
  [['YYYYYY', 'MM', 'DD'], /[+-]\d{10}/],
  [['YYYY', 'MM', 'DD'], /\d{8}/],
  [['GGGG', 'W', 'WW', 'E'], /\d{4}W\d{3}/],
  [['GGGG', 'W', 'WW'], /\d{4}W\d{2}/, false],
  [['YYYY', 'DDD'], /\d{7}/],
  [['YYYY', 'MM'], /\d{6}/, false],
  [['YYYY'], /\d{4}/, false],
];
const isoTimes = [
  [['HH', ':', 'mm', ':', 'ss', '.', 'SSSS'], /\d\d:\d\d:\d\d\.\d+/],
  [['HH', ':', 'mm', ':', 'ss', ',', 'SSSS'], /\d\d:\d\d:\d\d,\d+/],
  [['HH', ':', 'mm', ':', 'ss'], /\d\d:\d\d:\d\d/],
  [['HH', ':', 'mm'], /\d\d:\d\d/],
  [['HH', 'mm', 'ss', '.', 'SSSS'], /\d\d\d\d\d\d\.\d+/],
  [['HH', 'mm', 'ss', ',', 'SSSS'], /\d\d\d\d\d\d,\d+/],
  [['HH', 'mm', 'ss'], /\d\d\d\d\d\d/],
  [['HH', 'mm'], /\d\d\d\d/],
  [['HH'], /\d\d/],
];
const rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;
const obsOffsets = { UT: 0, GMT: 0, EDT: -240, EST: -300, CDT: -300, CST: -360, MDT: -360, MST: -420, PDT: -420, PST: -480 };

const TOKEN_RX = {
  YYYYYY: /[+-]?\d{1,6}/, YYYY: /\d{1,4}/, GGGG: /\d{1,4}/, MM: /\d\d?/, DD: /\d\d?/, DDD: /\d{1,3}/,
  WW: /\d\d?/, E: /\d\d?/, HH: /\d\d?/, mm: /\d\d?/, ss: /\d\d?/, SSSS: /\d+/, Z: /Z|[+-]\d\d(?::?\d\d)?/i,
};
const toInt = (s) => { const n = +s; return n !== 0 && isFinite(n) ? Math.trunc(n) : 0; };

function overflowCheck(year, month, date, h, mi, s, ms) {
  return month < 0 || month > 11 || date < 1 || date > daysInMonth(year, month) ||
    h < 0 || h > 24 || (h === 24 && (mi !== 0 || s !== 0 || ms !== 0)) ||
    mi < 0 || mi > 59 || s < 0 || s > 59 || ms < 0 || ms > 999;
}

function parseISO(str, useUTC) {
  const match = extendedIsoRegex.exec(str) || basicIsoRegex.exec(str);
  if (!match) return undefined;
  const dEntry = isoDates.find(([, rx]) => rx.exec(match[1]));
  if (!dEntry) return undefined;
  let fmt = [...dEntry[0]];
  if (match[3]) {
    const tEntry = isoTimes.find(([, rx]) => rx.exec(match[3]));
    if (!tEntry) return undefined;
    if (dEntry[2] === false) return undefined; // time not allowed: moment falls through to RFC 2822 / Date
    fmt = fmt.concat([match[2] || ' '], tEntry[0]);
  }
  if (match[4]) fmt.push('Z');

  let rest = str;
  const a = {}, w = {};
  let tzm = null, dayOfYear = null;
  for (const tok of fmt) {
    const rx = TOKEN_RX[tok] || new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const m = rest.match(rx);
    const inp = m ? m[0] : undefined;
    if (inp) rest = rest.slice(rest.indexOf(inp) + inp.length);
    if (inp == null) continue;
    switch (tok) {
      case 'YYYYYY': a.y = toInt(inp); break;
      case 'YYYY': a.y = inp.length === 2 ? toInt(inp) + (toInt(inp) > 68 ? 1900 : 2000) : toInt(inp); break;
      case 'GGGG': w.GG = toInt(inp); break;
      case 'MM': a.mo = toInt(inp) - 1; break;
      case 'DD': a.d = toInt(inp); break;
      case 'DDD': dayOfYear = toInt(inp); break;
      case 'WW': w.W = toInt(inp); break;
      case 'E': w.E = toInt(inp); break;
      case 'HH': a.h = toInt(inp); break;
      case 'mm': a.mi = toInt(inp); break;
      case 'ss': a.s = toInt(inp); break;
      case 'SSSS': a.ms = toInt(('0.' + inp) * 1000); break;
      case 'Z': {
        useUTC = true;
        const parts = inp.match(/([-+]|\d\d)/gi) || ['-', 0, 0];
        const minutes = +(parts[1] * 60) + toInt(parts[2]);
        tzm = minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
        break;
      }
    }
  }

  let overflowExtra = false;
  if ((w.GG != null || w.W != null || w.E != null) && a.d == null && a.mo == null) {
    // ISO week date (dow=1, doy=4).
    const firstWeekOffset = (y) => -((7 + createUTCDate(y, 0, 4).getUTCDay() - 1) % 7) + 3;
    const weeksInYear = (y) => (daysInYear(y) - firstWeekOffset(y) + firstWeekOffset(y + 1)) / 7;
    const weekYear = w.GG != null ? w.GG : a.y != null ? a.y : new Date().getFullYear();
    const week = w.W != null ? w.W : 1;
    const weekday = w.E != null ? w.E : 1;
    if (week < 1 || week > weeksInYear(weekYear) || weekday < 1 || weekday > 7) overflowExtra = true;
    else {
      let doy = 1 + 7 * (week - 1) + ((7 + weekday - 1) % 7) + firstWeekOffset(weekYear);
      let resYear = weekYear;
      if (doy <= 0) { resYear = weekYear - 1; doy += daysInYear(resYear); }
      else if (doy > daysInYear(weekYear)) { doy -= daysInYear(weekYear); resYear = weekYear + 1; }
      a.y = resYear; dayOfYear = doy;
    }
  }
  if (overflowExtra) return NaN;
  if (a.y == null) return NaN; // ISO input always carries a year; anything else is beyond this port
  if (dayOfYear !== null) {
    if (dayOfYear > daysInYear(a.y) || dayOfYear === 0) return NaN;
    const d = createUTCDate(a.y, 0, dayOfYear);
    a.mo = d.getUTCMonth(); a.d = d.getUTCDate();
  }
  const year = a.y, month = a.mo ?? 0, date = a.d ?? 1, h = a.h ?? 0, mi = a.mi ?? 0, s = a.s ?? 0, ms = a.ms ?? 0;
  if (overflowCheck(year, month, date, h, mi, s, ms)) return NaN;
  const nextDay = h === 24;
  const d = (useUTC ? createUTCDate : createDate)(year, month, date, nextDay ? 0 : h, mi, s, ms);
  if (tzm !== null) d.setUTCMinutes(d.getUTCMinutes() - tzm);
  if (nextDay) {
    if (useUTC) d.setUTCDate(d.getUTCDate() + 1); else d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

function parseRFC2822(str) {
  const pre = str.replace(/\([^()]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  const m = rfc2822.exec(pre);
  if (!m) return undefined;
  let year = parseInt(m[4], 10);
  if (year <= 49) year += 2000; else if (year <= 999) year += 1900;
  const arr = [year, MONTHS_SHORT.indexOf(m[3]), parseInt(m[2], 10), parseInt(m[5], 10), parseInt(m[6], 10)];
  if (m[7]) arr.push(parseInt(m[7], 10));
  if (arr[3] === 24 || overflowCheck(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5] || 0, 0)) return NaN;
  if (m[1] && DAYS_SHORT.indexOf(m[1]) !== new Date(arr[0], arr[1], arr[2]).getDay()) return NaN;
  let tzm;
  if (m[8]) tzm = obsOffsets[m[8]];
  else if (m[9]) tzm = 0;
  else { const hm = parseInt(m[10], 10), mm = hm % 100; tzm = ((hm - mm) / 100) * 60 + mm; }
  const d = createUTCDate(...arr);
  d.setUTCMinutes(d.getUTCMinutes() - tzm);
  return d.getTime();
}

export function momentParse(str, useUTC = true) {
  if (str === '') return NaN;
  const asp = /^\/?Date\((-?\d+)/i.exec(str);
  if (asp) return new Date(+asp[1]).getTime();
  let v = parseISO(str, useUTC);
  if (v !== undefined) return v;
  v = parseRFC2822(str);
  if (v !== undefined) return v;
  return new Date(str + (useUTC ? ' UTC' : '')).getTime();
}

function formatYear(y) {
  return (y < 0 ? '-' : '') + String(Math.abs(y)).padStart(4, '0');
}

export function formatUTC(ms, withMs = false) {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return 'Invalid date';
  const p2 = (n) => String(n).padStart(2, '0');
  let out = `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${formatYear(d.getUTCFullYear())} ` +
    `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
  if (withMs) out += '.' + String(d.getUTCMilliseconds()).padStart(3, '0');
  return out;
}
