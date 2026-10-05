import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { FORMATS, getTz, localToUtc, utcToZonedParts } from './_tz.js';
import { strptime, strftime } from './_strptime.js';

module('Translate DateTime Format', 'Re-formats a date/time from one format and zone to another.',
  [A.combo('Input format', FORMATS.map(f => [f, f])), A.string('Input time zone', 'UTC'),
    A.combo('Output format', FORMATS.map(f => [f, f]), '%Y-%m-%dT%H:%M:%S%z'), A.string('Output time zone', 'UTC')],
  (t, ifmt, itz, ofmt, otz) => {
    const p = strptime(t.trim(), ifmt);
    const utcMs = p.tzOffsetMin != null
      ? Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, Math.floor(p.microsecond / 1000)) - p.tzOffsetMin * 60000
      : localToUtc(getTz(itz), p.year, p.month, p.day, p.hour, p.minute, p.second);
    const z = utcToZonedParts(getTz(otz), utcMs);
    z.microsecond = p.microsecond;
    return strftime(z, ofmt);
  },
  { text: true });
