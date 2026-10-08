// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeCloudTrail } from './_logs.js';
module("AWS CloudTrail Analyzer", "Input: CloudTrail Records JSON or JSONL. CloudTrail JSON commonly has an outer Records array.", [], analyzeCloudTrail);
