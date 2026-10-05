import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { pyFloatRepr } from './_num.js';

const U = {
  'Nanometres (nm)': 1e-9, 'Micrometres (µm)': 1e-6, 'Millimetres (mm)': 1e-3, 'Centimetres (cm)': 1e-2, 'Metres (m)': 1, 'Kilometres (km)': 1e3,
  'Thou (th)': 2.54e-5, 'Inches (in)': 0.0254, 'Feet (ft)': 0.3048, 'Yards (yd)': 0.9144, 'Chains (ch)': 20.1168, 'Furlongs (fur)': 201.168,
  'Miles (mi)': 1609.344, 'Leagues (lea)': 4828.032, 'Nautical miles (nmi)': 1852, 'Light-years (ly)': 9.4607304725808e15, 'Parsecs (pc)': 3.0856775814914e16,
  'Astronomical units (au)': 1.495978707e11,
};

module('Convert distance', 'Converts between units of length.', [A.select('Input units', Object.keys(U), 'Metres (m)'), A.select('Output units', Object.keys(U), 'Kilometres (km)')],
  (t, a, b) => t.split(/\s+/).filter(Boolean).map(x => pyFloatRepr(Number(x) * U[a] / U[b])).join('\n'), { text: true });
