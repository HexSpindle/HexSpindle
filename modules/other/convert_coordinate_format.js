import { module } from './_cat.js';
import { A } from '../../core/registry.js';


const GRID = ['Military Grid Reference System', 'Ordnance Survey National Grid', 'Universal Transverse Mercator'];
const NO_CHANGE = ['Geohash', ...GRID];
const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function geohashEncode(lat, lon, chars) {
  if (chars === undefined) chars = 9;
  const out = [];
  let bits = 0, total = 0, v = 0, maxLat = 90, minLat = -90, maxLon = 180, minLon = -180;
  while (out.length < chars) {
    if (total % 2 === 0) { const mid = (maxLon + minLon) / 2; if (lon > mid) { v = (v << 1) + 1; minLon = mid; } else { v <<= 1; maxLon = mid; } }
    else { const mid = (maxLat + minLat) / 2; if (lat > mid) { v = (v << 1) + 1; minLat = mid; } else { v <<= 1; maxLat = mid; } }
    bits++; total++;
    if (bits === 5) { out.push(B32[v]); bits = 0; v = 0; }
  }
  return out.join('');
}

function geohashDecode(hash) {
  let isLon = true, maxLat = 90, minLat = -90, maxLon = 180, minLon = -180;
  for (const ch of hash) {
    const v = B32.indexOf(ch.toLowerCase());
    for (let b = 4; b >= 0; b--) {
      const bit = v < 0 ? 0 : (v >> b) & 1;
      if (isLon) { const mid = (maxLon + minLon) / 2; if (bit) minLon = mid; else maxLon = mid; }
      else { const mid = (maxLat + minLat) / 2; if (bit) minLat = mid; else maxLat = mid; }
      isLon = !isLon;
    }
  }
  return { latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2 };
}

const isNegZero = z => z === 0 && 1 / z < 0;
function round(x, p) { p = Math.pow(10, p); return Math.round(x * p) / p; }

function splitInput(input) {
  const out = [];
  input.split(/\s+/).forEach(item => {
    item = item.replace(/[^0-9.-]/g, '');
    if (item.length > 0) out.push(parseFloat(item));
  });
  return out;
}

function dmsToDD(d, m, s) { let c = Math.abs(d) + m / 60 + s / 3600; if (isNegZero(d) || d < 0) c = -c; return c; }
function ddmToDD(d, m) { let c = Math.abs(d) + m / 60; if (isNegZero(d) || d < 0) c = -c; return c; }
function ddToDMS(dd, p) {
  const abs = Math.abs(dd), deg = Math.floor(abs), min = Math.floor(60 * (abs - deg)), sec = round(3600 * (abs - deg) - 60 * min, p);
  const s = deg + '° ' + min + "' " + sec + '"';
  return isNegZero(dd) || dd < 0 ? '-' + s : s;
}
function ddToDDM(dd, p) {
  const abs = Math.abs(dd), deg = Math.floor(abs), s = deg + '° ' + round((abs - deg) * 60, p) + "'";
  return dd < 0 || isNegZero(dd) ? '-' + s : s;
}

function realDelim(d) { return { 'Auto': 'Auto', 'Space': ' ', '\\n': '\n', 'Comma': ',', 'Semi-colon': ';', 'Colon': ':' }[d]; }

function findDirs(input, delim) {
  const up = input.toUpperCase();
  const dirs = up.match(/[NESW]/g);
  if (dirs && dirs.length <= 2 && dirs.length >= 1) return dirs.length === 2 ? [dirs[0], dirs[1]] : [dirs[0], ''];
  let lat = up, long, latDir = '', longDir = '';
  if (!delim.includes('Direction')) {
    if (up.includes(delim)) {
      const sp = up.split(delim);
      if (sp[0] !== '') lat = sp[0];
      if (sp.length >= 2 && sp[1] !== '') long = sp[1];
    }
  } else {
    const sp = up.split(/[NESW]/g);
    if (sp.length > 1) { lat = sp[0] === '' ? sp[1] : sp[0]; if (sp.length > 2 && sp[2] !== '') long = sp[2]; }
  }
  if (lat) latDir = parseFloat(lat) < 0 ? 'S' : 'N';
  if (long) longDir = parseFloat(long) < 0 ? 'W' : 'E';
  return [latDir, longDir];
}

function findFormat(input, delim) {
  let testData;
  input = input.trim();
  if (delim !== null && delim.includes('Direction')) {
    const sp = input.split(/[NnEeSsWw]/);
    if (sp.length > 1) testData = sp[0] === '' ? sp[1] : sp[0];
  } else if (delim !== null && delim !== '') {
    if (input.includes(delim)) { const sp = input.split(delim); if (sp.length > 1) testData = sp[0] === '' ? sp[1] : sp[0]; }
    else testData = input;
  }
  if (!/[°'"]/.test(input)) {
    const f = input.toUpperCase().replace(delim, '');
    if (/^[0-9]{2}\s?[C-HJ-NP-X]\s[0-9.]+\s?[0-9.]+$/.test(f)) return 'Universal Transverse Mercator';
    if (/^[0-9]{2}\s?[C-HJ-NP-X]{1}\s?[A-HJ-NP-Z][A-HJ-NP-V]\s?[0-9\s]+/.test(f)) return 'Military Grid Reference System';
    if (/^[A-HJ-Z]{2}\s+[0-9\s]+$/.test(f)) return 'Ordnance Survey National Grid';
    if (/^[0123456789BCDEFGHJKMNPQRSTUVWXYZ]+$/.test(f)) return 'Geohash';
  }
  if (testData !== undefined) {
    switch (splitInput(testData).length) {
      case 3: return 'Degrees Minutes Seconds';
      case 2: return 'Degrees Decimal Minutes';
      case 1: return 'Decimal Degrees';
    }
  }
  return null;
}

function findDelim(input) {
  input = input.trim();
  const testDir = input.match(/[NnEeSsWw]/g);
  if (testDir !== null && testDir.length > 0 && testDir.length < 3) {
    const sp = input.split(/[NnEeSsWw]/);
    if (sp.length <= 3 && sp.length > 0) {
      if (sp[0] === '') return 'Direction Preceding';
      if (sp[sp.length - 1] === '') return 'Direction Following';
    }
  }
  for (const d of [',', ';', ':']) if (input.includes(d) && input.split(d).length <= 3) return d;
  return null;
}

let geodesyP = null;
const geodesy = () => (geodesyP ??= import('./_geodesy.mjs'));

async function convert(input, inFormat, inDelim, outFormat, outDelim, includeDir, precision) {
  let isPair = false, split, lat, lon;
  if (precision < 0) precision = 0;
  if (inDelim === 'Auto') {
    inDelim = findDelim(input);
    if (inDelim === null) throw new Error('Unable to detect the input delimiter automatically.');
  } else if (!inDelim.includes('Direction')) inDelim = realDelim(inDelim);
  if (inFormat === 'Auto') {
    inFormat = findFormat(input, inDelim);
    if (inFormat === null) throw new Error('Unable to detect the input format automatically.');
  }
  outDelim = realDelim(outDelim);
  if (!NO_CHANGE.includes(inFormat)) {
    if (inDelim.includes('Direction')) { split = input.split(/[NnEeSsWw]/g); if (split[0] === '') split = split.slice(1); }
    else split = input.split(inDelim);
    split = split.map(s => s.replace(/[°˝´'"]/g, ' '));
    if (split.length > 1) isPair = true;
  } else {
    input = input.replace(inDelim, '');
    isPair = true;
  }
  const bad = f => new Error(`Invalid co-ordinate format for ${f}`);
  const G = (GRID.includes(inFormat) || GRID.includes(outFormat)) ? await geodesy() : null;
  switch (inFormat) {
    case 'Military Grid Reference System': {
      const ll = G.Mgrs.parse(input.replace(/[^A-Za-z0-9]/g, '')).toUtm().toLatLonE(); lat = ll.lat; lon = ll.lon; break;
    }
    case 'Ordnance Survey National Grid': {
      const ll = G.OsGridRef.osGridToLatLon(G.OsGridRef.parse(input.replace(/[^A-Za-z0-9]/g, ''))); lat = ll.lat; lon = ll.lon; break;
    }
    case 'Universal Transverse Mercator': {
      if (/^[\d]{2}[A-Za-z]/.test(input)) input = input.slice(0, 2) + ' ' + input.slice(2);
      const ll = G.Utm.parse(input).toLatLonE(); lat = ll.lat; lon = ll.lon; break;
    }
    case 'Geohash': { const h = geohashDecode(input.replace(/[^A-Za-z0-9]/g, '')); lat = h.latitude; lon = h.longitude; break; }
    case 'Degrees Minutes Seconds': {
      const a = splitInput(split[0]);
      if (isPair) {
        const b = splitInput(split[1]);
        if (a.length < 3 || b.length < 3) throw bad('Degrees Minutes Seconds');
        lat = dmsToDD(a[0], a[1], a[2]); lon = dmsToDD(b[0], b[1], b[2]);
      } else {
        if (a.length < 3) throw bad('Degrees Minutes Seconds');
        lat = lon = dmsToDD(a[0], a[1], a[2]);
      }
      break;
    }
    case 'Degrees Decimal Minutes': {
      if (isPair) {
        const a = splitInput(split[0]), b = splitInput(split[1]);
        if (a.length !== 2 || b.length !== 2) throw bad('Degrees Decimal Minutes.');
        lat = ddmToDD(a[0], a[1]); lon = ddmToDD(b[0], b[1]);
      } else {
        const a = splitInput(input);
        if (a.length !== 2) throw bad('Degrees Decimal Minutes.');
        lat = lon = ddmToDD(a[0], a[1]);
      }
      break;
    }
    case 'Decimal Degrees': {
      const a = splitInput(split[0]);
      if (isPair) {
        const b = splitInput(split[1]);
        if (a.length !== 1 || b.length !== 1) throw bad('Decimal Degrees.');
        lat = Number(a[0]); lon = Number(b[0]);
      } else {
        if (a.length !== 1) throw bad('Decimal Degrees.');
        lat = lon = Number(a[0]);
      }
      break;
    }
    default:
      throw new Error(`Unknown input format '${inFormat}'`);
  }
  if (inFormat.includes('Degrees')) {
    const dirs = input.toUpperCase().match(/[NESW]/g);
    if (dirs && dirs.length >= 1) {
      if (dirs[0] === 'S' || (dirs[0] === 'W' && lat > 0)) lat = -lat;
      if (dirs.length >= 2 && (dirs[1] === 'S' || (dirs[1] === 'W' && lon > 0))) lon = -lon;
    }
  }
  const [latDir, longDir] = findDirs(lat + ',' + lon, ',');
  let convLat, convLon;
  switch (outFormat) {
    case 'Decimal Degrees': convLat = round(lat, precision) + '°'; convLon = round(lon, precision) + '°'; break;
    case 'Degrees Decimal Minutes': convLat = ddToDDM(lat, precision); convLon = ddToDDM(lon, precision); break;
    case 'Degrees Minutes Seconds': convLat = ddToDMS(lat, precision); convLon = ddToDMS(lon, precision); break;
    case 'Geohash': convLat = geohashEncode(lat, lon, precision); break;
    case 'Military Grid Reference System': {
      const mgrs = new G.LatLonEllipsoidal(lat, lon).toUtm().toMgrs();
      if (precision % 2 !== 0) precision = precision + 1;
      if (precision > 10) precision = 10;
      convLat = mgrs.toString(precision);
      break;
    }
    case 'Ordnance Survey National Grid': {
      const osng = G.OsGridRef.latLonToOsGrid(new G.LatLonEllipsoidal(lat, lon));
      if (osng.toString() === '') throw new Error('Could not convert co-ordinates to OS National Grid. Are the co-ordinates in range?');
      if (precision % 2 !== 0) precision = precision + 1;
      if (precision > 10) precision = 10;
      convLat = osng.toString(precision);
      break;
    }
    case 'Universal Transverse Mercator': convLat = new G.LatLonEllipsoidal(lat, lon).toUtm().toString(precision); break;
  }
  if (convLat === undefined) throw new Error('Error converting co-ordinates.');
  if (!outFormat.includes('Degrees')) return convLat + outDelim;
  if (latDir === 'S' && includeDir !== 'None') convLat = convLat.replace('-', '');
  if (longDir === 'W' && includeDir !== 'None') convLon = convLon.replace('-', '');
  let out = '';
  if (includeDir === 'Before') out += latDir + ' ';
  out += convLat;
  if (includeDir === 'After') out += ' ' + latDir;
  out += outDelim;
  if (isPair) {
    if (includeDir === 'Before') out += longDir + ' ';
    out += convLon;
    if (includeDir === 'After') out += ' ' + longDir;
    out += outDelim;
  }
  return out;
}

module('Convert co-ordinate format', 'Converts geographical co-ordinates between Degrees Minutes Seconds, Degrees Decimal Minutes, Decimal Degrees and Geohash.',
  [A.select('Output format', ['Decimal Degrees', 'Degrees Minutes Seconds', 'Degrees Decimal Minutes', 'Geohash', ...GRID], 'Degrees Minutes Seconds'),
    A.select('Input format', ['Auto', 'Degrees Minutes Seconds', 'Degrees Decimal Minutes', 'Decimal Degrees', 'Geohash', ...GRID]),
    A.select('Input delimiter', ['Auto', 'Direction Preceding', 'Direction Following', '\\n', 'Comma', 'Semi-colon', 'Colon']),
    A.select('Output delimiter', ['Space', '\\n', 'Comma', 'Semi-colon', 'Colon']),
    A.select('Include compass directions', ['None', 'Before', 'After']),
    A.number('Precision', 3)],
  async (t, outFormat, inFormat, inDelim, outDelim, includeDir, precision) => {
    if (t.replace(/[\s+]/g, '') === '') return t;
    const out = await convert(t, inFormat ?? 'Auto', inDelim ?? 'Auto', outFormat, outDelim ?? 'Space', includeDir ?? 'None', precision ?? 3);
    return /^[\x00-\xff]*$/.test(out) ? Uint8Array.from(out, c => c.charCodeAt(0)) : out;
  }, { text: true });
