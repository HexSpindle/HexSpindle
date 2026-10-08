// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { eventLogSummary } from './_event_hunting.js';
module('Windows Event Log Summary', 'Summarize decoded EVTX/XML/JSON by provider, EventID, and UTC time range. Put EVTX to JSON before this operation. No inferred maliciousness.', [], eventLogSummary);
