import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertUnits, unitOptions } from './_decimal.js';

const UNITS = [
  '[Metric]', 'Metres per second (m/s)', 'Kilometres per hour (km/h)', '[/Metric]', '[Imperial]',
  'Miles per hour (mph)', 'Knots (kn)', '[/Imperial]', '[Comparisons]', 'Human hair growth rate',
  'Bamboo growth rate', 'World\'s fastest snail', 'Usain Bolt\'s top speed', 'Jet airliner cruising speed',
  'Concorde', 'SR-71 Blackbird', 'Space Shuttle', 'International Space Station', '[/Comparisons]', '[Scientific]',
  'Sound in standard atmosphere', 'Sound in water', 'Lunar escape velocity', 'Earth escape velocity',
  'Earth\'s solar orbit', 'Solar system\'s Milky Way orbit', 'Milky Way relative to the cosmic microwave background',
  'Solar escape velocity', 'Neutron star escape velocity (0.3c)', 'Light in a diamond (0.4136c)',
  'Signal in an optical fibre (0.667c)', 'Light (c)', '[/Scientific]',
];
const FACTOR = {
  'Metres per second (m/s)': 1, 'Kilometres per hour (km/h)': 0.2778, 'Miles per hour (mph)': 0.44704,
  'Knots (kn)': 0.5144, 'Human hair growth rate': 4.8e-9, 'Bamboo growth rate': 0.000014,
  'World\'s fastest snail': 0.00275, 'Usain Bolt\'s top speed': 12.42, 'Jet airliner cruising speed': 250,
  'Concorde': 603, 'SR-71 Blackbird': 981, 'Space Shuttle': 1400, 'International Space Station': 7700,
  'Sound in standard atmosphere': 340.3, 'Sound in water': 1500, 'Lunar escape velocity': 2375,
  'Earth escape velocity': 11200, 'Earth\'s solar orbit': 29800, 'Solar system\'s Milky Way orbit': 200000,
  'Milky Way relative to the cosmic microwave background': 552000, 'Solar escape velocity': 617700,
  'Neutron star escape velocity (0.3c)': 100000000, 'Light in a diamond (0.4136c)': 124000000,
  'Signal in an optical fibre (0.667c)': 200000000, 'Light (c)': 299792458,
  'Feet per second (ft/s)': 0.3048, 'Mach (at sea level)': 340.29, 'Speed of light (c)': 299792458,
};

module('Convert speed', 'Converts a value from one unit of speed to another.',
  [A.select('Input units', unitOptions(UNITS)), A.select('Output units', unitOptions(UNITS))],
  (t, a, b) => convertUnits(t, FACTOR[a], FACTOR[b]), { text: true });
