// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { eventLogFilter } from './_event_hunting.js';
module('Windows Event Log Filter', 'Filter decoded Windows event XML/JSON by decimal EventID and provider substring. Output is a JSON event array suitable for chaining.', [A.string('Event IDs (comma-separated)',''),A.string('Provider contains',''),A.number('Maximum results',1000,1)], eventLogFilter);
