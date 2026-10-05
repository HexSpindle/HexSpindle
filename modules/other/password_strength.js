import { module } from './_cat.js';

const COMMON = new Set(['password', '123456', '123456789', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou', 'abc123',
  '111111', '1234567890', 'dragon', 'monkey', 'football', 'login', 'princess', 'passw0rd', 'p@ssword', '123123',
  'sunshine', 'master', 'shadow']);
const KEYBOARD_RUNS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'qazwsx'];
const CLASSES = [['lowercase', /[a-z]/, 26], ['uppercase', /[A-Z]/, 26], ['digits', /[0-9]/, 10], ['symbols', /[^a-zA-Z0-9]/, 33]];

function fmtTime(s) {
  if (s < 1) return 'instantly';
  const units = [['second', 60], ['minute', 60], ['hour', 24], ['day', 365], ['year', 100], ['century', 10], ['millennium', 1000]];
  let val = s, name = 'second';
  for (const [unit, factor] of units) {
    name = unit;
    if (val < factor) return `~${val.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ${name}${val !== 1 ? 's' : ''}`;
    val /= factor;
  }
  return `${val.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${name}s (effectively uncrackable)`;
}

module('Password Strength Analyser', 'Estimates entropy and crack time for a password, and flags common weaknesses.',
  [],
  (t) => {
    const pw = t.replace(/\n+$/, '');
    if (!pw) return 'Empty input';
    let pool = 0;
    for (const [, rx, size] of CLASSES) if (rx.test(pw)) pool += size;
    pool = pool || 1;
    const rawBits = pw.length * Math.log2(pool);

    const warnings = [];
    const low = pw.toLowerCase();
    if (COMMON.has(low)) warnings.push('Matches a very common password');
    if (/^(.)\1*$/.test(pw)) warnings.push('Single repeated character');
    const rep = pw.match(/(.)\1{2,}/);
    if (rep) warnings.push(`Contains a repeated run ('${rep[0]}')`);
    outer:
    for (const run of KEYBOARD_RUNS) {
      for (let i = 0; i < run.length - 3; i++) {
        const seg = run.slice(i, i + 4);
        const rev = [...seg].reverse().join('');
        if (low.includes(seg) || low.includes(rev)) {
          warnings.push(`Contains a keyboard pattern ('${seg}')`);
          break outer;
        }
      }
    }
    const years = pw.match(/(19|20)\d{2}/);
    if (years) warnings.push(`Contains a year (${years[0]})`);
    const seq = low.match(/012|123|234|345|456|567|678|789|890|abc|bcd|cde/);
    if (seq) warnings.push(`Contains a sequence ('${seq[0]}')`);
    if (pw.length < 8) warnings.push('Shorter than 8 characters');
    if (new Set(pw).size < pw.length / 2) warnings.push('Low character variety (many repeats)');

    const penalty = Math.min(rawBits * 0.6, warnings.length * 6);
    const effBits = Math.max(0, rawBits - penalty);

    const guessesPerSec = 1e10;
    const seconds = 2 ** effBits / guessesPerSec;

    const verdict = effBits < 28 ? 'Very weak' : effBits < 36 ? 'Weak' : effBits < 60 ? 'Reasonable' : effBits < 80 ? 'Strong' : 'Very strong';
    const classesPresent = CLASSES.filter(([, rx]) => rx.test(pw)).map(([n]) => n).join(', ') || 'none';
    const out = [
      `Length: ${pw.length}`,
      `Character pool: ${pool} (${classesPresent})`,
      `Raw entropy: ${rawBits.toFixed(1)} bits`,
      `Estimated entropy (after pattern penalties): ${effBits.toFixed(1)} bits`,
      `Verdict: ${verdict}`,
      `Offline fast-hash crack time estimate (10^10 guesses/s): ${fmtTime(seconds)}`,
      `Online throttled estimate (10 guesses/s): ${fmtTime(2 ** effBits / 10)}`,
    ];
    if (warnings.length) { out.push('Warnings:'); out.push(...warnings.map(w => `  - ${w}`)); }
    else out.push('No common weaknesses detected.');
    return out.join('\n');
  }, { text: true });
