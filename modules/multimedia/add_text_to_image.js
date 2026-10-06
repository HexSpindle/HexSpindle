import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { decodePng } from './_png_decode.js';
import { resize } from './_jimp.js';

// Bitmap fonts are drawn at 72px and then scaled to the requested size.
const FONT_SIZE = 72;
const fontCache = new Map();

async function loadFont(face) {
  if (!fontCache.has(face)) {
    fontCache.set(face, (async () => {
      const { FONTS } = await import('./_roboto_bmfonts.mjs');
      const f = FONTS[face];
      if (!f) throw new Error(`Unknown font face '${face}'`);
      const chars = {};
      for (const [id, [x, y, width, height, xoffset, yoffset, xadvance, page]] of Object.entries(f.chars))
        chars[String.fromCharCode(+id)] = { x, y, width, height, xoffset, yoffset, xadvance, page };
      const kernings = {};
      for (const [first, second, amount] of f.kernings) {
        const a = String.fromCharCode(first);
        kernings[a] = kernings[a] || {};
        kernings[a][String.fromCharCode(second)] = amount;
      }
      const pages = await Promise.all(f.pages.map(b64 => decodePng(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))));
      return { chars, kernings, pages, lineHeight: f.lineHeight };
    })());
  }
  return fontCache.get(face);
}

function measureText(font, text) {
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const fontChar = font.chars[text[i]];
    if (fontChar) {
      const k = font.kernings[text[i]], next = text[i + 1];
      x += (fontChar.xadvance || 0) + (k && next && k[next] ? k[next] || 0 : 0);
    }
  }
  return x;
}

function splitLines(font, text, maxWidth) {
  const words = text.replace(/[\r\n]+/g, ' \n').split(' ');
  const lines = [];
  let currentLine = [];
  for (const word of words) {
    const wordWidth = measureText(font, word + (words.length > 1 ? ' ' : ''));
    if (wordWidth > maxWidth) {
      let current = '';
      for (const char of word) {
        const length = measureText(font, [...currentLine, current + char].join(' '));
        if (length < maxWidth) current += char;
        else if (length > maxWidth) { lines.push([...currentLine, current]); currentLine = []; current = char; }
        else { lines.push([...currentLine, current + char]); currentLine = []; current = ''; }
      }
      continue;
    }
    const length = measureText(font, [...currentLine, word].join(' '));
    if (length <= maxWidth && !word.includes('\n')) currentLine.push(word);
    else { lines.push(currentLine); currentLine = [word.replace('\n', '')]; }
  }
  lines.push(currentLine);
  return lines;
}

// Alpha-blends the source rectangle onto dst at (x, y).
function blitRect(dst, src, x, y, srcX, srcY, srcW, srcH) {
  x = Math.round(x); y = Math.round(y);
  for (let sy = srcY; sy < srcY + srcH; sy++) {
    for (let sx = srcX; sx < srcX + srcW; sx++) {
      const xo = x + sx - srcX, yo = y + sy - srcY;
      if (xo < 0 || yo < 0 || dst.width - xo <= 0 || dst.height - yo <= 0) continue;
      const idx = (src.width * sy + sx) << 2, di = (dst.width * yo + xo) << 2;
      const sa = src.data[idx + 3] || 0;
      for (let c = 0; c < 3; c++) {
        const s = src.data[idx + c] || 0, d = dst.data[di + c] || 0;
        dst.data[di + c] = ((sa * (s - d) - d + 255) >> 8) + d;
      }
      dst.data[di + 3] = Math.min(255, (dst.data[di + 3] || 0) + sa);
    }
  }
}

function printText(image, font, text) {
  const defaultCharWidth = Object.entries(font.chars).find(c => c[1].xadvance)?.[1].xadvance;
  let y = 0;
  for (const line of splitLines(font, text, Infinity)) {
    const s = line.join(' ');
    let x = 0;
    for (let i = 0; i < s.length; i++) {
      const c = font.chars[s[i]] ? s[i] : /\s/.test(s[i]) ? '' : '?';
      const ch = font.chars[c] || { xadvance: undefined };
      if (ch.width > 0 && ch.height > 0 && font.pages[ch.page])
        blitRect(image, font.pages[ch.page], x + ch.xoffset, y + ch.yoffset, ch.x, ch.y, ch.width, ch.height);
      const k = font.kernings[c], next = s[i + 1];
      x += (k && next && k[next] ? k[next] || 0 : 0) + (ch.xadvance || defaultCharWidth);
    }
    y += font.lineHeight;
  }
}

module('Add Text To Image',
  'Adds text onto an image. Text can be horizontally or vertically aligned, or the position can be ' +
  'manually specified. Variants of the Roboto font face are available in any size or colour.',
  [A.string('Text', ''), A.select('Horizontal align', ['None', 'Left', 'Center', 'Right']),
    A.select('Vertical align', ['None', 'Top', 'Middle', 'Bottom']), A.number('X position', 0), A.number('Y position', 0),
    A.number('Size', 32, 8), A.select('Font face', ['Roboto', 'Roboto Black', 'Roboto Mono', 'Roboto Slab']),
    A.number('Red', 255, 0, 255), A.number('Green', 255, 0, 255), A.number('Blue', 255, 0, 255), A.number('Alpha', 255, 0, 255)],
  async (data, text, hAlign, vAlign, xPos, yPos, size, face, red, green, blue, alpha) => {
    let image;
    try {
      image = await loadBitmap(data);
    } catch (err) {
      throw new Error('Invalid file type.');
    }
    const base = await loadFont(face);
    // Tint a copy of the white glyph pages: each channel minus (255 - wanted value), floored at 0.
    const tint = [red, green, blue, alpha].map(v => 255 - v);
    const pages = base.pages.map(p => {
      const d = new Uint8Array(p.data);
      for (let i = 0; i < d.length; i++) d[i] = Math.max(0, d[i] - tint[i & 3]);
      return { data: d, width: p.width, height: p.height };
    });
    const font = { ...base, pages };

    const w = measureText(font, text), h = splitLines(font, text, undefined).length * font.lineHeight;
    if (!w || !h) throw new Error('Error adding text to image. (Error: Width and height must be greater than 0)');
    const textImage = { data: new Uint8Array(w * h * 4), width: w, height: h };
    printText(textImage, font, text);
    if (size !== 1) resize(textImage, textImage.width * size / FONT_SIZE, textImage.height * size / FONT_SIZE, size > 1 ? 'Bicubic' : 'Bilinear');

    if (hAlign === 'Left') xPos = 0;
    else if (hAlign === 'Center') xPos = image.width / 2 - textImage.width / 2;
    else if (hAlign === 'Right') xPos = image.width - textImage.width;
    if (vAlign === 'Top') yPos = 0;
    else if (vAlign === 'Middle') yPos = image.height / 2 - textImage.height / 2;
    else if (vAlign === 'Bottom') yPos = image.height - textImage.height;

    blitRect(image, textImage, xPos, yPos, 0, 0, textImage.width, textImage.height);
    return bitmapToOutput(image, data);
  });
