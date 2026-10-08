// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { detectServiceInstalls } from './_logs.js';
module("Windows Service Installation Detector", "Input: Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded. Known IDs: 7045/4697. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter.", [], detectServiceInstalls);
