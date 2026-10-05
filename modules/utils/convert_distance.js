import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertUnits, unitOptions } from './_decimal.js';

const UNITS = [
  '[Metric]', 'Nanometres (nm)', 'Micrometres (µm)', 'Millimetres (mm)', 'Centimetres (cm)', 'Metres (m)',
  'Kilometers (km)', '[/Metric]', '[Imperial]', 'Thou (th)', 'Inches (in)', 'Feet (ft)', 'Yards (yd)', 'Chains (ch)',
  'Furlongs (fur)', 'Miles (mi)', 'Leagues (lea)', '[/Imperial]', '[Maritime]', 'Fathoms (ftm)', 'Cables',
  'Nautical miles', '[/Maritime]', '[Comparisons]', 'Cars (4m)', 'Buses (8.4m)', 'American football fields (91m)',
  'Football pitches (105m)', '[/Comparisons]', '[Astronomical]', 'Earth-to-Moons', 'Earth\'s equators',
  'Astronomical units (au)', 'Light-years (ly)', 'Parsecs (pc)', '[/Astronomical]',
];
const FACTOR = {
  'Nanometres (nm)': 1e-9, 'Micrometres (µm)': 0.000001, 'Millimetres (mm)': 0.001, 'Centimetres (cm)': 0.01,
  'Metres (m)': 1, 'Kilometers (km)': 1000, 'Thou (th)': 0.0000254, 'Inches (in)': 0.0254, 'Feet (ft)': 0.3048,
  'Yards (yd)': 0.9144, 'Chains (ch)': 20.1168, 'Furlongs (fur)': 201.168, 'Miles (mi)': 1609.344,
  'Leagues (lea)': 4828.032, 'Fathoms (ftm)': 1.853184, 'Cables': 185.3184, 'Nautical miles': 1853.184,
  'Cars (4m)': 4, 'Buses (8.4m)': 8.4, 'American football fields (91m)': 91, 'Football pitches (105m)': 105,
  'Earth-to-Moons': 380000000, 'Earth\'s equators': 40075016.686, 'Astronomical units (au)': 149597870700,
  'Light-years (ly)': 9460730472580800, 'Parsecs (pc)': 30856776000000000,
  'Kilometres (km)': 1000, 'Nautical miles (nmi)': 1852,
};

module('Convert distance', 'Converts a value from one unit of length to another.',
  [A.select('Input units', unitOptions(UNITS)), A.select('Output units', unitOptions(UNITS))],
  (t, a, b) => convertUnits(t, FACTOR[a], FACTOR[b]), { text: true });
