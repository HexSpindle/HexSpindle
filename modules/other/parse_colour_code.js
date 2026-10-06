import { module } from './_cat.js';

const NAMED = {
  red: '#ff0000', green: '#008000', blue: '#0000ff', white: '#ffffff', black: '#000000', yellow: '#ffff00',
  cyan: '#00ffff', magenta: '#ff00ff', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080',
  grey: '#808080', brown: '#a52a2a',
};

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h, s;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

module('Parse colour code', 'Converts a colour code (#hex, rgb(a), hsl(a), cmyk or a colour name) into hex, RGB, RGBA, HSL, HSLA and CMYK.',
  [],
  (input) => {
    const named = NAMED[input.trim().toLowerCase()];
    if (named) input = named;
    const short = /^\s*#?([0-9a-f])([0-9a-f])([0-9a-f])\s*$/i.exec(input);
    if (short) input = '#' + short[1] + short[1] + short[2] + short[2] + short[3] + short[3];
    let m = null, r = 0, g = 0, b = 0, a = 1;
    if ((m = input.match(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i))) {
      r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16);
    } else if ((m = input.match(/rgba?\((\d{1,3}(?:\.\d+)?),\s?(\d{1,3}(?:\.\d+)?),\s?(\d{1,3}(?:\.\d+)?)(?:,\s?(\d(?:\.\d+)?))?\)/i))) {
      r = parseFloat(m[1]); g = parseFloat(m[2]); b = parseFloat(m[3]);
      a = m[4] ? parseFloat(m[4]) : 1;
    } else if ((m = input.match(/hsla?\((\d{1,3}(?:\.\d+)?),\s?(\d{1,3}(?:\.\d+)?)%,\s?(\d{1,3}(?:\.\d+)?)%(?:,\s?(\d(?:\.\d+)?))?\)/i))) {
      [r, g, b] = hslToRgb(parseFloat(m[1]) / 360, parseFloat(m[2]) / 100, parseFloat(m[3]) / 100);
      a = m[4] ? parseFloat(m[4]) : 1;
    } else if ((m = input.match(/cmyk\((\d(?:\.\d+)?),\s?(\d(?:\.\d+)?),\s?(\d(?:\.\d+)?),\s?(\d(?:\.\d+)?)\)/i))) {
      const [c_, m_, y_, k_] = [m[1], m[2], m[3], m[4]].map(parseFloat);
      r = Math.round(255 * (1 - c_) * (1 - k_));
      g = Math.round(255 * (1 - m_) * (1 - k_));
      b = Math.round(255 * (1 - y_) * (1 - k_));
    }
    const hsl = rgbToHsl(r, g, b);
    const h = Math.round(hsl[0] * 360), s = Math.round(hsl[1] * 100), l = Math.round(hsl[2] * 100);
    let k = 1 - Math.max(r / 255, g / 255, b / 255);
    let c = (1 - r / 255 - k) / (1 - k), y = (1 - b / 255 - k) / (1 - k);
    m = (1 - g / 255 - k) / (1 - k);
    c = isNaN(c) ? '0' : c.toFixed(2);
    m = isNaN(m) ? '0' : m.toFixed(2);
    y = isNaN(y) ? '0' : y.toFixed(2);
    k = k.toFixed(2);
    const hex = '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    return `
Hex:  ${hex}
RGB:  rgb(${r}, ${g}, ${b})
RGBA: rgba(${r}, ${g}, ${b}, ${a})
HSL:  hsl(${h}, ${s}%, ${l}%)
HSLA: hsla(${h}, ${s}%, ${l}%, ${a})
CMYK: cmyk(${c}, ${m}, ${y}, ${k})
`;
  }, { text: true });
