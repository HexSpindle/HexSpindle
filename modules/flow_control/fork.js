import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Fork', 'Split the input on a delimiter and run the following operations (up to Merge) on each piece.',
  [A.string('Split delimiter', '\\n'), A.string('Merge delimiter', '\\n'), A.boolean('Ignore errors', false)],
  data => data, { flow: true });
