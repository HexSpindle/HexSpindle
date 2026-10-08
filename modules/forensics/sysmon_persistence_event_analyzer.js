// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { eventSysmonPersistence } from './_event_hunting.js';
module('Sysmon Persistence Event Analyzer', 'Extract Sysmon Registry 12–14 and WMI 19–21 event metadata from decoded XML/JSON; no verdicts.', [], eventSysmonPersistence);
