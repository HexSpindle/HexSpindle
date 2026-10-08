// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeMacUnifiedJson } from './_logs.js';
module("macOS Unified Log JSON Analyzer", "Input: macOS unified log structured JSON (not raw .tracev3). Direct raw .tracev3 chunk decoding is NOT supported in this operation.", [], analyzeMacUnifiedJson);
