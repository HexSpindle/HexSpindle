import { module } from './_cat.js';

const CHECKS = [
  ['Strict-Transport-Security', true, 'Forces browsers to use HTTPS for this site, preventing downgrade attacks.'],
  ['Content-Security-Policy', true, 'Restricts which scripts/styles/frames can load, mitigating XSS.'],
  ['X-Content-Type-Options', true, "Should be 'nosniff' to stop MIME-sniffing attacks."],
  ['X-Frame-Options', false, 'Prevents clickjacking by blocking framing (superseded by CSP frame-ancestors).'],
  ['Referrer-Policy', false, 'Controls how much referrer information is leaked to other sites.'],
  ['Permissions-Policy', false, 'Restricts browser features (camera, geolocation, etc.) available to the page.'],
  ['Set-Cookie', null, 'Cookies should carry Secure, HttpOnly and SameSite attributes.'],
  ['Server', null, 'Revealing detailed server/version info helps attackers fingerprint the stack.'],
  ['X-Powered-By', null, 'Reveals the backend framework/version; best removed.'],
];

module('HTTP Security Header Audit', "Parses a block of HTTP response headers (as pasted, or from HTTP request's Headers output) and reports on security-relevant headers, with a letter grade.", [],
  (t) => {
    const headers = new Map();
    for (const line of t.split('\n')) {
      if (line.includes(':') && !line.startsWith('HTTP/')) {
        const idx = line.indexOf(':');
        const k = line.slice(0, idx).trim(), v = line.slice(idx + 1).trim();
        if (!headers.has(k)) headers.set(k, []);
        headers.get(k).push(v);
      }
    }
    const low = new Map();
    for (const [k, v] of headers) low.set(k.toLowerCase(), v);
    const out = [];
    let score = 0, maxscore = 0;
    for (const [name, wantPresent, desc] of CHECKS) {
      const key = name.toLowerCase();
      const present = low.has(key);
      if (name === 'Set-Cookie') {
        for (const c of low.get(key) || []) {
          const flags = [];
          if (!c.toLowerCase().includes('secure')) flags.push('missing Secure');
          if (!c.toLowerCase().includes('httponly')) flags.push('missing HttpOnly');
          if (!c.toLowerCase().includes('samesite')) flags.push('missing SameSite');
          out.push(`Set-Cookie: ${c.slice(0, 60)}${c.length > 60 ? '...' : ''}` + (flags.length ? `  [${flags.join(', ')}]` : '  [OK]'));
        }
        continue;
      }
      if (name === 'Server' || name === 'X-Powered-By') {
        if (present) out.push(`${name}: ${low.get(key)[0]}  [consider removing/minimising this]`);
        continue;
      }
      maxscore += 2;
      if (present) {
        score += 2;
        let extra = '';
        if (name === 'X-Content-Type-Options' && low.get(key)[0].toLowerCase() !== 'nosniff') {
          extra = "  [present but not 'nosniff']";
          score -= 1;
        }
        out.push(`[present] ${name}: ${low.get(key)[0].slice(0, 80)}${extra}`);
      } else {
        out.push(`[${wantPresent ? 'MISSING' : 'missing'}] ${name} - ${desc}`);
      }
    }
    const ratio = score / Math.max(maxscore, 1);
    const grade = maxscore && score / maxscore > 0.9 ? 'A' : ratio > 0.75 ? 'B' : ratio > 0.5 ? 'C' : ratio > 0.25 ? 'D' : 'F';
    out.unshift(`Security header score: ${score}/${maxscore}  (grade ${grade})\n`);
    return out.join('\n');
  }, { text: true });
