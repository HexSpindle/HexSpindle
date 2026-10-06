import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Merge', 'Ends a Fork or Subsection block. With "Merge All" ticked it closes every open block at once; untick it to close only the nearest one.',
  [A.boolean('Merge All', true)], data => data, { flow: true });
