import { module } from './_cat.js';
import { decodeLatin1, bytesToHex } from '../../core/util.js';

const TAGS = {
  0x010f: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x011a: 'XResolution', 0x011b: 'YResolution', 0x0131: 'Software', 0x0132: 'DateTime', 0x013b: 'Artist',
  0x8298: 'Copyright', 0x829a: 'ExposureTime', 0x829d: 'FNumber', 0x8827: 'ISOSpeedRatings', 0x9003: 'DateTimeOriginal', 0x9004: 'DateTimeDigitized', 0x920a: 'FocalLength',
  0xa002: 'PixelXDimension', 0xa003: 'PixelYDimension', 0xa433: 'LensMake', 0xa434: 'LensModel', 0x010e: 'ImageDescription', 0x9286: 'UserComment', 0xa430: 'CameraOwnerName',
};
const GPS = { 1: 'GPSLatitudeRef', 2: 'GPSLatitude', 3: 'GPSLongitudeRef', 4: 'GPSLongitude', 5: 'GPSAltitudeRef', 6: 'GPSAltitude' };
const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function stripTrailingNulls(u8) {
  let end = u8.length;
  while (end > 0 && u8[end - 1] === 0) end--;
  return u8.subarray(0, end);
}

function readInts(raw, cnt, width, little, signed) {
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const out = [];
  for (let k = 0; k < cnt; k++) {
    if (width === 2) out.push(signed ? dv.getInt16(k * 2, little) : dv.getUint16(k * 2, little));
    else out.push(signed ? dv.getInt32(k * 4, little) : dv.getUint32(k * 4, little));
  }
  return out;
}

function pyBytesRepr(u8) {
  let hasSingle = false, hasDouble = false;
  for (const b of u8) { if (b === 0x27) hasSingle = true; else if (b === 0x22) hasDouble = true; }
  const q = (hasSingle && !hasDouble) ? '"' : "'";
  const qc = q.charCodeAt(0);
  let s = 'b' + q;
  for (const b of u8) {
    if (b === qc) s += '\\' + q;
    else if (b === 0x5c) s += '\\\\';
    else if (b === 0x09) s += '\\t';
    else if (b === 0x0a) s += '\\n';
    else if (b === 0x0d) s += '\\r';
    else if (b >= 0x20 && b < 0x7f) s += String.fromCharCode(b);
    else s += '\\x' + b.toString(16).padStart(2, '0');
  }
  return s + q;
}

function formatVal(v) {
  if (v instanceof Uint8Array) return pyBytesRepr(v);
  if (Array.isArray(v)) {
    if (!v.length) return '()';
    return `(${v.map(x => typeof x === 'string' ? `'${x}'` : String(x)).join(', ')})`;
  }
  return String(v);
}

function parseTiff(t) {
  const little = t[0] === 0x49 && t[1] === 0x49; // "II"
  const dv = new DataView(t.buffer, t.byteOffset, t.byteLength);
  const out = {};

  function ifd(off, names, prefix) {
    const n = dv.getUint16(off, little);
    for (let i = 0; i < n; i++) {
      const entryOff = off + 2 + i * 12;
      const tag = dv.getUint16(entryOff, little);
      const typ = dv.getUint16(entryOff + 2, little);
      const cnt = dv.getUint32(entryOff + 4, little);
      const valOff = entryOff + 8;
      const size = (SIZES[typ] ?? 1) * cnt;
      let raw;
      if (size <= 4) raw = t.subarray(valOff, valOff + size);
      else { const ptr = dv.getUint32(valOff, little); raw = t.subarray(ptr, ptr + size); }
      if (tag === 0x8769 && !prefix) { ifd(dv.getUint32(valOff, little), TAGS, 'Exif.'); continue; }
      if (tag === 0x8825 && !prefix) { ifd(dv.getUint32(valOff, little), GPS, 'GPS.'); continue; }
      let v;
      if (typ === 2) v = decodeLatin1(stripTrailingNulls(raw));
      else if (typ === 3) v = readInts(raw, cnt, 2, little, false);
      else if (typ === 4) v = readInts(raw, cnt, 4, little, false);
      else if (typ === 5 || typ === 10) {
        const nums = readInts(raw, cnt * 2, 4, little, typ === 10);
        const parts = [];
        for (let j = 0; j < nums.length; j += 2) parts.push(nums[j + 1] !== 1 ? `${nums[j]}/${nums[j + 1]}` : String(nums[j]));
        v = parts;
      } else {
        v = raw.length > 16 ? bytesToHex(raw) : raw;
      }
      if (Array.isArray(v) && v.length === 1) v = v[0];
      const name = names[tag] ?? `Tag 0x${tag.toString(16).padStart(4, '0')}`;
      out[prefix + name] = v;
    }
  }
  ifd(dv.getUint32(4, little), TAGS, '');
  return out;
}

module('Extract EXIF', 'Reads EXIF metadata (camera, timestamps, GPS) from a JPEG file.', [],
  (data) => {
    if (!(data[0] === 0xff && data[1] === 0xd8)) throw new Error('Not a JPEG file');
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let i = 2;
    while (i + 4 < data.length) {
      if (data[i] !== 0xff) break;
      const marker = data[i + 1];
      const ln = dv.getUint16(i + 2, false);
      if (marker === 0xe1 && data[i + 4] === 0x45 && data[i + 5] === 0x78 && data[i + 6] === 0x69 && data[i + 7] === 0x66 && data[i + 8] === 0 && data[i + 9] === 0) {
        const tags = parseTiff(data.subarray(i + 10, i + 2 + ln));
        const lines = Object.entries(tags).map(([k, v]) => `${k}: ${formatVal(v)}`);
        return lines.join('\n') || 'EXIF block contains no known tags.';
      }
      if (marker === 0xda) break;
      i += 2 + ln;
    }
    return 'No EXIF data found.';
  });
