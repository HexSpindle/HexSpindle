import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Label', 'Mark a position in the recipe that Jump / Conditional Jump can go to.', [A.string('Name', '')], data => data, { flow: true });
