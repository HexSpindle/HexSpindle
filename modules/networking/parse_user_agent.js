import { module } from './_cat.js';

const BROWSERS = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/([\w.]+)/], ['Opera', /\bOPR\/([\w.]+)/], ['Mobile Chrome', /\bCriOS\/([\w.]+)/],
  ['Mobile Firefox', /\bFxiOS\/([\w.]+)/], ['Chrome Headless', /\bHeadlessChrome\/([\w.]+)/],
  ['Mobile Chrome', /\bChrome\/([\w.]+) Mobile\b/], ['Chrome', /\bChrome\/([\w.]+)/],
  ['Mobile Firefox', /\bMobile;.*Firefox\/([\w.]+)|Android.*Firefox\/([\w.]+)/], ['Firefox', /\bFirefox\/([\w.]+)/],
  ['Mobile Safari', /\bVersion\/([\w.]+).*Mobile\/\w+.*Safari\//], ['Safari', /\bVersion\/([\w.]+).*Safari\//],
  ['IE', /\bMSIE ([\w.]+)/], ['IE', /\bTrident\/.*rv:([\w.]+)/],
];
const WINDOWS = { '10.0': '10', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.2': 'XP', '5.1': 'XP', '5.0': '2000' };

function detect(t) {
  const r = { browser: {}, device: {}, engine: {}, os: {}, cpu: {} };
  for (const [name, rx] of BROWSERS) {
    const m = rx.exec(t);
    if (m) { r.browser = { name, version: m.slice(1).find(x => x) }; break; }
  }
  let m;
  if ((m = /\bTrident\/([\w.]+)/.exec(t))) r.engine = { name: 'Trident', version: m[1] };
  else if ((m = /\bChrome\/([\w.]+)/.exec(t)) && parseInt(m[1], 10) >= 28) r.engine = { name: 'Blink', version: m[1] };
  else if ((m = /\bAppleWebKit\/([\w.]+)/.exec(t))) r.engine = { name: 'WebKit', version: m[1] };
  else if ((m = /\brv:([\w.]+).*\bGecko\//.exec(t))) r.engine = { name: 'Gecko', version: m[1] };

  if ((m = /\bWindows NT ([\d.]+)/.exec(t))) r.os = { name: 'Windows', version: WINDOWS[m[1]] || m[1] };
  else if ((m = /\b(?:iPhone|CPU) OS ([\d_]+)/.exec(t))) r.os = { name: 'iOS', version: m[1].replace(/_/g, '.') };
  else if ((m = /\bAndroid[ /]?([\w.]*)/.exec(t))) r.os = { name: 'Android', version: m[1] || undefined };
  else if ((m = /\bCrOS \S+ ([\w.]+)/.exec(t))) r.os = { name: 'Chrome OS', version: m[1] };
  else if ((m = /\bMac OS X ?([\w.]*)/.exec(t))) r.os = { name: 'macOS', version: m[1].replace(/_/g, '.') || undefined };
  else if ((m = /\bUbuntu(?:\/([\w.]+))?/.exec(t))) r.os = { name: 'Ubuntu', version: m[1] };
  else if (/\bLinux\b/.test(t)) r.os = { name: 'Linux' };

  if (/\biPhone\b/.test(t)) r.device = { model: 'iPhone', type: 'mobile', vendor: 'Apple' };
  else if (/\biPad\b/.test(t)) r.device = { model: 'iPad', type: 'tablet', vendor: 'Apple' };
  else if (/\bMacintosh\b/.test(t)) r.device = { model: 'Macintosh', vendor: 'Apple' };
  else if ((m = /\bAndroid[^;)]*; ([^;)]+?)(?: Build\/[^;)]*)?\)/.exec(t))) {
    const model = m[1];
    const vendor = /^(?:SM-|GT-|SAMSUNG)/i.test(model) ? 'Samsung' : /^Pixel/.test(model) ? 'Google' : undefined;
    r.device = { model, type: /\bMobile\b/.test(t) ? 'mobile' : 'tablet', vendor };
  }

  if (/\b(?:x86_64|x64|Win64|WOW64|amd64)\b/i.test(t)) r.cpu = { architecture: 'amd64' };
  else if (/\b(?:arm64|aarch64)\b/i.test(t)) r.cpu = { architecture: 'arm64' };
  else if (/\b(?:i[3-6]86|x86)\b/i.test(t)) r.cpu = { architecture: 'ia32' };
  return r;
}

module('Parse User Agent', 'Identifies browser, device, engine, operating system and CPU from a User-Agent string.', [],
  (t) => {
    const ua = detect(t);
    return `Browser
    Name: ${ua.browser.name || 'unknown'}
    Version: ${ua.browser.version || 'unknown'}
Device
    Model: ${ua.device.model || 'unknown'}
    Type: ${ua.device.type || 'unknown'}
    Vendor: ${ua.device.vendor || 'unknown'}
Engine
    Name: ${ua.engine.name || 'unknown'}
    Version: ${ua.engine.version || 'unknown'}
OS
    Name: ${ua.os.name || 'unknown'}
    Version: ${ua.os.version || 'unknown'}
CPU
    Architecture: ${ua.cpu.architecture || 'unknown'}`;
  }, { text: true });
