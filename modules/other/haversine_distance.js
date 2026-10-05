import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

const RADII = { Kilometres: 6371.0088, Miles: 3958.7613, 'Nautical miles': 3440.0695 };

module('Haversine distance', 'Great-circle distance between two lat/lon points on Earth. Input: lat1,lon1<separator>lat2,lon2.',
  [A.string('Separator', '\\n'), A.select('Unit', ['Kilometres', 'Miles', 'Nautical miles'])],
  (t, sep, unit) => {
    sep = delim(sep);
    const idx = t.indexOf(sep);
    if (idx < 0) throw new Error("Separator not found: provide two 'lat,lon' points separated by it");
    const p1 = t.slice(0, idx), p2 = t.slice(idx + sep.length);
    const [lat1, lon1] = p1.split(',').map(x => parseFloat(x));
    const [lat2, lon2] = p2.split(',').map(x => parseFloat(x));
    const r = RADII[unit];
    const rad = x => x * Math.PI / 180;
    const phi1 = rad(lat1), phi2 = rad(lat2);
    const dphi = rad(lat2 - lat1), dlambda = rad(lon2 - lon1);
    const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
    const d = 2 * r * Math.asin(Math.sqrt(a));
    return `${d.toFixed(4)} ${unit.toLowerCase()}`;
  }, { text: true });
