// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeSuspiciousScript } from './_binary.js';
module("Suspicious Script Analyzer", "Input: Script source or raw sample bytes. Heuristic analysis, not evidence of execution or maliciousness.", [], analyzeSuspiciousScript);
