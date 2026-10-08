// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { normalizeSysmon } from './_logs.js';
module("Sysmon Event Normalizer", "Input: Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded. Known IDs: Sysmon 1,3,7,11,22, etc.. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter.", [], normalizeSysmon);
