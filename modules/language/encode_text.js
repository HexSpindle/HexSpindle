import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodeUtf8, decodeUtf8, decodeLatin1 } from '../../core/util.js';
import {
  SINGLE_BYTE_TABLES,
  MULTIBYTE_TABLES,
  JIS_PLANES,
  CNS_PLANES,
  GB18030_UCHARS,
  GB18030_GBCHARS,
} from './_encoding_tables.js';

export const ENCODING_GROUPS = [
  {
    label: 'Unicode',
    options: [
      'UTF-8',
      'UTF-8-SIG',
      'UTF-16LE',
      'UTF-16BE',
      'UTF-16',
      'UTF-32LE',
      'UTF-32BE',
      'UTF-32',
      'UTF-7',
      'UTF-7-IMAP',
      'CESU-8',
      'SCSU',
      'BOCU-1',
      'UTF-EBCDIC',
    ],
  },

  {
    label: 'ISO / ASCII',
    options: [
      'ASCII',
      'ISO-8859-1 (Latin1)',
      'ISO-8859-2',
      'ISO-8859-3',
      'ISO-8859-4',
      'ISO-8859-5',
      'ISO-8859-6',
      'ISO-8859-7',
      'ISO-8859-8',
      'ISO-8859-8-I',
      'ISO-8859-9',
      'ISO-8859-10',
      'ISO-8859-11',
      'ISO-8859-13',
      'ISO-8859-14',
      'ISO-8859-15',
      'ISO-8859-16',
      'ISO-646-CN',
      'ISO-646-JP',
    ],
  },

  {
    label: 'Windows / Browser',
    options: [
      'Windows-874',
      'Windows-1250',
      'Windows-1251',
      'Windows-1252',
      'Windows-1253',
      'Windows-1254',
      'Windows-1255',
      'Windows-1256',
      'Windows-1257',
      'Windows-1258',
      'x-user-defined',
    ],
  },

  {
    label: 'Regional / Legacy',
    options: [
      'KOI8-R',
      'KOI8-U',
      'KOI8-RU',
      'KOI8-T',
      'KZ1048',
      'PTCP154',
      'TIS-620',
      'ARMSCII-8',
      'TCVN',
      'VISCII',
      'Georgian-Academy',
      'Georgian-PS',
      'HP-ROMAN8',
    ],
  },

  {
    label: 'Japanese',
    options: [
      'Shift_JIS',
      'Shift_JIS-2004',
      'Shift_JISX0213',
      'EUC-JP',
      'EUC-JIS-2004',
      'EUC-JISX0213',
      'ISO-2022-JP',
      'ISO-2022-JP-1',
      'ISO-2022-JP-2',
      'ISO-2022-JP-2004',
      'ISO-2022-JP-3',
      'ISO-2022-JP-EXT',
    ],
  },

  {
    label: 'Chinese',
    options: [
      'GBK',
      'GB18030',
      'GB2312',
      'HZ-GB-2312',
      'ISO-2022-CN',
      'ISO-2022-CN-EXT',
      'Big5',
      'Big5-HKSCS',
    ],
  },

  {
    label: 'Korean',
    options: [
      'EUC-KR',
      'ISO-2022-KR',
      'Johab (CP1361)',
    ],
  },

  {
    label: 'DOS / IBM / EBCDIC',
    options: [
      'CP273',
      'CP420',
      'CP424',
      'CP437',
      'CP720',
      'CP737',
      'CP775',
      'CP808',
      'CP850',
      'CP852',
      'CP855',
      'CP856',
      'CP857',
      'CP858',
      'CP860',
      'CP861',
      'CP862',
      'CP863',
      'CP864',
      'CP865',
      'CP866',
      'CP869',
      'CP875',
      'CP922',
      'CP1006',
      'CP1026',
      'CP1046',
      'CP1124',
      'CP1125',
      'CP1129',
      'CP1133',
      'CP1140',
      'CP1161',
      'CP1162',
      'CP1163',
      'IBM EBCDIC (CP037)',
      'IBM EBCDIC (CP500)',
    ],
  },

  {
    label: 'Macintosh',
    options: [
      'MacRoman',
      'x-Mac-Cyrillic',
      'MacCroatian',
      'MacGreek',
      'MacIcelandic',
      'MacLatin2',
      'MacRomania',
      'MacThai',
      'MacTurkish',
      'MacUkraine',
    ],
  },
];

export const ENCODINGS = ENCODING_GROUPS.flatMap(group => group.options);

const WHATWG_LABELS = {
  'ISO-8859-2': 'iso-8859-2',
  'ISO-8859-3': 'iso-8859-3',
  'ISO-8859-4': 'iso-8859-4',
  'ISO-8859-5': 'iso-8859-5',
  'ISO-8859-6': 'iso-8859-6',
  'ISO-8859-7': 'iso-8859-7',
  'ISO-8859-8': 'iso-8859-8',
  'ISO-8859-8-I': 'iso-8859-8-i',
  'ISO-8859-10': 'iso-8859-10',
  'ISO-8859-13': 'iso-8859-13',
  'ISO-8859-14': 'iso-8859-14',
  'ISO-8859-15': 'iso-8859-15',
  'ISO-8859-16': 'iso-8859-16',
  'Windows-874': 'windows-874',
  'Windows-1250': 'windows-1250',
  'Windows-1251': 'windows-1251',
  'Windows-1252': 'windows-1252',
  'Windows-1253': 'windows-1253',
  'Windows-1254': 'windows-1254',
  'Windows-1255': 'windows-1255',
  'Windows-1256': 'windows-1256',
  'Windows-1257': 'windows-1257',
  'Windows-1258': 'windows-1258',
  'KOI8-R': 'koi8-r',
  'KOI8-U': 'koi8-u',
  'x-Mac-Cyrillic': 'x-mac-cyrillic',
};

const NATIVE_CJK = {
  Shift_JIS: 'shift_jis',
  'EUC-JP': 'euc-jp',
  GBK: 'gbk',
  GB18030: 'gb18030',
  Big5: 'big5',
  'Big5-HKSCS': 'big5',
  'EUC-KR': 'euc-kr',
};

function decoder(label, fatal = false) {
  return new TextDecoder(label, { fatal, ignoreBOM: true });
}

function encodeUtf16Bytes(text, be) {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const cc = text.charCodeAt(i);
    if (be) { out[i * 2] = cc >> 8; out[i * 2 + 1] = cc & 0xff; }
    else { out[i * 2] = cc & 0xff; out[i * 2 + 1] = cc >> 8; }
  }
  return out;
}

function encodeUtf32Bytes(text, be) {
  const cps = [...text];
  const out = new Uint8Array(cps.length * 4);
  cps.forEach((ch, i) => {
    const cp = ch.codePointAt(0);
    if (be) {
      out[i * 4] = (cp >>> 24) & 0xff;
      out[i * 4 + 1] = (cp >>> 16) & 0xff;
      out[i * 4 + 2] = (cp >>> 8) & 0xff;
      out[i * 4 + 3] = cp & 0xff;
    } else {
      out[i * 4] = cp & 0xff;
      out[i * 4 + 1] = (cp >>> 8) & 0xff;
      out[i * 4 + 2] = (cp >>> 16) & 0xff;
      out[i * 4 + 3] = (cp >>> 24) & 0xff;
    }
  });
  return out;
}

function decodeUtf32Bytes(data, be) {
  let out = '';
  const n = data.length - (data.length % 4);
  for (let i = 0; i < n; i += 4) {
    const cp = be
      ? data[i] * 0x1000000 + data[i + 1] * 0x10000 + data[i + 2] * 0x100 + data[i + 3]
      : data[i + 3] * 0x1000000 + data[i + 2] * 0x10000 + data[i + 1] * 0x100 + data[i];
    out += (cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) ? '\ufffd' : String.fromCodePoint(cp);
  }
  if (data.length % 4) out += '\ufffd';
  return out;
}

function decodeUtf16Auto(data) {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe)
    return decoder('utf-16le').decode(data.subarray(2));
  if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff)
    return decoder('utf-16be').decode(data.subarray(2));
  return decoder('utf-16le').decode(data);
}

function decodeUtf32Auto(data) {
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xfe && data[2] === 0 && data[3] === 0)
    return decodeUtf32Bytes(data.subarray(4), false);
  if (data.length >= 4 && data[0] === 0 && data[1] === 0 && data[2] === 0xfe && data[3] === 0xff)
    return decodeUtf32Bytes(data.subarray(4), true);
  return decodeUtf32Bytes(data, false);
}

function decodeUtf8Sig(data) {
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf)
    return decodeUtf8(data.subarray(3));
  return decodeUtf8(data);
}

function encodeUtf8Sig(text) {
  const body = encodeUtf8(text);
  const out = new Uint8Array(body.length + 3);
  out.set([0xef, 0xbb, 0xbf]);
  out.set(body, 3);
  return out;
}

const UTF7_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function isUtf7Direct(cc) {
  return cc === 9 || cc === 10 || cc === 13 ||
    (cc >= 0x20 && cc <= 0x7e && cc !== 0x2b && cc !== 0x5c && cc !== 0x7e);
}
function utf7NeedsDash(cc) {
  return cc === 0x2d || (cc >= 0x30 && cc <= 0x39) ||
    (cc >= 0x41 && cc <= 0x5a) || (cc >= 0x61 && cc <= 0x7a) || cc === 0x2f;
}
function encodeUtf7(text) {
  const out = [];
  let bitBuf = 0, bitCount = 0, inShift = false;
  const closeShift = dash => {
    if (bitCount > 0) {
      out.push(UTF7_B64.charCodeAt((bitBuf << (6 - bitCount)) & 0x3f));
      bitBuf = 0; bitCount = 0;
    }
    if (dash) out.push(0x2d);
    inShift = false;
  };
  for (let i = 0; i < text.length; i++) {
    const cc = text.charCodeAt(i);
    if (isUtf7Direct(cc)) {
      if (inShift) closeShift(utf7NeedsDash(cc));
      out.push(cc);
      continue;
    }
    if (!inShift && cc === 0x2b) { out.push(0x2b, 0x2d); continue; }
    if (!inShift) { out.push(0x2b); inShift = true; }
    bitBuf = (bitBuf << 16) | cc;
    bitCount += 16;
    while (bitCount >= 6) {
      bitCount -= 6;
      out.push(UTF7_B64.charCodeAt((bitBuf >> bitCount) & 0x3f));
    }
    bitBuf &= (1 << bitCount) - 1;
  }
  if (inShift) closeShift(true);
  return new Uint8Array(out);
}
function decodeUtf7(data) {
  const s = decodeLatin1(data);
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] !== '+') { out += s[i++]; continue; }
    i++;
    if (s[i] === '-') { out += '+'; i++; continue; }
    let bitBuf = 0, bitCount = 0;
    while (i < s.length && UTF7_B64.indexOf(s[i]) >= 0) {
      bitBuf = (bitBuf << 6) | UTF7_B64.indexOf(s[i++]);
      bitCount += 6;
      if (bitCount >= 16) {
        bitCount -= 16;
        out += String.fromCharCode((bitBuf >> bitCount) & 0xffff);
      }
    }
    if (s[i] === '-') i++;
  }
  return out;
}

const IMAP_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+,';
function encodeImapUtf7(text) {
  const out = [];
  let shifted = [];
  const flush = () => {
    if (!shifted.length) return;
    out.push(0x26); // &
    let bits = 0, nbits = 0;
    for (const b of shifted) {
      bits = (bits << 8) | b; nbits += 8;
      while (nbits >= 6) {
        nbits -= 6;
        out.push(IMAP_B64.charCodeAt((bits >> nbits) & 0x3f));
      }
      bits &= nbits ? (1 << nbits) - 1 : 0;
    }
    if (nbits) out.push(IMAP_B64.charCodeAt((bits << (6 - nbits)) & 0x3f));
    out.push(0x2d);
    shifted = [];
  };
  for (let i = 0; i < text.length; i++) {
    const cu = text.charCodeAt(i);
    if (cu >= 0x20 && cu <= 0x7e && cu !== 0x26) {
      flush(); out.push(cu);
    } else if (cu === 0x26) {
      flush(); out.push(0x26, 0x2d);
    } else {
      shifted.push(cu >> 8, cu & 0xff);
    }
  }
  flush();
  return new Uint8Array(out);
}
function decodeImapUtf7(data) {
  const s = decodeLatin1(data);
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] !== '&') { out += s[i++]; continue; }
    i++;
    if (s[i] === '-') { out += '&'; i++; continue; }
    let bits = 0, nbits = 0, bytes = [];
    while (i < s.length && s[i] !== '-') {
      const v = IMAP_B64.indexOf(s[i++]);
      if (v < 0) { bytes.push(0xff); break; }
      bits = (bits << 6) | v; nbits += 6;
      while (nbits >= 8) {
        nbits -= 8;
        bytes.push((bits >> nbits) & 0xff);
      }
      bits &= nbits ? (1 << nbits) - 1 : 0;
    }
    if (s[i] === '-') i++;
    if (bytes.length % 2) bytes.push(0);
    for (let j = 0; j < bytes.length; j += 2)
      out += String.fromCharCode((bytes[j] << 8) | bytes[j + 1]);
  }
  return out;
}

function encodeCesu8(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return new Uint8Array(out);
}
function decodeCesu8(data) {
  let out = '';
  for (let i = 0; i < data.length;) {
    const b = data[i++];
    if (b < 0x80) { out += String.fromCharCode(b); continue; }
    if (b >= 0xc2 && b <= 0xdf && i < data.length && (data[i] & 0xc0) === 0x80) {
      const cp = ((b & 0x1f) << 6) | (data[i++] & 0x3f);
      out += String.fromCharCode(cp); continue;
    }
    if (b >= 0xe0 && b <= 0xef && i + 1 < data.length &&
        (data[i] & 0xc0) === 0x80 && (data[i + 1] & 0xc0) === 0x80) {
      const b2 = data[i], b3 = data[i + 1];
      if ((b !== 0xe0 || b2 >= 0xa0)) {
        i += 2;
        out += String.fromCharCode(((b & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
        continue;
      }
    }
    out += '\ufffd';
  }
  return out;
}

const SCSU_STATIC = [0x0000,0x0080,0x0100,0x0300,0x2000,0x2080,0x2100,0x3000];
const SCSU_INITIAL = [0x0080,0x00c0,0x0400,0x0600,0x0900,0x3040,0x30a0,0xff00];
const SCSU_FIXED = [0x00c0,0x0250,0x0370,0x0530,0x3040,0x30a0,0xff60];
function scsuDefine(offsetByte) {
  if (offsetByte === 0) return null;
  if (offsetByte < 0x68) return offsetByte << 7;
  if (offsetByte < 0xa8) return (offsetByte << 7) + 0xac00;
  if (offsetByte < 0xf9) return null;
  return SCSU_FIXED[offsetByte - 0xf9];
}
function scsuExtended(v) {
  return ((v & 0x1fff) << 7) + 0x10000;
}
function decodeScsu(data) {
  let out = '', i = 0, window = 0, unicodeMode = false;
  const dyn = SCSU_INITIAL.slice();
  const putUnit = u => { out += String.fromCharCode(u); };
  while (i < data.length) {
    const b = data[i++];
    if (!unicodeMode) {
      if (b >= 0x01 && b <= 0x08) {
        if (i >= data.length) { out += '\ufffd'; break; }
        const q = data[i++], n = b - 1;
        const cp = q < 0x80 ? SCSU_STATIC[n] + q : dyn[n] + q - 0x80;
        out += cp <= 0x10ffff ? String.fromCodePoint(cp) : '\ufffd';
      } else if (b === 0x0b) {
        if (i + 1 >= data.length) { out += '\ufffd'; break; }
        const v = (data[i++] << 8) | data[i++];
        window = v >> 13; dyn[window] = scsuExtended(v);
      } else if (b === 0x0c) {
        out += '\ufffd';
      } else if (b === 0x0e) {
        if (i + 1 >= data.length) { out += '\ufffd'; break; }
        putUnit((data[i++] << 8) | data[i++]);
      } else if (b === 0x0f) {
        unicodeMode = true;
      } else if (b >= 0x10 && b <= 0x17) {
        window = b - 0x10;
      } else if (b >= 0x18 && b <= 0x1f) {
        if (i >= data.length) { out += '\ufffd'; break; }
        const off = scsuDefine(data[i++]);
        if (off === null) out += '\ufffd';
        else { window = b - 0x18; dyn[window] = off; }
      } else if (b < 0x80) {
        out += String.fromCharCode(b);
      } else {
        const cp = dyn[window] + b - 0x80;
        out += cp <= 0x10ffff ? String.fromCodePoint(cp) : '\ufffd';
      }
    } else {
      if (b >= 0xe0 && b <= 0xe7) {
        window = b - 0xe0; unicodeMode = false;
      } else if (b >= 0xe8 && b <= 0xef) {
        if (i >= data.length) { out += '\ufffd'; break; }
        const off = scsuDefine(data[i++]);
        if (off === null) out += '\ufffd';
        else { window = b - 0xe8; dyn[window] = off; unicodeMode = false; }
      } else if (b === 0xf0) {
        if (i + 1 >= data.length) { out += '\ufffd'; break; }
        putUnit((data[i++] << 8) | data[i++]);
      } else if (b === 0xf1) {
        if (i + 1 >= data.length) { out += '\ufffd'; break; }
        const v = (data[i++] << 8) | data[i++];
        window = v >> 13; dyn[window] = scsuExtended(v); unicodeMode = false;
      } else if (b === 0xf2) {
        out += '\ufffd';
      } else {
        if (i >= data.length) { out += '\ufffd'; break; }
        putUnit((b << 8) | data[i++]);
      }
    }
  }
  return out;
}
function encodeScsu(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0 || cp === 9 || cp === 10 || cp === 13 || (cp >= 0x20 && cp <= 0x7f)) {
      out.push(cp);
    } else if (cp <= 0xffff) {
      out.push(0x0e, cp >> 8, cp & 0xff);
    } else {
      const x = cp - 0x10000;
      const hi = 0xd800 + (x >> 10), lo = 0xdc00 + (x & 0x3ff);
      out.push(0x0f, hi >> 8, hi & 0xff, lo >> 8, lo & 0xff, 0xe0);
    }
  }
  return new Uint8Array(out);
}

const BOCU_MIN = 0x21, BOCU_MIDDLE = 0x90, BOCU_MAX_LEAD = 0xfe;
const BOCU_TRAIL_COUNT = 243, BOCU_SINGLE = 64;
const BOCU_RP1 = BOCU_SINGLE - 1, BOCU_RN1 = -BOCU_SINGLE;
const BOCU_RP2 = BOCU_RP1 + 43 * BOCU_TRAIL_COUNT;
const BOCU_RN2 = BOCU_RN1 - 43 * BOCU_TRAIL_COUNT;
const BOCU_RP3 = BOCU_RP2 + 3 * BOCU_TRAIL_COUNT * BOCU_TRAIL_COUNT;
const BOCU_RN3 = BOCU_RN2 - 3 * BOCU_TRAIL_COUNT * BOCU_TRAIL_COUNT;
const BOCU_SP2 = BOCU_MIDDLE + BOCU_RP1 + 1;
const BOCU_SP3 = BOCU_SP2 + 43, BOCU_SP4 = BOCU_SP3 + 3;
const BOCU_SN2 = BOCU_MIDDLE + BOCU_RN1;
const BOCU_SN3 = BOCU_SN2 - 43, BOCU_SN4 = BOCU_SN3 - 3;
const BOCU_TRAIL_BYTES = [0x01,0x02,0x03,0x04,0x05,0x06,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1c,0x1d,0x1e,0x1f];
const BOCU_BYTE_TO_TRAIL = (() => {
  const a = new Array(0x21).fill(-1);
  BOCU_TRAIL_BYTES.forEach((b, i) => { a[b] = i; });
  return a;
})();
function bocuPrev(c) {
  if (c >= 0x3040 && c <= 0x309f) return 0x3070;
  if (c >= 0x4e00 && c <= 0x9fa5) return 0x4e00 - BOCU_RN2;
  if (c >= 0xac00 && c <= 0xd7a3) return 0xc1d1;
  return (c & ~0x7f) + 0x40;
}
function bocuTrailByte(t) { return t >= 20 ? t + 13 : BOCU_TRAIL_BYTES[t]; }
function bocuPackDiff(diff) {
  if (diff >= BOCU_RN1 && diff <= BOCU_RP1) return [BOCU_MIDDLE + diff];
  let lead, count;
  if (diff > BOCU_RP1) {
    if (diff <= BOCU_RP2) { diff -= BOCU_RP1 + 1; lead = BOCU_SP2; count = 1; }
    else if (diff <= BOCU_RP3) { diff -= BOCU_RP2 + 1; lead = BOCU_SP3; count = 2; }
    else { diff -= BOCU_RP3 + 1; lead = BOCU_SP4; count = 3; }
  } else {
    if (diff >= BOCU_RN2) { diff -= BOCU_RN1; lead = BOCU_SN2; count = 1; }
    else if (diff >= BOCU_RN3) { diff -= BOCU_RN2; lead = BOCU_SN3; count = 2; }
    else { diff -= BOCU_RN3; lead = BOCU_SN4; count = 3; }
  }
  const trails = new Array(count);
  for (let j = count - 1; j >= 0; j--) {
    const q = Math.floor(diff / BOCU_TRAIL_COUNT);
    const m = diff - q * BOCU_TRAIL_COUNT;
    trails[j] = bocuTrailByte(m);
    diff = q;
  }
  return [lead + diff, ...trails];
}
function encodeBocu1(text) {
  const out = []; let prev = 0x40;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x20) {
      out.push(cp);
      if (cp !== 0x20) prev = 0x40;
    } else {
      out.push(...bocuPackDiff(cp - prev));
      prev = bocuPrev(cp);
    }
  }
  return new Uint8Array(out);
}
function decodeBocu1(data) {
  let out = '', prev = 0x40, count = 0, diff = 0;
  for (const b of data) {
    if (count === 0) {
      if (b <= 0x20) {
        out += String.fromCodePoint(b);
        if (b !== 0x20) prev = 0x40;
      } else if (b >= BOCU_SN2 && b < BOCU_SP2) {
        const cp = prev + b - BOCU_MIDDLE;
        if (cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) { out += '\ufffd'; prev = 0x40; }
        else { out += String.fromCodePoint(cp); prev = bocuPrev(cp); }
      } else if (b === 0xff) {
        prev = 0x40;
      } else if (b >= BOCU_SP2) {
        if (b < BOCU_SP3) { diff = (b - BOCU_SP2) * BOCU_TRAIL_COUNT + BOCU_RP1 + 1; count = 1; }
        else if (b < BOCU_SP4) { diff = (b - BOCU_SP3) * BOCU_TRAIL_COUNT * BOCU_TRAIL_COUNT + BOCU_RP2 + 1; count = 2; }
        else if (b <= BOCU_MAX_LEAD) { diff = BOCU_RP3 + 1; count = 3; }
        else { out += '\ufffd'; prev = 0x40; }
      } else if (b >= BOCU_SN3) {
        diff = (b - BOCU_SN2) * BOCU_TRAIL_COUNT + BOCU_RN1; count = 1;
      } else if (b > BOCU_MIN) {
        diff = (b - BOCU_SN3) * BOCU_TRAIL_COUNT * BOCU_TRAIL_COUNT + BOCU_RN2; count = 2;
      } else if (b === BOCU_MIN) {
        diff = -BOCU_TRAIL_COUNT * BOCU_TRAIL_COUNT * BOCU_TRAIL_COUNT + BOCU_RN3; count = 3;
      } else {
        out += '\ufffd'; prev = 0x40;
      }
    } else {
      let t;
      if (b <= 0x20) t = BOCU_BYTE_TO_TRAIL[b];
      else t = b - 13;
      if (t === undefined || t < 0 || t >= BOCU_TRAIL_COUNT) {
        out += '\ufffd'; prev = 0x40; count = 0; continue;
      }
      if (count === 1) {
        const cp = prev + diff + t;
        count = 0;
        if (cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
          out += '\ufffd'; prev = 0x40;
        } else {
          out += String.fromCodePoint(cp); prev = bocuPrev(cp);
        }
      } else {
        diff += t * (count === 2 ? BOCU_TRAIL_COUNT : BOCU_TRAIL_COUNT * BOCU_TRAIL_COUNT);
        count--;
      }
    }
  }
  if (count) out += '\ufffd';
  return out;
}

const I8_TO_EBCDIC = [0,1,2,3,55,45,46,47,22,5,21,11,12,13,14,15,16,17,18,19,60,61,50,38,24,25,63,39,28,29,30,31,64,90,127,123,91,108,80,125,77,93,92,78,107,96,75,97,240,241,242,243,244,245,246,247,248,249,122,94,76,126,110,111,124,193,194,195,196,197,198,199,200,201,209,210,211,212,213,214,215,216,217,226,227,228,229,230,231,232,233,173,224,189,95,109,121,129,130,131,132,133,134,135,136,137,145,146,147,148,149,150,151,152,153,162,163,164,165,166,167,168,169,192,79,208,161,7,32,33,34,35,36,37,6,23,40,41,42,43,44,9,10,27,48,49,26,51,52,53,54,8,56,57,58,59,4,20,62,255,65,66,67,68,69,70,71,72,73,74,81,82,83,84,85,86,87,88,89,98,99,100,101,102,103,104,105,106,112,113,114,115,116,117,118,119,120,128,138,139,140,141,142,143,144,154,155,156,157,158,159,160,170,171,172,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,190,191,202,203,204,205,206,207,218,219,220,221,222,223,225,234,235,236,237,238,239,250,251,252,253,254];
const EBCDIC_TO_I8 = [0,1,2,3,156,9,134,127,151,141,142,11,12,13,14,15,16,17,18,19,157,10,8,135,24,25,146,143,28,29,30,31,128,129,130,131,132,133,23,27,136,137,138,139,140,5,6,7,144,145,22,147,148,149,150,4,152,153,154,155,20,21,158,26,32,160,161,162,163,164,165,166,167,168,169,46,60,40,43,124,38,170,171,172,173,174,175,176,177,178,33,36,42,41,59,94,45,47,179,180,181,182,183,184,185,186,187,44,37,95,62,63,188,189,190,191,192,193,194,195,196,96,58,35,64,39,61,34,197,97,98,99,100,101,102,103,104,105,198,199,200,201,202,203,204,106,107,108,109,110,111,112,113,114,205,206,207,208,209,210,211,126,115,116,117,118,119,120,121,122,212,213,214,91,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,93,230,231,123,65,66,67,68,69,70,71,72,73,232,233,234,235,236,237,125,74,75,76,77,78,79,80,81,82,238,239,240,241,242,243,92,244,83,84,85,86,87,88,89,90,245,246,247,248,249,250,48,49,50,51,52,53,54,55,56,57,251,252,253,254,255,159];
function encodeUtfEbcdic(text) {
  const out = [];
  const emit = b => out.push(I8_TO_EBCDIC[b]);
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x9f) emit(cp);
    else if (cp <= 0x3ff) {
      emit(0xc0 | (cp >> 5)); emit(0xa0 | (cp & 0x1f));
    } else if (cp <= 0x3fff) {
      emit(0xe0 | (cp >> 10)); emit(0xa0 | ((cp >> 5) & 0x1f)); emit(0xa0 | (cp & 0x1f));
    } else if (cp <= 0x3ffff) {
      emit(0xf0 | (cp >> 15)); emit(0xa0 | ((cp >> 10) & 0x1f));
      emit(0xa0 | ((cp >> 5) & 0x1f)); emit(0xa0 | (cp & 0x1f));
    } else {
      emit(0xf8 | (cp >> 20)); emit(0xa0 | ((cp >> 15) & 0x1f));
      emit(0xa0 | ((cp >> 10) & 0x1f)); emit(0xa0 | ((cp >> 5) & 0x1f)); emit(0xa0 | (cp & 0x1f));
    }
  }
  return new Uint8Array(out);
}
function decodeUtfEbcdic(data) {
  let out = '', i = 0;
  while (i < data.length) {
    const first = EBCDIC_TO_I8[data[i++]];
    if (first <= 0x9f) { out += String.fromCodePoint(first); continue; }
    let count, mask, min;
    if (first >= 0xc0 && first <= 0xdf) { count = 1; mask = 0x1f; min = 0xa0; }
    else if (first >= 0xe0 && first <= 0xef) { count = 2; mask = 0x0f; min = 0x400; }
    else if (first >= 0xf0 && first <= 0xf7) { count = 3; mask = 0x07; min = 0x4000; }
    else if (first >= 0xf8 && first <= 0xfb) { count = 4; mask = 0x03; min = 0x40000; }
    else { out += '\ufffd'; continue; }
    let cp = first & mask, ok = i + count <= data.length;
    for (let j = 0; ok && j < count; j++) {
      const c = EBCDIC_TO_I8[data[i++]];
      if (c < 0xa0 || c > 0xbf) ok = false;
      else cp = (cp << 5) | (c & 0x1f);
    }
    if (!ok || cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) out += '\ufffd';
    else out += String.fromCodePoint(cp);
  }
  return out;
}

const singleReverseCache = new Map();
function staticSingleReverse(name) {
  if (singleReverseCache.has(name)) return singleReverseCache.get(name);
  const table = SINGLE_BYTE_TABLES[name], map = new Map();
  table.forEach((cp, b) => { if (cp >= 0 && !map.has(cp)) map.set(cp, b); });
  singleReverseCache.set(name, map);
  return map;
}
function decodeStaticSingle(data, name) {
  const table = SINGLE_BYTE_TABLES[name];
  let out = '';
  for (const b of data) {
    const cp = table[b];
    out += cp < 0 ? '\ufffd' : String.fromCodePoint(cp);
  }
  return out;
}
function encodeStaticSingle(text, name, strict) {
  const map = staticSingleReverse(name);
  const q = map.get(0x3f) ?? 0x3f, out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0), b = map.get(cp);
    if (b === undefined) {
      if (strict) throw new Error('UnicodeEncodeError');
      out.push(q);
    } else out.push(b);
  }
  return new Uint8Array(out);
}

function decodeAscii(data) {
  let out = '';
  for (const b of data) out += b < 0x80 ? String.fromCharCode(b) : '\ufffd';
  return out;
}
function encodeAscii(text, strict) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) out.push(cp);
    else if (strict) throw new Error('UnicodeEncodeError');
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}
function encodeLatin1(text, strict) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xff) out.push(cp);
    else if (strict) throw new Error('UnicodeEncodeError');
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}
function decodeXUserDefined(data) {
  let out = '';
  for (const b of data) out += b < 0x80 ? String.fromCharCode(b) : String.fromCodePoint(0xf780 + b - 0x80);
  return out;
}
function encodeXUserDefined(text, strict) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) out.push(cp);
    else if (cp >= 0xf780 && cp <= 0xf7ff) out.push(0x80 + cp - 0xf780);
    else if (strict) throw new Error('UnicodeEncodeError');
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}

const whatwgReverseCache = new Map();
function whatwgSingleReverse(label) {
  if (whatwgReverseCache.has(label)) return whatwgReverseCache.get(label);
  const dec = decoder(label, true), map = new Map();
  for (let b = 0; b < 256; b++) {
    try {
      const s = dec.decode(Uint8Array.of(b));
      if ([...s].length === 1 && !map.has(s)) map.set(s, [b]);
    } catch { /* undefined byte */ }
  }
  whatwgReverseCache.set(label, map);
  return map;
}
function encodeWithStringMap(text, map, strict, fallback = [0x3f]) {
  const chars = [...text], out = [];
  for (let i = 0; i < chars.length; i++) {
    let bytes;
    if (i + 1 < chars.length) {
      bytes = map.get(chars[i] + chars[i + 1]);
      if (bytes) i++;
    }
    if (!bytes) bytes = map.get(chars[i]);
    if (!bytes) {
      if (strict) throw new Error('UnicodeEncodeError');
      bytes = fallback;
    }
    out.push(...bytes);
  }
  return new Uint8Array(out);
}
function encodeWhatwgSingle(text, label, strict) {
  const map = whatwgSingleReverse(label);
  return encodeWithStringMap(text, map, strict, map.get('?') || [0x3f]);
}

const nativeMapCache = new Map();
function nativeByteReverse(label, includeEucJpPlane2 = false) {
  const key = `${label}:${includeEucJpPlane2}`;
  if (nativeMapCache.has(key)) return nativeMapCache.get(key);
  const dec = decoder(label, true), map = new Map(), singles = new Array(256).fill(null);
  for (let b = 0; b < 256; b++) {
    try {
      const s = dec.decode(Uint8Array.of(b));
      if (s) { singles[b] = s; if (!map.has(s)) map.set(s, [b]); }
    } catch { /* invalid */ }
  }
  const pair = new Uint8Array(2);
  for (let hi = 0; hi < 256; hi++) {
    pair[0] = hi;
    for (let lo = 0; lo < 256; lo++) {
      pair[1] = lo;
      try {
        const s = dec.decode(pair);
        if (!s) continue;
        if (singles[hi] !== null && singles[lo] !== null && s === singles[hi] + singles[lo]) continue;
        if (!map.has(s)) map.set(s, [hi, lo]);
      } catch { /* invalid */ }
    }
  }
  if (includeEucJpPlane2) {
    const tri = new Uint8Array(3); tri[0] = 0x8f;
    for (let r = 0xa1; r <= 0xfe; r++) {
      tri[1] = r;
      for (let c = 0xa1; c <= 0xfe; c++) {
        tri[2] = c;
        try {
          const s = dec.decode(tri);
          if (s && !map.has(s)) map.set(s, [0x8f, r, c]);
        } catch { /* invalid */ }
      }
    }
  }
  nativeMapCache.set(key, map);
  return map;
}
function encodeNativeCjk(text, name, strict) {
  const label = NATIVE_CJK[name];
  const map = nativeByteReverse(label, name === 'EUC-JP');
  if (name === 'Shift_JIS') {
    const compat = new Map(map);
    compat.set('\u00a5', [0x5c]);
    compat.set('\u203e', [0x7e]);
    return encodeWithStringMap(text, compat, strict, compat.get('?') || [0x3f]);
  }
  return encodeWithStringMap(text, map, strict, map.get('?') || [0x3f]);
}

function unpackPacked(n) {
  if (n <= 0xff) return [n];
  if (n <= 0xffff) return [n >> 8, n & 0xff];
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
const mappedCache = new Map();
function mappedCodec(name) {
  if (mappedCache.has(name)) return mappedCache.get(name);
  const decode = new Map(), reverse = new Map();
  for (const [packed, s] of MULTIBYTE_TABLES[name]) {
    const bytes = unpackPacked(packed);
    decode.set(packed, s);
    const old = reverse.get(s);
    if (!old || bytes.length < old.length) reverse.set(s, bytes);
  }
  const v = { decode, reverse };
  mappedCache.set(name, v);
  return v;
}
function decodeMapped(data, name) {
  const { decode } = mappedCodec(name);
  let out = '';
  for (let i = 0; i < data.length;) {
    let s, used = 0;
    if (i + 2 < data.length) {
      const n = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      s = decode.get(n); if (s !== undefined) used = 3;
    }
    if (!used && i + 1 < data.length) {
      const n = (data[i] << 8) | data[i + 1];
      s = decode.get(n); if (s !== undefined) used = 2;
    }
    if (!used) {
      s = decode.get(data[i]); if (s !== undefined) used = 1;
    }
    if (!used) { out += '\ufffd'; i++; }
    else { out += s; i += used; }
  }
  return out;
}
function encodeMapped(text, name, strict) {
  const { reverse } = mappedCodec(name);
  return encodeWithStringMap(text, reverse, strict, reverse.get('?') || [0x3f]);
}

function decode94Mask(b64) {
  const raw = atob(b64), out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
function pairAllowed(mask, pair) {
  const r = (pair >> 8) & 0xff, c = pair & 0xff;
  if (r < 0x21 || r > 0x7e || c < 0x21 || c > 0x7e) return false;
  const i = (r - 0x21) * 94 + (c - 0x21);
  return !!(mask[i >> 3] & (1 << (i & 7)));
}
const GB2312_VALID_MASK = decode94Mask('//////////////8/AMD////////8z//z////////////////////////////HwD/////////////P8D//z/A//8/AAAAAPD///8fAPD///8fAPz//w/A/////wcAAPj//////////38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////H/z///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
const JIS0213_ISO_P2_VALID_MASK = decode94Mask('//////////////8/AAAAAAAAAAAAAADw/////////////////////////////////////////////z8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPz//////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/P////////////////////////////////////////////////////////////8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8PAA==');

function makePlane() { return { decode: new Map(), reverse: new Map() }; }
function addPlaneEntry(p, pair, s) {
  p.decode.set(pair, s);
  if (!p.reverse.has(s)) p.reverse.set(s, [pair >> 8, pair & 0xff]);
}
const planeCache = new Map();
function native94Plane(label, kind = 'standard') {
  const key = `native94:${label}:${kind}`;
  if (planeCache.has(key)) return planeCache.get(key);
  const p = makePlane(), dec = decoder(label, true);
  if (kind === 'jis0212') {
    for (let r = 0x21; r <= 0x7e; r++) for (let c = 0x21; c <= 0x7e; c++) {
      try {
        const s = dec.decode(Uint8Array.of(0x8f, r + 0x80, c + 0x80));
        if (s) addPlaneEntry(p, (r << 8) | c, s);
      } catch { /* unassigned */ }
    }
  } else {
    const maxRow = kind === 'gb2312' ? 0x77 : 0x7e;
    for (let r = 0x21; r <= maxRow; r++) for (let c = 0x21; c <= 0x7e; c++) {
      try {
        const s = dec.decode(Uint8Array.of(r + 0x80, c + 0x80));
        if (s) addPlaneEntry(p, (r << 8) | c, s);
      } catch { /* unassigned */ }
    }
  }
  planeCache.set(key, p);
  return p;
}
function staticJisPlane(tableName, planeNo, validMask = null) {
  const key = `staticjis:${tableName}:${planeNo}:${validMask ? 'strict' : 'all'}`;
  if (planeCache.has(key)) return planeCache.get(key);
  const p = makePlane();
  for (const [packed, s] of MULTIBYTE_TABLES[tableName]) {
    const b = unpackPacked(packed);
    let pair = null;
    if (planeNo === 1 && b.length === 2 && b[0] >= 0xa1 && b[0] <= 0xfe && b[1] >= 0xa1 && b[1] <= 0xfe)
      pair = ((b[0] - 0x80) << 8) | (b[1] - 0x80);
    else if (planeNo === 2 && b.length === 3 && b[0] === 0x8f && b[1] >= 0xa1 && b[1] <= 0xfe && b[2] >= 0xa1 && b[2] <= 0xfe)
      pair = ((b[1] - 0x80) << 8) | (b[2] - 0x80);
    if (pair !== null && (!validMask || pairAllowed(validMask, pair))) {
      const str = tableName === 'EUC-JISX0213' && planeNo === 2 && pair === 0x7d3b ? '\u9b1c' : s;
      addPlaneEntry(p, pair, str);
    }
  }
  planeCache.set(key, p);
  return p;
}
function cnsPlane(n) {
  const key = `cns:${n}`;
  if (planeCache.has(key)) return planeCache.get(key);
  const p = makePlane();
  for (const [pair, s] of CNS_PLANES[String(n)] || []) addPlaneEntry(p, pair, s);
  planeCache.set(key, p);
  return p;
}
function strictJisPlane(kind) {
  const key = `jis:${kind}`;
  if (planeCache.has(key)) return planeCache.get(key);
  const p = makePlane();
  for (const [pair, str] of JIS_PLANES[kind] || []) addPlaneEntry(p, pair, str);
  planeCache.set(key, p);
  return p;
}
function jis0208() { return strictJisPlane('0208'); }
function jis0212() { return strictJisPlane('0212'); }
function gb2312Plane() {
  const key = 'strict:gb2312';
  if (planeCache.has(key)) return planeCache.get(key);
  const raw = native94Plane('gbk', 'gb2312'), p = makePlane();
  for (let r = 0x21; r <= 0x77; r++) for (let c = 0x21; c <= 0x7e; c++) {
    const pair = (r << 8) | c;
    if (!pairAllowed(GB2312_VALID_MASK, pair)) continue;
    const str = pair === 0x2124 ? '\u30fb' : pair === 0x212a ? '\u2015' : raw.decode.get(pair);
    if (str !== undefined) addPlaneEntry(p, pair, str);
  }
  planeCache.set(key, p);
  return p;
}
function ksc5601Plane() { return native94Plane('euc-kr'); }
function jis0213_2000(n) {
  return staticJisPlane('EUC-JISX0213', n, n === 2 ? JIS0213_ISO_P2_VALID_MASK : null);
}
function jis0213_2004(n) {
  return staticJisPlane('EUC-JIS-2004', n, n === 2 ? JIS0213_ISO_P2_VALID_MASK : null);
}

function decodePlanePair(p, r, c) {
  if (r < 0x21 || r > 0x7e || c < 0x21 || c > 0x7e) return '\ufffd';
  return p.decode.get((r << 8) | c) ?? '\ufffd';
}
function planeMatch(p, chars, i) {
  if (i + 1 < chars.length) {
    const v = p.reverse.get(chars[i] + chars[i + 1]);
    if (v) return { bytes: v, used: 2 };
  }
  const v = p.reverse.get(chars[i]);
  return v ? { bytes: v, used: 1 } : null;
}

function decodeGb2312(data) {
  let out = '';
  const p = gb2312Plane();
  for (let i = 0; i < data.length;) {
    const b = data[i++];
    if (b < 0x80) { out += String.fromCharCode(b); continue; }
    if (i >= data.length) { out += '\ufffd'; break; }
    const c = data[i++];
    if (b < 0xa1 || b > 0xf7 || c < 0xa1 || c > 0xfe) out += '\ufffd';
    else out += p.decode.get(((b - 0x80) << 8) | (c - 0x80)) ?? '\ufffd';
  }
  return out;
}
function encodeGb2312(text, strict) {
  const p = gb2312Plane(), chars = [...text], out = [];
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp < 0x80) { out.push(cp); continue; }
    const m = planeMatch(p, chars, i);
    if (!m) {
      if (strict) throw new Error('UnicodeEncodeError');
      out.push(0x3f); continue;
    }
    if (m.used === 2) i++;
    out.push(m.bytes[0] + 0x80, m.bytes[1] + 0x80);
  }
  return new Uint8Array(out);
}

function decodeHz(data) {
  let out = '', chinese = false;
  const p = gb2312Plane();
  for (let i = 0; i < data.length;) {
    const b = data[i++];
    if (b === 0x7e && i < data.length) {
      const n = data[i++];
      if (n === 0x7b) { chinese = true; continue; }
      if (n === 0x7d) { chinese = false; continue; }
      if (n === 0x7e) { out += '~'; continue; }
      if (n === 0x0a) continue;
      if (n === 0x0d && data[i] === 0x0a) { i++; continue; }
      out += '\ufffd'; continue;
    }
    if (!chinese) { out += b < 0x80 ? String.fromCharCode(b) : '\ufffd'; continue; }
    if (b === 0x0a || b === 0x0d) { out += String.fromCharCode(b); chinese = false; continue; }
    if (i >= data.length) { out += '\ufffd'; break; }
    const c = data[i++];
    out += decodePlanePair(p, b, c);
  }
  return out;
}
function encodeHz(text, strict) {
  const p = gb2312Plane(), chars = [...text], out = [];
  let chinese = false;
  const ascii = b => {
    if (chinese) { out.push(0x7e, 0x7d); chinese = false; }
    if (b === 0x7e) out.push(0x7e, 0x7e); else out.push(b);
  };
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp < 0x80) { ascii(cp); continue; }
    const m = planeMatch(p, chars, i);
    if (!m) {
      if (strict) throw new Error('UnicodeEncodeError');
      ascii(0x3f); continue;
    }
    if (!chinese) { out.push(0x7e, 0x7b); chinese = true; }
    if (m.used === 2) i++;
    out.push(...m.bytes);
  }
  if (chinese) out.push(0x7e, 0x7d);
  return new Uint8Array(out);
}

function jpPlaneForMode(mode, variant) {
  switch (mode) {
    case 'JIS0208': return jis0208();
    case 'JIS0212': return jis0212();
    case 'GB2312': return gb2312Plane();
    case 'KSC5601': return ksc5601Plane();
    case 'JIS0213-P1-2000': return jis0213_2000(1);
    case 'JIS0213-P1-2004': return jis0213_2004(1);
    case 'JIS0213-P2': return variant === 'ISO-2022-JP-2004' ? jis0213_2004(2) : jis0213_2000(2);
    default: return null;
  }
}
function decodeIso2022Japanese(data, variant) {
  let out = '', i = 0, mode = 'ASCII', g2 = null;
  while (i < data.length) {
    const b = data[i++];
    if (b === 0x1b) {
      if (i >= data.length) { out += '\ufffd'; break; }
      if (data[i] === 0x4e) {
        i++;
        if (i >= data.length || !g2) { out += '\ufffd'; continue; }
        const x = data[i++];
        if (g2 === 'LATIN1') out += String.fromCodePoint(x + 0x80);
        else if (g2 === 'ISO8859-7') {
          try { out += decoder('iso-8859-7', true).decode(Uint8Array.of(x + 0x80)); }
          catch { out += '\ufffd'; }
        }
        continue;
      }
      const a = data[i], c = data[i + 1], d = data[i + 2];
      if (a === 0x28 && c === 0x42) { mode = 'ASCII'; i += 2; continue; }
      if (a === 0x28 && c === 0x4a) { mode = 'ROMAN'; i += 2; continue; }
      if (a === 0x28 && c === 0x49) { mode = 'KATAKANA'; i += 2; continue; }
      if (a === 0x24 && c === 0x40) { mode = 'JIS0208'; i += 2; continue; }
      if (a === 0x24 && c === 0x42) { mode = 'JIS0208'; i += 2; continue; }
      if (a === 0x2e && c === 0x41) { g2 = 'LATIN1'; i += 2; continue; }
      if (a === 0x2e && c === 0x46) { g2 = 'ISO8859-7'; i += 2; continue; }
      if (a === 0x24 && c === 0x28 && d !== undefined) {
        if (d === 0x44) mode = 'JIS0212';
        else if (d === 0x41) mode = 'GB2312';
        else if (d === 0x43) mode = 'KSC5601';
        else if (d === 0x4f) mode = 'JIS0213-P1-2000';
        else if (d === 0x50) mode = 'JIS0213-P2';
        else if (d === 0x51) mode = 'JIS0213-P1-2004';
        else { out += '\ufffd'; i++; continue; }
        i += 3; continue;
      }
      if (a === 0x24 && (c === 0x41 || c === 0x43)) {
        mode = c === 0x41 ? 'GB2312' : 'KSC5601'; i += 2; continue;
      }
      out += '\ufffd'; continue;
    }
    if (b < 0x20 || b === 0x7f) { out += String.fromCharCode(b); continue; }
    if (mode === 'ASCII') { out += String.fromCharCode(b); continue; }
    if (mode === 'ROMAN') {
      out += b === 0x5c ? '\u00a5' : b === 0x7e ? '\u203e' : String.fromCharCode(b);
      continue;
    }
    if (mode === 'KATAKANA') {
      out += b >= 0x21 && b <= 0x5f ? String.fromCodePoint(0xff61 + b - 0x21) : '\ufffd';
      continue;
    }
    if (i >= data.length) { out += '\ufffd'; break; }
    const c = data[i++];
    out += decodePlanePair(jpPlaneForMode(mode, variant), b, c);
  }
  return out;
}
const JP_ESC = {
  ASCII: [0x1b,0x28,0x42],
  ROMAN: [0x1b,0x28,0x4a],
  KATAKANA: [0x1b,0x28,0x49],
  JIS0208: [0x1b,0x24,0x42],
  JIS0212: [0x1b,0x24,0x28,0x44],
  GB2312: [0x1b,0x24,0x28,0x41],
  KSC5601: [0x1b,0x24,0x28,0x43],
  'JIS0213-P1-2000': [0x1b,0x24,0x28,0x4f],
  'JIS0213-P1-2004': [0x1b,0x24,0x28,0x51],
  'JIS0213-P2': [0x1b,0x24,0x28,0x50],
};
function jpCandidates(variant) {
  const a = [['JIS0208', jis0208()]];
  if (variant === 'ISO-2022-JP-1' || variant === 'ISO-2022-JP-2' || variant === 'ISO-2022-JP-EXT')
    a.push(['JIS0212', jis0212()]);
  if (variant === 'ISO-2022-JP-2') {
    a.push(['GB2312', gb2312Plane()], ['KSC5601', ksc5601Plane()]);
  }
  if (variant === 'ISO-2022-JP-3') {
    a.push(['JIS0213-P1-2000', jis0213_2000(1)], ['JIS0213-P2', jis0213_2000(2)]);
  }
  if (variant === 'ISO-2022-JP-2004') {
    a.push(['JIS0213-P1-2004', jis0213_2004(1)], ['JIS0213-P2', jis0213_2004(2)]);
  }
  return a;
}
function encodeIso2022Japanese(text, variant, strict) {
  const chars = [...text], out = [], candidates = jpCandidates(variant);
  let mode = 'ASCII', g2 = null;
  const setMode = m => { if (mode !== m) { out.push(...JP_ESC[m]); mode = m; } };
  const reset = () => setMode('ASCII');
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp < 0x80) { reset(); out.push(cp); continue; }
    if (cp === 0x00a5 || cp === 0x203e) {
      setMode('ROMAN'); out.push(cp === 0x00a5 ? 0x5c : 0x7e); continue;
    }
    if (variant === 'ISO-2022-JP-EXT' && cp >= 0xff61 && cp <= 0xff9f) {
      setMode('KATAKANA'); out.push(0x21 + cp - 0xff61); continue;
    }
    let found = null;
    for (const [m, p] of candidates) {
      const x = planeMatch(p, chars, i);
      if (x) { found = { mode: m, ...x }; break; }
    }
    if (found) {
      setMode(found.mode);
      out.push(...found.bytes);
      if (found.used === 2) i++;
      continue;
    }
    if (variant === 'ISO-2022-JP-2') {
      if (cp >= 0xa0 && cp <= 0xff) {
        reset();
        if (g2 !== 'LATIN1') { out.push(0x1b,0x2e,0x41); g2 = 'LATIN1'; }
        out.push(0x1b,0x4e,cp - 0x80);
        continue;
      }
      const greekByte = staticSingleReverse('ISO-8859-7').get(cp);
      if (greekByte !== undefined && greekByte >= 0xa0) {
        reset();
        if (g2 !== 'ISO8859-7') { out.push(0x1b,0x2e,0x46); g2 = 'ISO8859-7'; }
        out.push(0x1b,0x4e,greekByte - 0x80);
        continue;
      }
    }
    if (strict) throw new Error('UnicodeEncodeError');
    reset(); out.push(0x3f);
  }
  reset();
  return new Uint8Array(out);
}

function decodeIso2022Kr(data) {
  let out = '', i = 0, shifted = false;
  const p = ksc5601Plane();
  while (i < data.length) {
    const b = data[i++];
    if (b === 0x1b && data[i] === 0x24 && data[i + 1] === 0x29 && data[i + 2] === 0x43) { i += 3; continue; }
    if (b === 0x0e) { shifted = true; continue; }
    if (b === 0x0f) { shifted = false; continue; }
    if (!shifted) { out += b < 0x80 ? String.fromCharCode(b) : '\ufffd'; continue; }
    if (i >= data.length) { out += '\ufffd'; break; }
    out += decodePlanePair(p, b, data[i++]);
  }
  return out;
}
function encodeIso2022Kr(text, strict) {
  const p = ksc5601Plane(), chars = [...text], out = [];
  let designated = false, shifted = false;
  const ascii = b => { if (shifted) { out.push(0x0f); shifted = false; } out.push(b); };
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp < 0x80) { ascii(cp); continue; }
    const m = planeMatch(p, chars, i);
    if (!m) { if (strict) throw new Error('UnicodeEncodeError'); ascii(0x3f); continue; }
    if (!designated) { out.push(0x1b,0x24,0x29,0x43); designated = true; }
    if (!shifted) { out.push(0x0e); shifted = true; }
    out.push(...m.bytes);
    if (m.used === 2) i++;
  }
  if (shifted) out.push(0x0f);
  return new Uint8Array(out);
}

function decodeIso2022Cn(data, extended) {
  let out = '', i = 0, shifted = false, g1 = null, g2 = null, g3 = null;
  const pairFrom = (which, r, c) => {
    if (which === 'GB') return decodePlanePair(gb2312Plane(), r, c);
    if (which === 'CNS1') return decodePlanePair(cnsPlane(1), r, c);
    if (which === 'CNS2') return decodePlanePair(cnsPlane(2), r, c);
    if (typeof which === 'number') return decodePlanePair(cnsPlane(which), r, c);
    return '\ufffd';
  };
  while (i < data.length) {
    const b = data[i++];
    if (b === 0x1b) {
      if (data[i] === 0x4e) {
        i++;
        if (i + 1 >= data.length || !g2) { out += '\ufffd'; continue; }
        out += pairFrom(g2, data[i++] ?? 0, data[i++] ?? 0); continue;
      }
      if (data[i] === 0x4f) {
        i++;
        if (i + 1 >= data.length || !g3) { out += '\ufffd'; continue; }
        out += pairFrom(g3, data[i++] ?? 0, data[i++] ?? 0); continue;
      }
      const a = data[i], c = data[i + 1], d = data[i + 2];
      if (a === 0x24 && c === 0x29 && (d === 0x41 || d === 0x47)) {
        g1 = d === 0x41 ? 'GB' : 'CNS1'; i += 3; continue;
      }
      if (a === 0x24 && c === 0x2a && d === 0x48) { g2 = 'CNS2'; i += 3; continue; }
      if (extended && a === 0x24 && c === 0x2b && d >= 0x49 && d <= 0x4d) {
        g3 = d - 0x46; i += 3; continue;
      }
      out += '\ufffd'; continue;
    }
    if (b === 0x0e) { shifted = true; continue; }
    if (b === 0x0f) { shifted = false; continue; }
    if (!shifted) { out += b < 0x80 ? String.fromCharCode(b) : '\ufffd'; continue; }
    if (i >= data.length || !g1) { out += '\ufffd'; break; }
    out += pairFrom(g1, b, data[i++]);
  }
  return out;
}
function encodeIso2022Cn(text, extended, strict) {
  const chars = [...text], out = [];
  const gb = gb2312Plane(), c1 = cnsPlane(1), c2 = cnsPlane(2);
  let shifted = false, g1 = null, g2 = false, g3 = null;
  const leave = () => { if (shifted) { out.push(0x0f); shifted = false; } };
  const ascii = b => { leave(); out.push(b); };
  const setG1 = which => {
    if (g1 === which) return;
    leave();
    out.push(0x1b,0x24,0x29,which === 'GB' ? 0x41 : 0x47);
    g1 = which;
  };
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp < 0x80) { ascii(cp); continue; }
    let m = planeMatch(gb, chars, i);
    if (m) {
      setG1('GB'); if (!shifted) { out.push(0x0e); shifted = true; }
      out.push(...m.bytes); if (m.used === 2) i++; continue;
    }
    m = planeMatch(c1, chars, i);
    if (m) {
      setG1('CNS1'); if (!shifted) { out.push(0x0e); shifted = true; }
      out.push(...m.bytes); if (m.used === 2) i++; continue;
    }
    m = planeMatch(c2, chars, i);
    if (m) {
      leave();
      if (!g2) { out.push(0x1b,0x24,0x2a,0x48); g2 = true; }
      out.push(0x1b,0x4e,...m.bytes); if (m.used === 2) i++; continue;
    }
    if (extended) {
      let hit = null;
      for (let p = 3; p <= 7; p++) {
        const x = planeMatch(cnsPlane(p), chars, i);
        if (x) { hit = { p, ...x }; break; }
      }
      if (hit) {
        leave();
        if (g3 !== hit.p) { out.push(0x1b,0x24,0x2b,0x46 + hit.p); g3 = hit.p; }
        out.push(0x1b,0x4f,...hit.bytes); if (hit.used === 2) i++; continue;
      }
    }
    if (strict) throw new Error('UnicodeEncodeError');
    ascii(0x3f);
  }
  leave();
  return new Uint8Array(out);
}

function gb18030Pointer(cp) {
  let lo = 0, hi = GB18030_UCHARS.length - 1, idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (GB18030_UCHARS[mid] <= cp) { idx = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return GB18030_GBCHARS[idx] + cp - GB18030_UCHARS[idx];
}
function gb18030FourBytes(pointer) {
  const b4 = pointer % 10; pointer = Math.floor(pointer / 10);
  const b3 = pointer % 126; pointer = Math.floor(pointer / 126);
  const b2 = pointer % 10; pointer = Math.floor(pointer / 10);
  return [0x81 + pointer, 0x30 + b2, 0x81 + b3, 0x30 + b4];
}
function encodeGb18030(text, strict) {
  const map = nativeByteReverse('gb18030', false), chars = [...text], out = [];
  for (let i = 0; i < chars.length; i++) {
    let bytes;
    if (i + 1 < chars.length) {
      bytes = map.get(chars[i] + chars[i + 1]);
      if (bytes) i++;
    }
    if (!bytes) bytes = map.get(chars[i]);
    if (bytes) { out.push(...bytes); continue; }
    const cp = chars[i].codePointAt(0);
    if (cp >= 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)) {
      out.push(...gb18030FourBytes(gb18030Pointer(cp)));
    } else if (strict) throw new Error('UnicodeEncodeError');
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}

export function decodeBytes(data, name) {
  switch (name) {
    case 'UTF-8': return decodeUtf8(data);
    case 'UTF-8-SIG': return decodeUtf8Sig(data);
    case 'UTF-16LE': return decoder('utf-16le').decode(data);
    case 'UTF-16BE': return decoder('utf-16be').decode(data);
    case 'UTF-16': return decodeUtf16Auto(data);
    case 'UTF-32LE': return decodeUtf32Bytes(data, false);
    case 'UTF-32BE': return decodeUtf32Bytes(data, true);
    case 'UTF-32': return decodeUtf32Auto(data);
    case 'UTF-7': return decodeUtf7(data);
    case 'UTF-7-IMAP': return decodeImapUtf7(data);
    case 'CESU-8': return decodeCesu8(data);
    case 'SCSU': return decodeScsu(data);
    case 'BOCU-1': return decodeBocu1(data);
    case 'UTF-EBCDIC': return decodeUtfEbcdic(data);
    case 'ASCII': return decodeAscii(data);
    case 'ISO-8859-1 (Latin1)': return decodeLatin1(data);
    case 'x-user-defined': return decodeXUserDefined(data);
    case 'GB2312': return decodeGb2312(data);
    case 'HZ-GB-2312': return decodeHz(data);
    case 'ISO-2022-JP': return decoder('iso-2022-jp').decode(data);
    case 'ISO-2022-JP-1':
    case 'ISO-2022-JP-2':
    case 'ISO-2022-JP-2004':
    case 'ISO-2022-JP-3':
    case 'ISO-2022-JP-EXT':
      return decodeIso2022Japanese(data, name);
    case 'ISO-2022-KR': return decodeIso2022Kr(data);
    case 'ISO-2022-CN': return decodeIso2022Cn(data, false);
    case 'ISO-2022-CN-EXT': return decodeIso2022Cn(data, true);
    default:
      if (SINGLE_BYTE_TABLES[name]) return decodeStaticSingle(data, name);
      if (WHATWG_LABELS[name]) return decoder(WHATWG_LABELS[name]).decode(data);
      if (MULTIBYTE_TABLES[name]) return decodeMapped(data, name);
      if (NATIVE_CJK[name]) return decoder(NATIVE_CJK[name]).decode(data);
      throw new Error(`Unsupported encoding: ${name}`);
  }
}

export function encodeText(text, name, strict = false) {
  switch (name) {
    case 'UTF-8': return encodeUtf8(text);
    case 'UTF-8-SIG': return encodeUtf8Sig(text);
    case 'UTF-16LE': return encodeUtf16Bytes(text, false);
    case 'UTF-16BE': return encodeUtf16Bytes(text, true);
    case 'UTF-16': {
      const body = encodeUtf16Bytes(text, false), out = new Uint8Array(body.length + 2);
      out.set([0xff,0xfe]); out.set(body, 2); return out;
    }
    case 'UTF-32LE': return encodeUtf32Bytes(text, false);
    case 'UTF-32BE': return encodeUtf32Bytes(text, true);
    case 'UTF-32': {
      const body = encodeUtf32Bytes(text, false), out = new Uint8Array(body.length + 4);
      out.set([0xff,0xfe,0,0]); out.set(body, 4); return out;
    }
    case 'UTF-7': return encodeUtf7(text);
    case 'UTF-7-IMAP': return encodeImapUtf7(text);
    case 'CESU-8': return encodeCesu8(text);
    case 'SCSU': return encodeScsu(text);
    case 'BOCU-1': return encodeBocu1(text);
    case 'UTF-EBCDIC': return encodeUtfEbcdic(text);
    case 'ASCII': return encodeAscii(text, strict);
    case 'ISO-8859-1 (Latin1)': return encodeLatin1(text, strict);
    case 'x-user-defined': return encodeXUserDefined(text, strict);
    case 'GB18030': return encodeGb18030(text, strict);
    case 'GB2312': return encodeGb2312(text, strict);
    case 'HZ-GB-2312': return encodeHz(text, strict);
    case 'ISO-2022-JP':
    case 'ISO-2022-JP-1':
    case 'ISO-2022-JP-2':
    case 'ISO-2022-JP-2004':
    case 'ISO-2022-JP-3':
    case 'ISO-2022-JP-EXT':
      return encodeIso2022Japanese(text, name, strict);
    case 'ISO-2022-KR': return encodeIso2022Kr(text, strict);
    case 'ISO-2022-CN': return encodeIso2022Cn(text, false, strict);
    case 'ISO-2022-CN-EXT': return encodeIso2022Cn(text, true, strict);
    default:
      if (SINGLE_BYTE_TABLES[name]) return encodeStaticSingle(text, name, strict);
      if (WHATWG_LABELS[name]) return encodeWhatwgSingle(text, WHATWG_LABELS[name], strict);
      if (MULTIBYTE_TABLES[name]) return encodeMapped(text, name, strict);
      if (NATIVE_CJK[name]) return encodeNativeCjk(text, name, strict);
      throw new Error(`Unsupported encoding: ${name}`);
  }
}

module(
  'Encode text',
  'Converts text (UTF-8 input) to bytes in another character encoding.',
  [A.select('Encoding', ENCODING_GROUPS, 'UTF-8')],
  (t, enc) => encodeText(t, enc, false),
  { text: true }
);
