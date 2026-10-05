import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { pyFloatRepr } from './_num.js';

const U = {
  'Metres per second (m/s)': 1, 'Kilometres per hour (km/h)': 1 / 3.6, 'Miles per hour (mph)': 0.44704, 'Knots (kn)': 0.514444444,
  'Feet per second (ft/s)': 0.3048, 'Mach (at sea level)': 340.29, 'Speed of light (c)': 299792458,
};

module('Convert speed', 'Converts between units of speed.', [A.select('Input units', Object.keys(U)), A.select('Output units', Object.keys(U), 'Kilometres per hour (km/h)')],
  (t, a, b) => t.split(/\s+/).filter(Boolean).map(x => pyFloatRepr(Number(x) * U[a] / U[b])).join('\n'), { text: true });
