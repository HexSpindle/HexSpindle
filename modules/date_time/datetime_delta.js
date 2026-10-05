import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { FORMATS } from './_tz.js';
import { strptime, strftime } from './_strptime.js';

module('DateTime Delta', 'Adds or subtracts a time span from a date/time.',
  [A.combo('Built in formats', FORMATS.map(f => [f, f])), A.select('Operation', ['Add', 'Subtract']),
    A.number('Days', 0), A.number('Hours', 0), A.number('Minutes', 0), A.number('Seconds', 0)],
  (t, fmt, op, days, hours, mins, secs) => {
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
