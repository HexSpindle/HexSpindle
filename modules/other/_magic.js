// Magic hints for miscellaneous operations.
import { analyses, decodes } from '../../core/magic-detect.js';

decodes('Rison Decode', ({ ascii, single, compact }) => ascii && single && /^!?\(.+\)$/.test(compact) && /[:,]/.test(compact) && !/["{}]/.test(compact) ? { fit: 0.75, needsQuality: true } : null);

const value = ({ isText, text }) => isText && text.length <= 80 && !/\n/.test(text) ? text : '';
analyses('UUID / ULID / Snowflake Inspector', ctx => {
  const t = value(ctx);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return 0.9;
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(t) && /[A-Z]/.test(t) && /\d/.test(t)) return 0.7;
  return /^\d{17,19}$/.test(t) ? 0.45 : null;
});
analyses('Parse colour code', ctx => /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$|^(?:rgb|hsl)a?\([\d\s,.%/]+\)$/i.test(value(ctx)) ? 0.85 : null);
analyses('Cron Expression Explainer', ctx => {
  const fields = value(ctx).split(/\s+/);
  return (fields.length === 5 || fields.length === 6) && fields.every(f => /^[\d*/,\-?LW#A-Za-z]+$/.test(f)) && fields.some(f => f.includes('*')) && fields.some(f => /\d/.test(f) || f === '*') && !/[a-z]{4,}/.test(value(ctx)) ? 0.75 : null;
});
analyses('P-list Viewer', ({ at, isText, head }) => at('bplist00') || (isText && /<plist\b/.test(head)) ? 0.95 : null);
