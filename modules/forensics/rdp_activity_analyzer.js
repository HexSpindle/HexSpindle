// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeRdp } from './_logs.js';
module("RDP Activity Analyzer", "Input: Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded. Known IDs: 1149/21/22/24/25 and 4624 type 10. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter.", [], analyzeRdp);
