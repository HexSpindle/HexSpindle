// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeCloudTrail } from './_logs.js';
module("AWS CloudTrail Analyzer", 'Read-only DFIR evidence analysis; inspect source-specific limitations before drawing conclusions.', [], analyzeCloudTrail);
