// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { eventProcessExecution } from './_event_hunting.js';
module('Windows Process Execution Events', 'Correlate Windows Security 4688 and Sysmon process creation/termination (1/5) with provider-qualified metadata.', [], eventProcessExecution);
