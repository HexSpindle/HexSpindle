import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { FORMATS } from './_tz.js';
import { strptime, strftime } from './_strptime.js';
import { CC_FORMATS, resolveFormat, isMomentFormat, momentTzParse, momentFormat, zoned, INVALID_FORMAT_HELP, loadMomentTz } from './_momentfmt.js';

module('DateTime Delta', 'Adds or subtracts a time span from a date/time (UTC). The format is strftime-style (%Y-%m-%d) or Moment.js-style (YYYY-MM-DD).',
  [A.combo('Built in formats', [...FORMATS.map(f => [f, f]), ...CC_FORMATS.map(([n, f]) => [n, f])]), A.select('Operation', ['Add', 'Subtract']),
    A.number('Days', 0), A.number('Hours', 0), A.number('Minutes', 0), A.number('Seconds', 0)],
  async (t, fmt, op, days, hours, mins, secs) => {
    fmt = resolveFormat(fmt);
    if (isMomentFormat(fmt)) {
      await loadMomentTz();
      // moment.tz(input, format, "UTC").add(...): whole days (rounded half away from zero) plus
      // an exact number of milliseconds for the hours, minutes and seconds.
      const base = momentTzParse(t, fmt, 'UTC');
      if (isNaN(base)) return INVALID_FORMAT_HELP;
      const sign = op === 'Add' ? 1 : -1;
      const absRound = n => (n < 0 ? -1 : 1) * Math.round(Math.abs(n));
      const ms = Math.trunc(base + sign * (absRound(+days) * 864e5 + (+hours * 36e5 + +mins * 6e4 + +secs * 1e3)));
      return momentFormat(zoned(ms, 'UTC'), fmt.replace(/[<>]/g, ''));
    }
    const p = strptime(t.trim(), fmt);
    const base = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, Math.floor(p.microsecond / 1000));
    const deltaMs = (((days * 24 + hours) * 60 + mins) * 60 + secs) * 1000;
    const shifted = op === 'Add' ? base + deltaMs : base - deltaMs;
    const d = new Date(shifted);
    const np = {
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      microsecond: p.microsecond, tzOffsetMin: p.tzOffsetMin, tzAbbr: p.tzAbbr,
    };
    return strftime(np, fmt);
  },
  { text: true });
