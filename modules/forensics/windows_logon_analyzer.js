// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeWindowsLogons } from './_logs.js';
module("Windows Logon Analyzer", "Input: Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded. Known IDs: 4624/4625/4634/4648/4776. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter.", [], analyzeWindowsLogons);
