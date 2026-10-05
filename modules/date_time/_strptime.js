export const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DIRECTIVE_RE = {
  Y: '(?<Y>\\d\\d\\d\\d)',
  y: '(?<y>\\d\\d)',
  m: '(?<m>1[0-2]|0[1-9]|[1-9])',
  d: '(?<d>3[01]|[12]\\d|0[1-9]|[1-9])',
  H: '(?<H>2[0-3]|[0-1]\\d|\\d)',
  I: '(?<I>1[0-2]|0[1-9]|[1-9])',
  M: '(?<M>[0-5]\\d|\\d)',
  S: '(?<S>6[01]|[0-5]\\d|\\d)',
  f: '(?<f>[0-9]{1,6})',
  p: '(?<p>[AaPp][Mm])',
  z: '(?<z>[+-]\\d\\d:?[0-5]\\d(?::?[0-5]\\d(?:\\.\\d{1,6})?)?|Z)',
  Z: '(?<Z>[A-Za-z]{1,6})',
  a: '(?<a>Mon|Tue|Wed|Thu|Fri|Sat|Sun)',
  A: '(?<A>Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)',
  b: '(?<b>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
  B: '(?<B>January|February|March|April|May|June|July|August|September|October|November|December)',
};

function buildRegex(fmt) {
  let re = '^';
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i];
    if (c === '%' && i + 1 < fmt.length) {
      const d = fmt[++i];
      if (d === '%') { re += '%'; continue; }
      if (!(d in DIRECTIVE_RE)) throw new Error(`Unsupported format directive: %${d}`);
      re += DIRECTIVE_RE[d];
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(re + '$', 'i');
}

export const pad2 = n => String(n).padStart(2, '0');
export const pad4 = n => String(n).padStart(4, '0');

export function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

export function daysInMonth(y, m) { return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }

export function dayOfYear(p) {
  return Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(p.year, 0, 1)) / 86400000) + 1;
}

export function isoWeekNumber(p) {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNr = (d.getUTCDay() + 6) % 7; // Monday=0
  d.setUTCDate(d.getUTCDate() - dayNr + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round((d - firstThursday) / (7 * 86400000));
}

function weekdayMon0(p) { return (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7; }

export function formatOffset(min) {
  if (min == null) return '';
  const sign = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  return `${sign}${pad2(Math.floor(abs / 60))}${pad2(abs % 60)}`;
}

/** Parses `str` against Python-style format `fmt`, returning
 *  {year,month,day,hour,minute,second,microsecond,tzOffsetMin,tzAbbr}. Unspecified date fields
 *  default the same way CPython's strptime does (year=1900, month=day=1, time=0). Throws on
 *  mismatch or an out-of-range day for the given month. */
export function strptime(str, fmt) {
  const re = buildRegex(fmt);
  const m = re.exec(str);
  if (!m) throw new Error(`time data '${str}' does not match format '${fmt}'`);
  const g = m.groups || {};
  let year = 1900, month = 1, day = 1, hour = 0, minute = 0, second = 0, microsecond = 0;
  let tzOffsetMin = null, tzAbbr = null, hour12 = null, ampm = null;
  if (g.Y) year = parseInt(g.Y, 10);
  else if (g.y) { const yy = parseInt(g.y, 10); year = yy < 69 ? 2000 + yy : 1900 + yy; }
  if (g.b) month = MONTHS_ABBR.findIndex(x => x.toLowerCase() === g.b.toLowerCase()) + 1;
  else if (g.B) month = MONTHS_FULL.findIndex(x => x.toLowerCase() === g.B.toLowerCase()) + 1;
  else if (g.m) month = parseInt(g.m, 10);
  if (g.d) day = parseInt(g.d, 10);
  if (g.H) hour = parseInt(g.H, 10);
  if (g.I) hour12 = parseInt(g.I, 10);
  if (g.M) minute = parseInt(g.M, 10);
  if (g.S) second = parseInt(g.S, 10);
  if (g.f) microsecond = parseInt(g.f.padEnd(6, '0'), 10);
  if (g.p) ampm = g.p.toUpperCase();
  if (g.z) {
    const z = g.z;
    if (z.toUpperCase() === 'Z') tzOffsetMin = 0;
    else {
      const mm = /^([+-])(\d\d):?([0-5]\d)/.exec(z);
      tzOffsetMin = (mm[1] === '-' ? -1 : 1) * (parseInt(mm[2], 10) * 60 + parseInt(mm[3], 10));
    }
  }
  if (g.Z) {
    tzAbbr = g.Z;
    if (/^(UTC|GMT)$/i.test(g.Z)) tzOffsetMin = 0;
  }
  if (hour12 != null) {
    hour = hour12 % 12;
    if (ampm === 'PM') hour += 12;
  }
  if (day > daysInMonth(year, month)) throw new Error(`day is out of range for month in '${str}'`);
  return { year, month, day, hour, minute, second, microsecond, tzOffsetMin, tzAbbr };
}

/** Formats `p` (same shape strptime returns) with a Python-style format string. */
export function strftime(p, fmt) {
  const wd = weekdayMon0(p);
  let out = '';
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i];
    if (c === '%' && i + 1 < fmt.length) {
      const d = fmt[++i];
      switch (d) {
        case 'Y': out += pad4(p.year); break;
        case 'y': out += pad2(((p.year % 100) + 100) % 100); break;
        case 'm': out += pad2(p.month); break;
        case 'd': out += pad2(p.day); break;
        case 'H': out += pad2(p.hour); break;
        case 'I': { let h = p.hour % 12; if (h === 0) h = 12; out += pad2(h); break; }
        case 'M': out += pad2(p.minute); break;
        case 'S': out += pad2(p.second); break;
        case 'f': out += String(p.microsecond || 0).padStart(6, '0'); break;
        case 'p': out += p.hour < 12 ? 'AM' : 'PM'; break;
        case 'a': out += DAYS_ABBR[wd]; break;
        case 'A': out += DAYS_FULL[wd]; break;
        case 'b': out += MONTHS_ABBR[p.month - 1]; break;
        case 'B': out += MONTHS_FULL[p.month - 1]; break;
        case 'j': out += String(dayOfYear(p)).padStart(3, '0'); break;
        case 'z': out += formatOffset(p.tzOffsetMin); break;
        case 'Z': out += p.tzAbbr || (p.tzOffsetMin === 0 ? 'UTC' : ''); break;
        case '%': out += '%'; break;
        default: out += '%' + d;
      }
    } else out += c;
  }
  return out;
}

/** Python's datetime.isoformat() equivalent: 'YYYY-MM-DDTHH:MM:SS[.ffffff][+HH:MM]'. */
export function isoformatParts(p) {
  let s = `${pad4(p.year)}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
  if (p.microsecond) s += '.' + String(p.microsecond).padStart(6, '0');
  if (p.tzOffsetMin != null) {
    const sign = p.tzOffsetMin < 0 ? '-' : '+';
    const abs = Math.abs(p.tzOffsetMin);
    s += `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
  }
  return s;
}

/** Milliseconds since epoch for `p`, treating a null tzOffsetMin as UTC. */
export function epochMsFromParts(p) {
  const ms = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, Math.floor((p.microsecond || 0) / 1000));
  return ms - (p.tzOffsetMin || 0) * 60000;
}

export function partsFromUtcMs(ms) {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
    microsecond: d.getUTCMilliseconds() * 1000, tzOffsetMin: 0, tzAbbr: 'UTC',
  };
}
