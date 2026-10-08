// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { eventLogIntegrity } from './_event_hunting.js';
module('Windows Event Log Integrity Analyzer', 'Look for log clearing and audit-policy changes (Security 1102/4719 etc, EventLog 104) in decoded event XML/JSON. Provider-qualified matches.', [], eventLogIntegrity);
