// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeKerberos } from './_logs.js';
module("Kerberos Event Analyzer", "Input: Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded. Known IDs: 4768/4769/4771. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter.", [], analyzeKerberos);
