import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Subsection', 'Select part of the input with a regex and run the following operations (up to Merge) on only that part. With one or more capture groups, only the first group is operated on. An empty regex does nothing.',
  [A.regex('Section (regex)', ''), A.boolean('Case insensitive', false), A.boolean('Multiline', true), A.boolean('Dot matches all', false), A.boolean('Ignore errors', false), A.boolean('Global matching', true)],
  data => data, { flow: true });
