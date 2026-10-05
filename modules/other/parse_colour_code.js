import { module } from './_cat.js';

const NAMED = {
  red: '#ff0000', green: '#008000', blue: '#0000ff', white: '#ffffff', black: '#000000', yellow: '#ffff00',
  cyan: '#00ffff', magenta: '#ff00ff', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080',
  grey: '#808080', brown: '#a52a2a',
};

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hlsToRgb(h, l, s) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

function rgbToHls(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, l, 0];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  return [h, l, s];
}

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max, d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (max === min) return [0, s, v];
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  return [h, s, v];
}

module('Parse colour code', 'Converts #hex, rgb(), hsl() or a colour name into hex, RGB, HSL, HSV and CMYK.',
  [],
  (t) => {
    t = t.trim().toLowerCase();
    t = NAMED[t] || t;
    let r, g, b;
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);
    if (m) {
      let h = m[1];
      if (h.length === 3) h = [...h].map(c => c + c).join('');
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    } else if (t.startsWith('rgb')) {
      const nums = (t.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      [r, g, b] = nums.map(x => Math.trunc(x));
    } else if (t.startsWith('hsl')) {
      const [hh, ss, ll] = (t.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      [r, g, b] = hlsToRgb(hh / 360, ll / 100, ss / 100).map(x => Math.round(x * 255));
    } else {
      throw new Error('Unrecognised colour');
    }
    const [h, l, s] = rgbToHls(r / 255, g / 255, b / 255);
    const [hv, sv, vv] = rgbToHsv(r / 255, g / 255, b / 255);
    const k = 1 - Math.max(r, g, b) / 255;
    const [c, mm, y] = [r, g, b].map(x => (k < 1 ? (1 - x / 255 - k) / (1 - k) : 0));
    const hex2 = n => n.toString(16).padStart(2, '0');
    return [
      `Hex: #${hex2(r)}${hex2(g)}${hex2(b)}`,
      `RGB: rgb(${r}, ${g}, ${b})`,
      `HSL: hsl(${(h * 360).toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%)`,
      `HSV: hsv(${(hv * 360).toFixed(0)}, ${(sv * 100).toFixed(0)}%, ${(vv * 100).toFixed(0)}%)`,
      `CMYK: cmyk(${(c * 100).toFixed(0)}%, ${(mm * 100).toFixed(0)}%, ${(y * 100).toFixed(0)}%, ${(k * 100).toFixed(0)}%)`,
    ].join('\n');
  }, { text: true });
