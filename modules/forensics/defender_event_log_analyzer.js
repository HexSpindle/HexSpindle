// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeDefender } from './_logs.js';
module("Defender Event Log Analyzer", "Input: Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded. Known IDs: 1116/1117/5007. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter.", [], analyzeDefender);
