import { module } from './_cat.js';
import { decodeLatin1 } from '../../core/util.js';
import { EXIF_TAGS, GPS_TAGS } from './_exif_tags.js';


const BYTES_PER_COMPONENT = { 1: 1, 2: 1, 6: 1, 7: 1, 3: 2, 8: 2, 4: 4, 9: 4, 11: 4, 5: 8, 10: 8, 12: 8 };

function reader(data, start, end, little) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    off: start,
    end,
    little,
    u8() { return data[this.off++]; },
    i8() { const v = view.getInt8(this.off); this.off += 1; return v; },
    u16() { const v = view.getUint16(this.off, this.little); this.off += 2; return v; },
    u32() { const v = view.getUint32(this.off, this.little); this.off += 4; return v; },
    i32() { const v = view.getInt32(this.off, this.little); this.off += 4; return v; },
    f32() { const v = view.getFloat32(this.off, this.little); this.off += 4; return v; },
    f64() { const v = view.getFloat64(this.off, this.little); this.off += 8; return v; },
    str(n) { const s = decodeLatin1(data.subarray(this.off, this.off + n)); this.off += n; return s; },
    skip(n) { this.off += n; },
    remaining() { return this.end - this.off; },
  };
}

function readValue(format, s) {
  switch (format) {
    case 1: return s.u8();
    case 3: return s.u16();
    case 4: return s.u32();
    case 5: return [s.u32(), s.u32()];
    case 6: return s.i8();
    case 8: return s.u16();
    case 9: return s.u32();
    case 10: return [s.i32(), s.i32()];
    case 11: return s.f32();
    case 12: return s.f64();
    default: throw new Error(`Invalid format while decoding: ${format}`);
  }
}

function simplifyValue(values, format) {
  if (Array.isArray(values)) {
    values = values.map(v => (format === 10 || format === 5 ? v[0] / v[1] : v));
    if (values.length === 1) values = values[0];
  }
  return values;
}

// "YYYY:MM:DD hh:mm:ss" (and the non-standard ISO form with a timezone) -> unix timestamp, seconds.
function parseExifDate(str) {
  const parts = (dateParts, timeParts) => {
    const d = dateParts.map(n => parseInt(n, 10)), t = timeParts.map(n => parseInt(n, 10));
    return Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1], t[2], 0) / 1000;
  };
  if (str.length === 25 && str.charAt(10) === 'T') {
    const tz = str.substr(19, 6).split(':').map(n => parseInt(n, 10));
    const ts = parts(str.substr(0, 10).split('-'), str.substr(11, 8).split(':')) - (tz[0] * 3600 + tz[1] * 60);
    return Number.isNaN(ts) ? undefined : ts;
  }
  if (str.length === 19 && str.charAt(4) === ':') {
    const bits = str.split(' ');
    const ts = parts(bits[0].split(':'), bits[1].split(':'));
    return Number.isNaN(ts) ? undefined : ts;
  }
  return undefined;
}

function readTag(data, s, tiffStart) {
  const tagType = s.u16();
  const format = s.u16();
  const bytesPerComponent = BYTES_PER_COMPONENT[format] ?? 0;
  const components = s.u32();
  const valueBytes = bytesPerComponent * components;
  let vs = s;
  if (valueBytes > 4) vs = reader(data, tiffStart + s.u32(), s.end, s.little);
  let values;
  if (format === 2) {
    values = vs.str(components);
    const lastNull = values.indexOf('\0');
    if (lastNull !== -1) values = values.substr(0, lastNull);
  } else if (format === 7) {
    values = data.subarray(vs.off, vs.off + components);
    vs.skip(components);
  } else if (format !== 0) {
    values = [];
    for (let c = 0; c < components; c++) values.push(readValue(format, vs));
  }
  if (valueBytes < 4) s.skip(4 - valueBytes);
  return [tagType, values, format];
}

const GPSIFD = 3;

function parseExifSection(data, sectionStart, sectionEnd, emit) {
  const head = decodeLatin1(data.subarray(sectionStart, sectionStart + 6));
  if (head !== 'Exif\0\0') return false; // APP1 sections with another header (e.g. XMP) are ignored
  const tiffStart = sectionStart + 6;
  const be = data[tiffStart] === 0x4d && data[tiffStart + 1] === 0x4d;
  const le = data[tiffStart] === 0x49 && data[tiffStart + 1] === 0x49;
  if (!be && !le) throw new Error('Invalid TIFF header');
  const little = le;
  const s = reader(data, tiffStart + 2, sectionEnd, little);
  if (s.u16() !== 0x002a) throw new Error('Invalid TIFF data');
  const readIFD = (offset, section, handler) => {
    const ifd = reader(data, tiffStart + offset, sectionEnd, little);
    const n = ifd.u16();
    for (let i = 0; i < n; i++) {
      const [tagType, value, format] = readTag(data, ifd, tiffStart);
      handler(section, tagType, value, format);
    }
    return ifd;
  };
  let subIfdOffset, gpsOffset, interopOffset;
  const ifd0 = readIFD(s.u32(), 1, (section, tagType, value, format) => {
    if (tagType === 0x8825) gpsOffset = value[0];
    else if (tagType === 0x8769) subIfdOffset = value[0];
    else emit(section, tagType, value, format);
  });
  const ifd1Offset = ifd0.u32();
  if (ifd1Offset !== 0) readIFD(ifd1Offset, 2, emit);
  if (gpsOffset) readIFD(gpsOffset, GPSIFD, emit);
  if (subIfdOffset) {
    readIFD(subIfdOffset, 5, (section, tagType, value, format) => {
      if (tagType === 0xa005) interopOffset = value[0];
      else emit(section, tagType, value, format);
    });
  }
  if (interopOffset) readIFD(interopOffset, 5, emit);
  return true;
}

module('Extract EXIF',
  'Reads EXIF metadata (camera, timestamps, GPS, ...) from a JPEG file. Rational values are reduced ' +
  'to plain numbers, GPS latitude/longitude become signed decimal degrees, and the EXIF date ' +
  'strings become UTC unix timestamps in seconds. Binary (format 7) tags are skipped.',
  [],
  (data) => {
    const tags = new Map();
    try {
      // Walk the JPEG's marker segments, stopping at the start of scan, like exif-parser does.
      let off = 0;
      let markerType;
      while (data.length - off > 0 && markerType !== 0xda) {
        if (data[off++] !== 0xff) throw new Error('Invalid JPEG section offset');
        markerType = data[off++];
        let len;
        if ((markerType >= 0xd0 && markerType <= 0xd9) || markerType === 0xda) len = 0;
        else {
          if (off + 2 > data.length) throw new Error('Invalid JPEG section offset');
          len = ((data[off] << 8) | data[off + 1]) - 2;
          off += 2;
        }
        if (len < 0 || off + len > data.length) throw new Error('Invalid JPEG section offset');
        if (markerType === 0xe1) {
          parseExifSection(data, off, off + len, (section, tagType, value, format) => {
            if (format === 7) return;
            if (tagType === 0x0201 || tagType === 0x0202 || tagType === 0x0103) return; // thumbnail pointers
            const name = (section === GPSIFD ? GPS_TAGS[tagType] : EXIF_TAGS[tagType]) ?? EXIF_TAGS[tagType];
            if (!tags.has(name)) tags.set(name, simplifyValue(value, format));
          });
        }
        off += len;
      }
    } catch (err) {
      throw new Error(`Could not extract EXIF data from image: ${err instanceof Error ? `Error: ${err.message}` : err}`);
    }
    // GPS co-ordinates -> signed decimal degrees.
    for (const [name, refName, posVal] of [['GPSLatitude', 'GPSLatitudeRef', 'N'], ['GPSLongitude', 'GPSLongitudeRef', 'E']]) {
      const v = tags.get(name);
      if (v) {
        const sign = tags.get(refName) === posVal ? 1 : -1;
        tags.set(name, (v[0] + v[1] / 60 + v[2] / 3600) * sign);
      }
    }
    // EXIF date strings -> unix timestamps.
    for (const name of ['ModifyDate', 'DateTimeOriginal', 'CreateDate', 'ModifyDate']) {
      const v = tags.get(name);
      if (v) {
        const ts = parseExifDate(String(v));
        if (ts !== undefined) tags.set(name, ts);
      }
    }
    const lines = [...tags].map(([name, value]) => `${name}: ${value}`);
    lines.unshift(`Found ${lines.length} tags.\n`);
    return lines.join('\n');
  });
