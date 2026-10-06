import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { FORMATS, getTz, localToUtc, utcToZonedParts } from './_tz.js';
import { strptime, strftime } from './_strptime.js';
import { CC_FORMATS, resolveFormat, isMomentFormat, momentTzParse, momentFormat, zoned, loadMomentTz } from './_momentfmt.js';

module('Translate DateTime Format', 'Re-formats a date/time from one format and zone to another. Formats are strftime-style (%Y-%m-%d) or Moment.js-style (YYYY-MM-DD).',
  [A.combo('Input format', [...FORMATS.map(f => [f, f]), ...CC_FORMATS.map(([n, f]) => [n, f])]), A.string('Input time zone', 'UTC'),
    A.combo('Output format', [...FORMATS.map(f => [f, f]), ...CC_FORMATS.map(([n, f]) => [n, f])], '%Y-%m-%dT%H:%M:%S%z'), A.string('Output time zone', 'UTC')],
  async (t, ifmt, itz, ofmt, otz) => {
    ifmt = resolveFormat(ifmt); ofmt = resolveFormat(ofmt);
    let utcMs, microsecond = 0;
    if (isMomentFormat(ifmt)) {
      await loadMomentTz();
      utcMs = momentTzParse(t, ifmt, itz);
      if (isNaN(utcMs)) return 'Invalid format.';
      microsecond = (((utcMs % 1000) + 1000) % 1000) * 1000;
    } else {
      const p = strptime(t.trim(), ifmt);
      utcMs = p.tzOffsetMin != null
        ? Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, Math.floor(p.microsecond / 1000)) - p.tzOffsetMin * 60000
        : localToUtc(getTz(itz), p.year, p.month, p.day, p.hour, p.minute, p.second);
      microsecond = p.microsecond;
    }
    if (isMomentFormat(ofmt)) await loadMomentTz();
    if (isMomentFormat(ofmt)) return momentFormat(zoned(utcMs, otz), ofmt.replace(/[<>]/g, ''));
    const z = utcToZonedParts(getTz(otz), utcMs);
    z.microsecond = microsecond;
    return strftime(z, ofmt);
  },
  { text: true });
