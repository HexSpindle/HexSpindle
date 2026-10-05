import { module } from './_cat.js';

const NAMES_MON = { 1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
const NAMES_DOW = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

function rangeIncl(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

function pyInt(s) {
  s = s.trim();
  if (!/^[+-]?\d+$/.test(s)) throw new Error(`invalid literal for int() with base 10: '${s}'`);
  return parseInt(s, 10);
}

function expand(field, lo, hi, names) {
  let out = [];
  for (let part of field.split(',')) {
    let step = 1;
    if (part.includes('/')) { const sp = part.split('/'); part = sp[0]; step = pyInt(sp[1]); }
    let rng;
    if (part === '*') rng = rangeIncl(lo, hi);
    else if (part.includes('-')) { const [a, b] = part.split('-').map(pyInt); rng = rangeIncl(a, b); }
    else rng = [pyInt(part)];
    if (step !== 1) out.push(...rng.filter(v => (v - rng[0]) % step === 0));
    else out.push(...rng);
  }
  out = [...new Set(out)].sort((a, b) => a - b);
  if (names) return out.map(v => (v in names ? names[v] : String(v))).join(', ');
  return out.join(', ');
}

module('Cron Expression Explainer', 'Explains a 5 or 6-field cron expression in plain English and lists matching values for each field.', [],
  (t) => {
    const parts = t.trim().split(/\s+/).filter(Boolean);
    let sec, mi, hr, dom, mon, dow;
    if (parts.length === 6) [sec, mi, hr, dom, mon, dow] = parts;
    else if (parts.length === 5) { sec = null; [mi, hr, dom, mon, dow] = parts; }
    else throw new Error('Expected 5 fields (m h dom mon dow) or 6 (s m h dom mon dow)');
    const out = [];
    if (sec !== null) out.push(`Second: ${expand(sec, 0, 59)}`);
    out.push(`Minute: ${expand(mi, 0, 59)}`);
    out.push(`Hour: ${expand(hr, 0, 23)}`);
    out.push(`Day of month: ${dom === '*' ? 'every day' : expand(dom, 1, 31)}`);
    out.push(`Month: ${mon === '*' ? 'every month' : expand(mon, 1, 12, NAMES_MON)}`);
    out.push(`Day of week: ${dow === '*' ? 'every day' : expand(dow, 0, 7, NAMES_DOW)}`);
    const simple = [];
    if (mi !== '*' && hr !== '*' && !mi.includes(',') && !hr.includes(',') && !mi.includes('/') && !hr.includes('/')) {
      simple.push(`at ${String(pyInt(hr)).padStart(2, '0')}:${String(pyInt(mi)).padStart(2, '0')}`);
    }
    if (dom === '*' && mon === '*' && dow === '*') {
      simple.push(simple.length ? '' : 'every day');
    } else if (dow !== '*') {
      simple.push(`on ${expand(dow, 0, 7, NAMES_DOW)}`);
    }
    if (simple.length) {
      const joined = simple.filter(s => s).join(' ').trim();
      out.unshift('');
      out.unshift('Summary: ' + joined);
    }
    return out.join('\n');
  }, { text: true });
