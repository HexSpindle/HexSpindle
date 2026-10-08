// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { reassemblePowerShell4104 } from './_logs.js';
module("PowerShell Script Block Analyzer", "Input: Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded. Known IDs: 4104. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter.", [], reassemblePowerShell4104);
