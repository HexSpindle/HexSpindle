// Magic hints for date and time operations: values that are timestamps in disguise.
import { analyses } from '../../core/magic-detect.js';

const value = ({ isText, text }) => isText && text.length <= 40 && !/\n/.test(text) ? text : '';
// Plausible epoch range: 2001 to 2040.
const epoch = (digits, low, high) => ctx => { const t = value(ctx); return t.length === digits && /^\d+$/.test(t) && +t >= low && +t < high; };
const seconds = epoch(10, 1e9, 2.21e9), millis = epoch(13, 1e12, 2.21e12);

analyses('From UNIX Timestamp', ctx => seconds(ctx) ? { fit: 0.75, args: ['Seconds (s)'] } : millis(ctx) ? { fit: 0.75, args: ['Milliseconds (ms)'], label: 'From UNIX Timestamp (milliseconds)' } : null);
analyses('Parse Any Timestamp', ctx => {
  const t = value(ctx);
  if (seconds(ctx) || millis(ctx)) return 0.7;
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(t) || /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,? /.test(t)) return 0.7;
  return /^1[23]\d{16}$/.test(t) ? { fit: 0.6, label: 'Parse Any Timestamp (Windows FILETIME?)' } : null;
});
analyses('Parse ObjectID timestamp', ctx => /^[0-9a-f]{24}$/i.test(value(ctx)) ? 0.6 : null);
