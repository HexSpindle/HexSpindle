import { pad2 } from './_strptime.js';

export const FORMATS = ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S%z', '%a, %d %b %Y %H:%M:%S %Z', '%d/%m/%Y %H:%M:%S', '%m/%d/%Y %H:%M:%S', '%Y-%m-%d', '%H:%M:%S', '%Y%m%d%H%M%S'];

export function getTz(name) {
  name = (name || 'UTC').trim();
  if (/^(UTC|GMT|Z)$/i.test(name)) return { kind: 'fixed', offsetMin: 0, label: 'UTC' };
  const m = /^(?:UTC)?([+-])(\d\d):?(\d\d)?$/.exec(name);
  if (m) {
    const hh = parseInt(m[2], 10), mm = parseInt(m[3] || '0', 10);
    const offsetMin = (m[1] === '+' ? 1 : -1) * (hh * 60 + mm);
    return { kind: 'fixed', offsetMin, label: offsetMin === 0 ? 'UTC' : `UTC${m[1]}${pad2(hh)}:${pad2(mm)}` };
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name });
  } catch {
    throw new Error(`Unknown time zone: ${name} (use UTC, +05:30 or an IANA name)`);
  }
  return { kind: 'named', zone: name };
}

function offsetMinAtUtc(tz, utcMs) {
  if (tz.kind === 'fixed') return tz.offsetMin;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz.zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const o = {};
  for (const { type, value } of parts) o[type] = value;
  const hour = +o.hour === 24 ? 0 : +o.hour;
  const asUtc = Date.UTC(+o.year, +o.month - 1, +o.day, hour, +o.minute, +o.second);
  return Math.round((asUtc - utcMs) / 60000);
}

function abbrAtUtc(tz, utcMs) {
  if (tz.kind === 'fixed') return tz.label;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz.zone, timeZoneName: 'short', hour: '2-digit' }).formatToParts(new Date(utcMs));
  const part = parts.find(p => p.type === 'timeZoneName');
  return part ? part.value : tz.zone;
}

/** Converts a wall-clock date/time in `tz` to a UTC instant (ms since epoch). */
export function localToUtc(tz, y, m, d, h, mi, s) {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  if (tz.kind === 'fixed') return guess - tz.offsetMin * 60000;
  const offset = offsetMinAtUtc(tz, guess);
  let utc = guess - offset * 60000;
  const offset2 = offsetMinAtUtc(tz, utc);
  if (offset2 !== offset) utc = guess - offset2 * 60000;
  return utc;
}

/** Converts a UTC instant to wall-clock fields in `tz`, plus its offset and name there. */
export function utcToZonedParts(tz, utcMs) {
  const offsetMin = offsetMinAtUtc(tz, utcMs);
  const local = new Date(utcMs + offsetMin * 60000);
  return {
    year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
    hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds(),
    tzOffsetMin: offsetMin, tzAbbr: abbrAtUtc(tz, utcMs),
  };
}
