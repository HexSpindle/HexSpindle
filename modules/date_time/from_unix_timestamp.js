import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { formatUTC } from './_moment.js';

const UNITS = ['Seconds (s)', 'Milliseconds (ms)', 'Microseconds (μs)', 'Nanoseconds (ns)'];
const DIV = { 'Milliseconds (ms)': 1, 'Microseconds (μs)': 1000, 'Nanoseconds (ns)': 1000000 };

module('From UNIX Timestamp', 'Converts a UNIX timestamp to a datetime string (UTC), e.g. 978346800 becomes "Mon 1 January 2001 11:00:00 UTC".', [A.select('Units', UNITS)],
  (t, units) => {
    const n = parseFloat(t);
    if (units === 'Seconds (s)') return formatUTC(n * 1000) + ' UTC';
    if (!(units in DIV)) throw new Error('Unrecognised unit');
    return formatUTC(n / DIV[units], true) + ' UTC';
  }, { text: true });
