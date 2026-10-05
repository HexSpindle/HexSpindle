import { module } from './_cat.js';

const BROWSERS = [
  ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/], ['Opera', /OPR\/([\d.]+)/], ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/], ['Safari', /Version\/([\d.]+).*Safari/],
  ['Internet Explorer', /(?:MSIE |rv:)([\d.]+).*Trident|MSIE ([\d.]+)/], ['curl', /curl\/([\d.]+)/], ['Googlebot', /Googlebot\/([\d.]+)/],
];
const OSES = [
  ['Windows 11/10', /Windows NT 10\.0/], ['Windows 8.1', /Windows NT 6\.3/], ['Windows 7', /Windows NT 6\.1/],
  ['Android', /Android ([\d.]+)/], ['iOS', /(?:iPhone|iPad).*OS ([\d_]+)/], ['macOS', /Mac OS X ([\d_.]+)/],
  ['ChromeOS', /CrOS/], ['Linux', /Linux/],
];

module('Parse User Agent', 'Identifies browser, engine and operating system from a User-Agent string.', [],
  (t) => {
    const out = [];
    for (const [name, rx] of BROWSERS) {
      const m = rx.exec(t);
      if (m) {
        const g = m.slice(1).find(x => x);
        out.push(`Browser: ${name} ${g || ''}`.trim());
        break;
      }
    }
    for (const [name, rx] of OSES) {
      const m = rx.exec(t);
      if (m) {
        out.push(`OS: ${name} ${m.length > 1 && m[1] ? m[1].replace(/_/g, '.') : ''}`.trim());
        break;
      }
    }
    for (const [name, rx] of [['Blink', /AppleWebKit\/[\d.]+.*Chrome/], ['WebKit', /AppleWebKit/], ['Gecko', /Gecko\/\d+/], ['Trident', /Trident/]]) {
      if (rx.test(t)) { out.push(`Engine: ${name}`); break; }
    }
    out.push('Device: ' + (/Mobile|iPhone|Android/.test(t) ? 'Mobile' : t.includes('iPad') ? 'Tablet' : 'Desktop'));
    return out.join('\n');
  }, { text: true });
