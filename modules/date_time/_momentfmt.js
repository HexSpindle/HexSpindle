/*!
 * Portions ported from Moment.js and Moment-Timezone.
 * Copyright JS Foundation and other contributors.
 * License: MIT
 *
 * Adapted for HexSpindle's dependency-free date/time operations.
 * Full license and attribution notices: /THIRD_PARTY_NOTICES.md
 */

import { getTz, localToUtc, utcToZonedParts } from './_tz.js';
import { momentParse } from './_moment.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = DAYS.map(d => d.slice(0, 3));
const DAYS_MIN = DAYS.map(d => d.slice(0, 2));

export const CC_FORMATS = [
  ['Standard date and time', 'DD/MM/YYYY HH:mm:ss'],
  ['American-style date and time', 'MM/DD/YYYY HH:mm:ss'],
  ['International date and time', 'YYYY-MM-DD HH:mm:ss'],
  ['Verbose date and time', 'dddd Do MMMM YYYY HH:mm:ss Z z'],
  ['UNIX timestamp (seconds)', 'X'],
  ['UNIX timestamp offset (milliseconds)', 'x'],
  ['Automatic', ''],
];
const CC_FORMAT_BY_NAME = Object.fromEntries(CC_FORMATS);
export function resolveFormat(f) { return Object.prototype.hasOwnProperty.call(CC_FORMAT_BY_NAME, f) ? CC_FORMAT_BY_NAME[f] : f; }
export function isMomentFormat(f) { return !f.includes('%'); }

const EXAMPLES = [['Month', 'M', '1 2 ... 11 12'], ['', 'Mo', '1st 2nd ... 11th 12th'], ['', 'MM', '01 02 ... 11 12'], ['', 'MMM', 'Jan Feb ... Nov Dec'], ['', 'MMMM', 'January February ... November December'], ['Quarter', 'Q', '1 2 3 4'], ['Day of Month', 'D', '1 2 ... 30 31'], ['', 'Do', '1st 2nd ... 30th 31st'], ['', 'DD', '01 02 ... 30 31'], ['Day of Year', 'DDD', '1 2 ... 364 365'], ['', 'DDDo', '1st 2nd ... 364th 365th'], ['', 'DDDD', '001 002 ... 364 365'], ['Day of Week', 'd', '0 1 ... 5 6'], ['', 'do', '0th 1st ... 5th 6th'], ['', 'dd', 'Su Mo ... Fr Sa'], ['', 'ddd', 'Sun Mon ... Fri Sat'], ['', 'dddd', 'Sunday Monday ... Friday Saturday'], ['Day of Week (Locale)', 'e', '0 1 ... 5 6'], ['Day of Week (ISO)', 'E', '1 2 ... 6 7'], ['Week of Year', 'w', '1 2 ... 52 53'], ['', 'wo', '1st 2nd ... 52nd 53rd'], ['', 'ww', '01 02 ... 52 53'], ['Week of Year (ISO)', 'W', '1 2 ... 52 53'], ['', 'Wo', '1st 2nd ... 52nd 53rd'], ['', 'WW', '01 02 ... 52 53'], ['Year', 'YY', '70 71 ... 29 30'], ['', 'YYYY', '1970 1971 ... 2029 2030'], ['Week Year', 'gg', '70 71 ... 29 30'], ['', 'gggg', '1970 1971 ... 2029 2030'], ['Week Year (ISO)', 'GG', '70 71 ... 29 30'], ['', 'GGGG', '1970 1971 ... 2029 2030'], ['AM/PM', 'A', 'AM PM'], ['', 'a', 'am pm'], ['Hour', 'H', '0 1 ... 22 23'], ['', 'HH', '00 01 ... 22 23'], ['', 'h', '1 2 ... 11 12'], ['', 'hh', '01 02 ... 11 12'], ['Minute', 'm', '0 1 ... 58 59'], ['', 'mm', '00 01 ... 58 59'], ['Second', 's', '0 1 ... 58 59'], ['', 'ss', '00 01 ... 58 59'], ['Fractional Second', 'S', '0 1 ... 8 9'], ['', 'SS', '00 01 ... 98 99'], ['', 'SSS', '000 001 ... 998 999'], ['', 'SSSS ... SSSSSSSSS', '000[0..] 001[0..] ... 998[0..] 999[0..]'], ['Timezone', 'z or zz', 'EST CST ... MST PST'], ['', 'Z', '-07:00 -06:00 ... +06:00 +07:00'], ['', 'ZZ', '-0700 -0600 ... +0600 +0700'], ['Unix Timestamp', 'X', '1360013296'], ['Unix Millisecond Timestamp', 'x', '1360013296123']];
export const INVALID_FORMAT_HELP = 'Invalid format.\n\nFormat string tokens:\n\n  \n    \n      Category\n      Token\n      Output\n    \n  \n  \n' +
  EXAMPLES.map(([c, t, o]) => `    \n      ${c}\n      ${t}\n      ${o}\n    \n`).join('') + '  \n';

const zeroFill = (n, len) => (n < 0 ? '-' : '') + String(Math.abs(n)).padStart(len, '0');
function ordinal(n) {
  const b = n % 10;
  return n + (~~((n % 100) / 10) === 1 ? 'th' : b === 1 ? 'st' : b === 2 ? 'nd' : b === 3 ? 'rd' : 'th');
}

const FORMAT_TOKENS = /(\[[^[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;
const LOCAL_FORMATS = { LTS: 'h:mm:ss A', LT: 'h:mm A', L: 'MM/DD/YYYY', LL: 'MMMM D, YYYY', LLL: 'MMMM D, YYYY h:mm A', LLLL: 'dddd, MMMM D, YYYY h:mm A' };
function expandFormat(f) {
  for (let i = 0; i < 5 && /(\[[^[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/.test(f); i++) {
    f = f.replace(/(\[[^[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, (m, br, esc, tok) => {
      if (br || esc) return m;
      if (LOCAL_FORMATS[tok]) return LOCAL_FORMATS[tok];
      const up = LOCAL_FORMATS[tok.toUpperCase()];
      return up.replace(/MMMM|MM|DD|dddd/g, x => x.slice(1));
    });
  }
  return f;
}

// --- calendar helpers -------------------------------------------------------------------------
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const dayOfYear = p => Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(p.year, 0, 1)) / 864e5) + 1;
const weekday = p => new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
// moment's weekOfYear(mom, dow, doy): en locale uses dow=0 (Sunday), doy=6; ISO uses dow=1, doy=4.
function firstWeekOffset(year, dow, doy) {
  const fwd = 7 + dow - doy;
  const fwdlw = (7 + new Date(Date.UTC(year, 0, fwd)).getUTCDay() - dow) % 7;
  return -fwdlw + fwd - 1;
}
const weeksInYear = (year, dow, doy) => (( isLeap(year) ? 366 : 365) - firstWeekOffset(year, dow, doy) + firstWeekOffset(year + 1, dow, doy)) / 7;
function weekOfYear(p, dow, doy) {
  const weekOffset = firstWeekOffset(p.year, dow, doy);
  const week = Math.floor((dayOfYear(p) - weekOffset - 1) / 7) + 1;
  if (week < 1) return { week: week + weeksInYear(p.year - 1, dow, doy), year: p.year - 1 };
  if (week > weeksInYear(p.year, dow, doy)) return { week: week - weeksInYear(p.year, dow, doy), year: p.year + 1 };
  return { week, year: p.year };
}

let MTZ = null;
let mtzLoading = null;
const charCodeToInt = c => (c > 96 ? c - 87 : c > 64 ? c - 29 : c - 48);
function unpackBase60(str) {
  const [whole, frac = ''] = str.split('.');
  let i = 0, out = 0, mult = 1, sign = 1;
  if (str.charCodeAt(0) === 45) { i = 1; sign = -1; }
  for (; i < whole.length; i++) out = 60 * out + charCodeToInt(whole.charCodeAt(i));
  for (i = 0; i < frac.length; i++) { mult /= 60; out += charCodeToInt(frac.charCodeAt(i)) * mult; }
  return out * sign;
}
function unpackZone(packed) {
  const data = packed.split('|');
  const offsets = data[2].split(' ').map(unpackBase60);
  const indices = data[3].split('').map(unpackBase60);
  const untils = data[4].split(' ').map(unpackBase60);
  for (let i = 0; i < indices.length; i++) untils[i] = Math.round((untils[i - 1] || 0) + untils[i] * 60000);
  untils[indices.length - 1] = Infinity;
  const abbrs = data[1].split(' ');
  return { kind: 'mtz', zone: data[0], abbrs: indices.map(i => abbrs[i]), offsets: indices.map(i => offsets[i]), untils };
}
function closest(num, arr) {
  const len = arr.length;
  if (num < arr[0]) return 0;
  if (len > 1 && arr[len - 1] === Infinity && num >= arr[len - 2]) return len - 1;
  if (num >= arr[len - 1]) return -1;
  let lo = 0, hi = len - 1;
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (arr[mid] <= num) lo = mid; else hi = mid; }
  return hi;
}
const mtzIndex = (z, ms) => closest(ms, z.untils);
// moment-timezone's Zone.parse with its defaults (moveAmbiguousForward false, moveInvalidForward true).
function mtzParse(z, wall) {
  const { offsets, untils } = z, max = untils.length - 1;
  for (let i = 0; i < max; i++) {
    let offset = offsets[i];
    const next = offsets[i + 1];
    if (offset > next) offset = next;
    if (wall < untils[i] - offset * 60000) return offsets[i];
  }
  return offsets[max];
}
const normName = n => (n || '').toLowerCase().replace(/\//g, '_');
/** Loads moment-timezone's data; the Moment.js-style ops await this before using named zones. */
export function loadMomentTz() {
  return MTZ ? Promise.resolve() : (mtzLoading ??= import('./_moment_tz_data.mjs').then(d => {
    const packed = new Map(), cache = new Map(), links = new Map();
    for (const z of d.zones) packed.set(normName(z.slice(0, z.indexOf('|'))), z);
    for (const l of d.links) {
      const [a, b] = l.split('|');
      links.set(normName(a), b); links.set(normName(b), a);
    }
    MTZ = { packed, cache, links };
  }));
}
function mtzZone(name) {
  if (!MTZ) return null;
  const get = n => {
    const k = normName(n);
    if (MTZ.cache.has(k)) return MTZ.cache.get(k);
    if (!MTZ.packed.has(k)) return null;
    const z = unpackZone(MTZ.packed.get(k));
    MTZ.cache.set(k, z);
    return z;
  };
  const z = get(name);
  if (z) return z;
  const l = MTZ.links.get(normName(name));
  if (!l) return null;
  const t = get(l);
  return t && { ...t, zone: name };
}
function resolveTz(name) { return mtzZone((name || 'UTC').trim()) || getTz(name); }
/** The zone's UTC offset in minutes (east positive) at an instant. */
function offsetAt(tz, utcMs) {
  if (tz.kind === 'mtz') return -tz.offsets[mtzIndex(tz, utcMs)];
  return utcToZonedParts(tz, utcMs).tzOffsetMin;
}
// moment-timezone prints tzdb abbreviations; Intl knows most of them under some English (or
// local) locale, and these few single-offset zones it doesn't name at all.
const FIXED_ABBR = {
  'Asia/Shanghai': 'CST', 'Asia/Taipei': 'CST', 'Asia/Hong_Kong': 'HKT', 'Asia/Jakarta': 'WIB', 'Asia/Manila': 'PST',
  'Asia/Karachi': 'PKT', 'Africa/Lagos': 'WAT', 'Africa/Nairobi': 'EAT', 'Europe/Moscow': 'MSK', 'PRC': 'CST', 'Hongkong': 'HKT',
};

// moment-timezone's reading of a wall-clock time: in a DST overlap the earlier instant (the
// daylight-time reading) wins.
function wallToUtc(tz, y, mo, d, h, mi, s) {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  if (tz.kind === 'mtz') return wall + mtzParse(tz, wall) * 60000;
  if (tz.kind === 'fixed') return wall - tz.offsetMin * 60000;
  const offAt = ms => utcToZonedParts(tz, ms).tzOffsetMin;
  const cands = [...new Set([offAt(wall - 864e5 / 2), offAt(wall + 864e5 / 2)])]
    .map(o => wall - o * 60000).filter(u => offAt(u) * 60000 === wall - u).sort((a, b) => a - b);
  return cands.length ? cands[0] : localToUtc(tz, y, mo, d, h, mi, s);
}
function zoneAbbr(tz, utcMs, offsetMin) {
  if (tz.kind === 'mtz') return tz.abbrs[mtzIndex(tz, utcMs)];
  if (tz.kind === 'fixed') return offsetMin === 0 ? 'UTC' : '';
  if (/^(Etc\/)?(UTC|UCT|Universal|Zulu)$/.test(tz.zone)) return 'UTC';
  if (FIXED_ABBR[tz.zone]) return FIXED_ABBR[tz.zone];
  for (const loc of ['en-US', 'en-GB', 'en-IN', 'en-AU', 'en-NZ', 'en-ZA', 'ja-JP', 'ko-KR']) {
    const p = new Intl.DateTimeFormat(loc, { timeZone: tz.zone, timeZoneName: 'short' }).formatToParts(new Date(utcMs)).find(x => x.type === 'timeZoneName');
    if (p && !/^(GMT|UTC)[+-]/.test(p.value)) return p.value;
  }
  // tzdb's numeric abbreviations, e.g. "+03", "+0530".
  const a = Math.abs(offsetMin);
  return (offsetMin < 0 ? '-' : '+') + zeroFill(Math.floor(a / 60), 2) + (a % 60 ? zeroFill(a % 60, 2) : '');
}

/** A moment: an instant plus the zone it's displayed in. */
export function zoned(utcMs, tzName) {
  const tz = resolveTz(tzName);
  let p;
  if (tz.kind === 'mtz') {
    const off = offsetAt(tz, utcMs), l = new Date(utcMs + off * 60000);
    p = { year: l.getUTCFullYear(), month: l.getUTCMonth() + 1, day: l.getUTCDate(), hour: l.getUTCHours(), minute: l.getUTCMinutes(), second: l.getUTCSeconds(), tzOffsetMin: off };
  } else p = utcToZonedParts(tz, utcMs);
  const ms = ((utcMs % 1000) + 1000) % 1000;
  return { utcMs, tz, ...p, ms, abbr: zoneAbbr(tz, utcMs, p.tzOffsetMin) };
}

function offsetStr(min, sep) {
  const a = Math.abs(min);
  return (min < 0 ? '-' : '+') + zeroFill(~~(a / 60), 2) + sep + zeroFill(~~a % 60, 2);
}

export function momentFormat(m, format) {
  // moment's default format, with a literal Z when the offset is zero.
  format = expandFormat(format || (m.tzOffsetMin === 0 ? 'YYYY-MM-DDTHH:mm:ss[Z]' : 'YYYY-MM-DDTHH:mm:ssZ'));
  const p = { year: m.year, month: m.month, day: m.day };
  const wd = weekday(p);
  const H = m.hour;
  const tok = {
    M: () => m.month, Mo: () => ordinal(m.month), MM: () => zeroFill(m.month, 2), MMM: () => MONTHS_SHORT[m.month - 1], MMMM: () => MONTHS[m.month - 1],
    Q: () => Math.ceil(m.month / 3), Qo: () => ordinal(Math.ceil(m.month / 3)),
    D: () => m.day, Do: () => ordinal(m.day), DD: () => zeroFill(m.day, 2),
    DDD: () => dayOfYear(p), DDDo: () => ordinal(dayOfYear(p)), DDDD: () => zeroFill(dayOfYear(p), 3),
    d: () => wd, do: () => ordinal(wd), dd: () => DAYS_MIN[wd], ddd: () => DAYS_SHORT[wd], dddd: () => DAYS[wd],
    e: () => wd, E: () => wd || 7,
    w: () => weekOfYear(p, 0, 6).week, wo: () => ordinal(weekOfYear(p, 0, 6).week), ww: () => zeroFill(weekOfYear(p, 0, 6).week, 2),
    W: () => weekOfYear(p, 1, 4).week, Wo: () => ordinal(weekOfYear(p, 1, 4).week), WW: () => zeroFill(weekOfYear(p, 1, 4).week, 2),
    YY: () => zeroFill(m.year % 100, 2), YYYY: () => (m.year <= 9999 ? zeroFill(m.year, 4) : '+' + m.year),
    YYYYY: () => zeroFill(m.year, 5), YYYYYY: () => (m.year < 0 ? '-' : '+') + zeroFill(Math.abs(m.year), 6),
    gg: () => zeroFill(weekOfYear(p, 0, 6).year % 100, 2), gggg: () => zeroFill(weekOfYear(p, 0, 6).year, 4), ggggg: () => zeroFill(weekOfYear(p, 0, 6).year, 5),
    GG: () => zeroFill(weekOfYear(p, 1, 4).year % 100, 2), GGGG: () => zeroFill(weekOfYear(p, 1, 4).year, 4), GGGGG: () => zeroFill(weekOfYear(p, 1, 4).year, 5),
    a: () => (H > 11 ? 'pm' : 'am'), A: () => (H > 11 ? 'PM' : 'AM'),
    H: () => H, HH: () => zeroFill(H, 2), h: () => H % 12 || 12, hh: () => zeroFill(H % 12 || 12, 2), k: () => H || 24, kk: () => zeroFill(H || 24, 2),
    hmm: () => '' + (H % 12 || 12) + zeroFill(m.minute, 2), hmmss: () => '' + (H % 12 || 12) + zeroFill(m.minute, 2) + zeroFill(m.second, 2),
    Hmm: () => '' + H + zeroFill(m.minute, 2), Hmmss: () => '' + H + zeroFill(m.minute, 2) + zeroFill(m.second, 2),
    m: () => m.minute, mm: () => zeroFill(m.minute, 2), s: () => m.second, ss: () => zeroFill(m.second, 2),
    Z: () => offsetStr(m.tzOffsetMin, ':'), ZZ: () => offsetStr(m.tzOffsetMin, ''), z: () => m.abbr, zz: () => m.abbr,
    X: () => Math.floor(m.utcMs / 1000), x: () => m.utcMs,
  };
  return format.replace(FORMAT_TOKENS, (t, bracket, esc, name) => {
    if (bracket) return bracket.slice(1, -1);
    if (esc) return name;
    if (/^S{1,9}$/.test(t)) {
      const s = String(m.ms).padStart(3, '0');
      return t.length <= 3 ? s.slice(0, t.length) : s + '0'.repeat(t.length - 3);
    }
    if (tok[t]) return String(tok[t]());
    if (/^y{2,4}$|^yo?$|^N{1,5}$/.test(t)) return t.startsWith('N') ? (m.year > 0 ? 'AD' : 'BC') : String(m.year);
    return t;
  });
}

// --- non-strict parsing (moment's configFromStringAndFormat) -----------------------------------
const NAMES_RX = (long, short) => new RegExp('^(' + [...long, ...short].sort((a, b) => b.length - a.length).join('|') + ')', 'i');
const MONTH_RX = NAMES_RX(MONTHS, MONTHS_SHORT);
const DAY_RX = NAMES_RX(DAYS, [...DAYS_SHORT, ...DAYS_MIN]);
const PARSE_RX = {
  M: /\d\d?/, MM: /\d\d?/, MMM: MONTH_RX, MMMM: MONTH_RX, Q: /\d/,
  D: /\d\d?/, DD: /\d\d?/, Do: /\d{1,2}(th|st|nd|rd)|\d{1,2}/, DDD: /\d{1,3}/, DDDD: /\d{1,3}/,
  d: /\d\d?/, e: /\d\d?/, E: /\d\d?/, dd: DAY_RX, ddd: DAY_RX, dddd: DAY_RX,
  YY: /\d\d?/, YYYY: /\d{1,4}/, YYYYY: /[+-]?\d{1,6}/, YYYYYY: /[+-]?\d{1,6}/, Y: /[+-]?\d+/,
  a: /[ap]\.?m?\.?/i, A: /[ap]\.?m?\.?/i,
  H: /\d\d?/, HH: /\d\d?/, h: /\d\d?/, hh: /\d\d?/, k: /\d\d?/, kk: /\d\d?/, m: /\d\d?/, mm: /\d\d?/, s: /\d\d?/, ss: /\d\d?/,
  S: /\d{1,3}/, SS: /\d{1,3}/, SSS: /\d{1,3}/,
  Z: /Z|[+-]\d\d(?::?\d\d)?/i, ZZ: /Z|[+-]\d\d(?::?\d\d)?/i,
  X: /[+-]?\d+(\.\d{1,3})?/, x: /[+-]?\d+/,
};
const escRx = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/** moment.tz(input, format, zone): returns the instant in ms, or NaN for moment's "Invalid date". */
export function momentTzParse(input, format, zoneName) {
  const tz = resolveTz(zoneName);
  if (format === '') {
    // Automatic: moment's ISO 8601 / RFC 2822 / Date() fallbacks; an ISO time with no offset is
    // wall-clock time in the zone.
    const ms = momentParse(input, true);
    if (isNaN(ms)) return NaN;
    if (/(Z|[+-]\d\d(:?\d\d)?)\s*$/i.test(input.trim()) || !/^\s*[+-]?\d{4}/.test(input)) return ms;
    const d = new Date(ms);
    return wallToUtc(tz, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()) + d.getUTCMilliseconds();
  }
  const tokens = expandFormat(format).match(FORMAT_TOKENS) || [];
  let str = input;
  const a = {};
  let empty = true, tzm, meridiem, weekdayParsed, stamp, dayOfYearParsed;
  for (const t of tokens) {
    const isFmt = Object.prototype.hasOwnProperty.call(PARSE_RX, t) || /^S{4,9}$/.test(t);
    const rx = isFmt ? (PARSE_RX[t] || /\d+/) : new RegExp(escRx(t.replace(/^\[|\]$/g, '').replace(/^\\/, '')));
    const mm = str.match(rx);
    const got = mm && mm[0];
    if (got) str = str.slice(str.indexOf(got) + got.length);
    if (!isFmt || !got) continue;
    empty = false;
    switch (t) {
      case 'M': case 'MM': a.month = parseInt(got, 10) - 1; break;
      case 'MMM': case 'MMMM': {
        const g = got.toLowerCase();
        a.month = Math.max(MONTHS.findIndex(x => x.toLowerCase() === g), MONTHS_SHORT.findIndex(x => x.toLowerCase() === g));
        break;
      }
      case 'Q': a.month = (parseInt(got, 10) - 1) * 3; break;
      case 'D': case 'DD': a.day = parseInt(got, 10); break;
      case 'Do': a.day = parseInt(got.match(/\d\d?/)[0], 10); break;
      case 'DDD': case 'DDDD': dayOfYearParsed = parseInt(got, 10); break;
      case 'dd': case 'ddd': case 'dddd': {
        const g = got.toLowerCase();
        weekdayParsed = [DAYS, DAYS_SHORT, DAYS_MIN].map(l => l.findIndex(x => x.toLowerCase() === g)).find(i => i >= 0);
        break;
      }
      case 'd': case 'e': weekdayParsed = parseInt(got, 10); break;
      case 'E': weekdayParsed = parseInt(got, 10) % 7; break;
      case 'YY': { const y = parseInt(got, 10); a.year = y + (y > 68 ? 1900 : 2000); break; }
      case 'YYYY': a.year = got.length === 2 ? parseInt(got, 10) + (parseInt(got, 10) > 68 ? 1900 : 2000) : parseInt(got, 10); break;
      case 'YYYYY': case 'YYYYYY': case 'Y': a.year = parseInt(got, 10); break;
      case 'a': case 'A': meridiem = got; break;
      case 'H': case 'HH': case 'k': case 'kk': case 'h': case 'hh': a.hour = parseInt(got, 10); break;
      case 'm': case 'mm': a.minute = parseInt(got, 10); break;
      case 's': case 'ss': a.second = parseInt(got, 10); break;
      case 'Z': case 'ZZ': {
        if (/^z$/i.test(got)) { tzm = 0; break; }
        const parts = got.match(/([+-])(\d\d):?(\d\d)?/);
        const mins = parseInt(parts[2], 10) * 60 + parseInt(parts[3] || '0', 10);
        tzm = mins === 0 ? 0 : parts[1] === '+' ? mins : -mins;
        break;
      }
      case 'X': stamp = parseFloat(got) * 1000; break;
      case 'x': stamp = parseInt(got, 10); break;
      default: a.ms = Math.trunc(Number('0.' + got) * 1000);
    }
  }
  if (empty) return NaN;
  if (stamp !== undefined) return stamp;
  if (meridiem !== undefined && a.hour !== undefined) {
    const pm = (meridiem + '').toLowerCase()[0] === 'p';
    if (pm && a.hour < 12) a.hour += 12;
    if (!pm && a.hour === 12) a.hour = 0;
  }
  // Leading missing date fields come from today's date - the zone's wall-clock date (moment-tz's
  // parseWithZoneNow), or UTC's when the input carried its own offset; the rest default to 1 / 0.
  const now = new Date(tzm === undefined ? Date.now() + offsetAt(tz, Date.now()) * 60000 : Date.now());
  const arr = [a.year, a.month, a.day];
  const cur = [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
  let i = 0;
  for (; i < 3 && arr[i] == null; i++) arr[i] = cur[i];
  for (; i < 3; i++) if (arr[i] == null) arr[i] = i === 2 ? 1 : 0;
  let [year, month, day] = arr;
  if (dayOfYearParsed !== undefined && a.month == null && a.day == null) {
    if (dayOfYearParsed < 1 || dayOfYearParsed > (isLeap(year) ? 366 : 365)) return NaN;
    const d = new Date(Date.UTC(year, 0, dayOfYearParsed));
    month = d.getUTCMonth(); day = d.getUTCDate();
  }
  const hour = a.hour ?? 0, minute = a.minute ?? 0, second = a.second ?? 0, ms = a.ms ?? 0;
  // moment's overflow checks
  if (month < 0 || month > 11 || day < 1 || day > [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] ||
    hour < 0 || hour > 24 || (hour === 24 && (minute || second || ms)) || minute < 0 || minute > 59 || second < 0 || second > 59) return NaN;
  if (weekdayParsed !== undefined && weekdayParsed !== new Date(Date.UTC(year, month, day)).getUTCDay()) return NaN;
  const nextDay = hour === 24;
  const wall = Date.UTC(year, month, day, nextDay ? 0 : hour, minute, second, ms) + (nextDay ? 864e5 : 0);
  if (year >= 0 && year < 100) {
    const d = new Date(wall); d.setUTCFullYear(year);
    if (tzm !== undefined) return d.getTime() - tzm * 60000;
    return wallToUtc(tz, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()) + ms;
  }
  if (tzm !== undefined) return wall - tzm * 60000;
  const w = new Date(wall);
  return wallToUtc(tz, w.getUTCFullYear(), w.getUTCMonth() + 1, w.getUTCDate(), w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds()) + ms;
}

/** moment's isDST(): the offset is larger than in January or in June. */
export function isDST(m) {
  const jan = offsetAt(m.tz, Date.UTC(m.year, 0, m.day > 28 ? 28 : m.day, m.hour));
  const jun = offsetAt(m.tz, Date.UTC(m.year, 5, m.day > 28 ? 28 : m.day, m.hour));
  return m.tzOffsetMin > jan || m.tzOffsetMin > jun;
}

export function momentWeek(m) { return weekOfYear(m, 0, 6).week; }
export function momentDayOfYear(m) { return dayOfYear(m); }
export function momentDaysInMonth(m) { return [31, isLeap(m.year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m.month - 1]; }
export function momentIsLeap(m) { return isLeap(m.year); }
