import { module } from './_cat.js';
import { strptime, strftime, isoformatParts, epochMsFromParts, partsFromUtcMs } from './_strptime.js';

const FORMATS = [
  '%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d', '%Y/%m/%d %H:%M:%S',
  '%Y/%m/%d', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y', '%m/%d/%Y %H:%M:%S', '%m/%d/%Y', '%d-%m-%Y', '%d.%m.%Y %H:%M:%S', '%d.%m.%Y', '%b %d %Y %H:%M:%S', '%b %d, %Y', '%d %b %Y',
  '%B %d, %Y', '%a, %d %b %Y %H:%M:%S %Z', '%a %b %d %H:%M:%S %Y', '%Y%m%d%H%M%S', '%Y%m%d', '%H:%M:%S', '%I:%M %p',
];

function floorDivMod(n, div) {
  let rem = n % div;
  if (rem < 0) rem += div;
  return [(n - rem) / div, rem];
}

function utcLong(p) { return strftime(p, '%A, %d %B %Y %H:%M:%S UTC'); }

module('Parse Any Timestamp', 'Detects the format of a date/time or epoch value and converts it to ISO 8601, UNIX seconds and a human-readable string.',
  [], (t) => {
    const s = t.trim();
    if (/^-?\d{9,13}$/.test(s)) {
      const n = Number(s);
      for (const [unit, div] of [['seconds', 1], ['milliseconds', 1000], ['microseconds', 1000000]]) {
        const [wholeSeconds, rem] = floorDivMod(n, div);
        const microsecond = rem * (1000000 / div);
        if (!Number.isFinite(wholeSeconds)) continue;
        const p = partsFromUtcMs(wholeSeconds * 1000);
        p.microsecond = microsecond;
        if (p.year > 1971 && p.year < 2100) {
          return [`Interpreted as UNIX ${unit}: ${n}`, `ISO 8601: ${isoformatParts(p)}`, `UTC: ${utcLong(p)}`].join('\n');
        }
      }
      throw new Error('Looks numeric but not a plausible UNIX timestamp');
    }
    if (/^[0-9a-fA-F]{8}$/.test(s)) {
      const p = partsFromUtcMs(parseInt(s, 16) * 1000);
      return `Interpreted as a hex UNIX timestamp: 0x${s}\nISO 8601: ${isoformatParts(p)}\nUTC: ${utcLong(p)}`;
    }
    for (const fmt of FORMATS) {
      let p;
      try { p = strptime(s, fmt); } catch { continue; }
      const iso = isoformatParts(p) + (p.tzOffsetMin == null && fmt.includes('Z') ? 'Z' : '');
      const aware = p.tzOffsetMin != null ? p : { ...p, tzOffsetMin: 0 };
      const epoch = Math.floor(epochMsFromParts(aware) / 1000);
      return `Matched format: ${fmt}\nISO 8601: ${iso}\nUNIX timestamp: ${epoch}\nUTC: ${utcLong(aware)}`;
    }
    throw new Error(`Could not recognise the date/time format of: '${s}'`);
  },
  { text: true });
