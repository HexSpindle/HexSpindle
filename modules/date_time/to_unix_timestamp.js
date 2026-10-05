import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { momentParse, formatUTC } from './_moment.js';

module('To UNIX Timestamp', 'Parses a datetime string (ISO 8601, RFC 2822 or anything the JS Date parser accepts) and returns the corresponding UNIX timestamp.',
  [A.select('Units', ['Seconds (s)', 'Milliseconds (ms)', 'Microseconds (μs)', 'Nanoseconds (ns)']), A.boolean('Treat as UTC', true), A.boolean('Show parsed datetime', true)],
  (t, units, treatAsUTC = true, showDateTime = true) => {
    const ms = momentParse(t, treatAsUTC);
    let result;
    if (units === 'Seconds (s)') result = Math.floor(ms / 1000);
    else if (units === 'Milliseconds (ms)') result = ms;
    else if (units === 'Microseconds (μs)') result = ms * 1000;
    else if (units === 'Nanoseconds (ns)') result = ms * 1000000;
    else throw new Error('Unrecognised unit');
    return showDateTime ? `${result} (${formatUTC(ms)} UTC)` : String(result);
  }, { text: true });
