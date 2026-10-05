import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { FORMATS, getTz, localToUtc, utcToZonedParts } from './_tz.js';
import { strptime, strftime, isoformatParts, pad2, dayOfYear, isoWeekNumber, isLeapYear, formatOffset } from './_strptime.js';

module('Parse DateTime', 'Parses a date/time string and reports its components.',
  [A.combo('Input format', FORMATS.map(f => [f, f])), A.string('Input time zone', 'UTC'), A.string('Output time zone', 'UTC')],
  (t, fmt, itz, otz) => {
    const p = strptime(t.trim(), fmt);
    const utcMs = p.tzOffsetMin != null
      ? Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, Math.floor(p.microsecond / 1000)) - p.tzOffsetMin * 60000
      : localToUtc(getTz(itz), p.year, p.month, p.day, p.hour, p.minute, p.second);
    const z = utcToZonedParts(getTz(otz), utcMs);
    z.microsecond = p.microsecond;
    return [
      `Date: ${strftime(z, '%A')} ${z.day} ${strftime(z, '%B')} ${z.year}`,
      `Time: ${pad2(z.hour)}:${pad2(z.minute)}:${pad2(z.second)}`,
      `Period: ${z.hour < 12 ? 'AM' : 'PM'}`,
      `Time zone: ${z.tzAbbr}`,
      `UTC offset: ${formatOffset(z.tzOffsetMin)}`,
      `Day of year: ${dayOfYear(z)}`,
      `ISO week: ${isoWeekNumber(z)}`,
      `Leap year: ${isLeapYear(z.year) ? 'Yes' : 'No'}`,
      `ISO 8601: ${isoformatParts(z)}`,
      `UNIX timestamp: ${Math.floor(utcMs / 1000)}`,
    ];
  },
  { text: true });
