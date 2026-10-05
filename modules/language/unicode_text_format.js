import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const MAPS = {
  'Bold (𝐀)': {
    upper: 0x1d400,
    lower: 0x1d41a,
  },

  'Italic (𝐴)': {
    upper: 0x1d434,
    lower: [
      0x1d44e, // a
      0x1d44f, // b
      0x1d450, // c
      0x1d451, // d
      0x1d452, // e
      0x1d453, // f
      0x1d454, // g
      0x210e,  // h
      0x1d456, // i
      0x1d457, // j
      0x1d458, // k
      0x1d459, // l
      0x1d45a, // m
      0x1d45b, // n
      0x1d45c, // o
      0x1d45d, // p
      0x1d45e, // q
      0x1d45f, // r
      0x1d460, // s
      0x1d461, // t
      0x1d462, // u
      0x1d463, // v
      0x1d464, // w
      0x1d465, // x
      0x1d466, // y
      0x1d467, // z
    ],
  },

  'Bold Italic': {
    upper: 0x1d468,
    lower: 0x1d482,
  },

  'Script': {
    upper: [
      0x1d49c, // A
      0x212c,  // B
      0x1d49e, // C
      0x1d49f, // D
      0x2130,  // E
      0x2131,  // F
      0x1d4a2, // G
      0x210b,  // H
      0x2110,  // I
      0x1d4a5, // J
      0x1d4a6, // K
      0x2112,  // L
      0x2133,  // M
      0x1d4a9, // N
      0x1d4aa, // O
      0x1d4ab, // P
      0x1d4ac, // Q
      0x211b,  // R
      0x1d4ae, // S
      0x1d4af, // T
      0x1d4b0, // U
      0x1d4b1, // V
      0x1d4b2, // W
      0x1d4b3, // X
      0x1d4b4, // Y
      0x1d4b5, // Z
    ],
    lower: [
      0x1d4b6, // a
      0x1d4b7, // b
      0x1d4b8, // c
      0x1d4b9, // d
      0x212f,  // e
      0x1d4bb, // f
      0x210a,  // g
      0x1d4bd, // h
      0x1d4be, // i
      0x1d4bf, // j
      0x1d4c0, // k
      0x1d4c1, // l
      0x1d4c2, // m
      0x1d4c3, // n
      0x2134,  // o
      0x1d4c5, // p
      0x1d4c6, // q
      0x1d4c7, // r
      0x1d4c8, // s
      0x1d4c9, // t
      0x1d4ca, // u
      0x1d4cb, // v
      0x1d4cc, // w
      0x1d4cd, // x
      0x1d4ce, // y
      0x1d4cf, // z
    ],
  },

  'Fraktur': {
    upper: [
      0x1d504, // A
      0x1d505, // B
      0x212d,  // C
      0x1d507, // D
      0x1d508, // E
      0x1d509, // F
      0x1d50a, // G
      0x210c,  // H
      0x2111,  // I
      0x1d50d, // J
      0x1d50e, // K
      0x1d50f, // L
      0x1d510, // M
      0x1d511, // N
      0x1d512, // O
      0x1d513, // P
      0x1d514, // Q
      0x211c,  // R
      0x1d516, // S
      0x1d517, // T
      0x1d518, // U
      0x1d519, // V
      0x1d51a, // W
      0x1d51b, // X
      0x1d51c, // Y
      0x2128,  // Z
    ],
    lower: 0x1d51e,
  },

  'Double-struck': {
    upper: [
      0x1d538, // A
      0x1d539, // B
      0x2102,  // C
      0x1d53b, // D
      0x1d53c, // E
      0x1d53d, // F
      0x1d53e, // G
      0x210d,  // H
      0x1d540, // I
      0x1d541, // J
      0x1d542, // K
      0x1d543, // L
      0x1d544, // M
      0x2115,  // N
      0x1d546, // O
      0x2119,  // P
      0x211a,  // Q
      0x211d,  // R
      0x1d54a, // S
      0x1d54b, // T
      0x1d54c, // U
      0x1d54d, // V
      0x1d54e, // W
      0x1d54f, // X
      0x1d550, // Y
      0x2124,  // Z
    ],
    lower: 0x1d552,
  },

  'Sans-serif': {
    upper: 0x1d5a0,
    lower: 0x1d5ba,
  },

  'Monospace': {
    upper: 0x1d670,
    lower: 0x1d68a,
  },
};

function mapLetters(t, fn) {
  return [...t].map(c => {
    const cp = c.codePointAt(0);

    if (cp >= 65 && cp <= 90) {
      return fn(cp - 65, true);
    }

    if (cp >= 97 && cp <= 122) {
      return fn(cp - 97, false);
    }

    return c;
  }).join('');
}

function getMappedCodePoint(style, offset, upper) {
  const map = MAPS[style];
  if (!map) return null;

  const source = upper ? map.upper : map.lower;

  if (Array.isArray(source)) {
    return source[offset];
  }

  return source + offset;
}

module(
  'Unicode Text Format',
  'Re-renders letters in a Unicode mathematical style, or underlines / strikes through text.',
  [
    A.select('Style', [
      ...Object.keys(MAPS),
      'Underline',
      'Strikethrough',
      'Circled',
    ]),
  ],
  (t, style) => {
    if (style === 'Underline') {
      return [...t].map(c => c + '\u0332').join('');
    }

    if (style === 'Strikethrough') {
      return [...t].map(c => c + '\u0336').join('');
    }

    if (style === 'Circled') {
      return mapLetters(
        t,
        (off, upper) =>
          String.fromCodePoint(
            (upper ? 0x24b6 : 0x24d0) + off
          )
      );
    }

    if (MAPS[style]) {
      return mapLetters(t, (off, upper) => {
        const cp = getMappedCodePoint(style, off, upper);
        return String.fromCodePoint(cp);
      });
    }

    return t;
  },
  { text: true }
);