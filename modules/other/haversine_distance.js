import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

const RADII = { Kilometres: 6371.0088, Miles: 3958.7613, 'Nautical miles': 3440.0695 };

const CC_FORM = /^(-?\d+(\.\d+)?), ?(-?\d+(\.\d+)?), ?(-?\d+(\.\d+)?), ?(-?\d+(\.\d+)?)$/;

module('Haversine distance', 'Great-circle distance between two lat/lon points on Earth. Input: lat1,lon1<separator>lat2,lon2, or the one-line "lat1, lng1, lat2, lng2". The Metres unit gives (a bare number, 6371 km sphere).',
  [A.string('Separator', '\\n'), A.select('Unit', ['Kilometres', 'Miles', 'Nautical miles', 'Metres'], 'Metres')],
  (t, sep, unit) => {
    sep = delim(sep);
    let lat1, lon1, lat2, lon2;
    const cc = t.match(CC_FORM);
    const idx = sep ? t.indexOf(sep) : -1;
    if (idx >= 0) {
      const p1 = t.slice(0, idx), p2 = t.slice(idx + sep.length);
      [lat1, lon1] = p1.split(',').map(x => parseFloat(x));
      [lat2, lon2] = p2.split(',').map(x => parseFloat(x));
    } else if (cc) {
      [lat1, lon1, lat2, lon2] = [cc[1], cc[3], cc[5], cc[7]].map(parseFloat);
    } else if (unit === 'Metres') {
      throw new Error('Input must in the format lat1, lng1, lat2, lng2');
    } else {
      throw new Error("Separator not found: provide two 'lat,lon' points separated by it");
    }
    if (unit === 'Metres') {
      const TO_RAD = Math.PI / 180;
      const dLat = (lat2 - lat1) * TO_RAD, dLng = (lon2 - lon1) * TO_RAD;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * TO_RAD) * Math.cos(lat2 * TO_RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return String(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }
    const r = RADII[unit];
    const rad = x => x * Math.PI / 180;
    const phi1 = rad(lat1), phi2 = rad(lat2);
    const dphi = rad(lat2 - lat1), dlambda = rad(lon2 - lon1);
    const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
    const d = 2 * r * Math.asin(Math.sqrt(a));
    return `${d.toFixed(4)} ${unit.toLowerCase()}`;
  }, { text: true });
