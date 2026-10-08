// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { extractEmbeddedConfig } from './_binary.js';
module("Embedded Configuration Extractor", "Input: Script source or raw sample bytes. Heuristic analysis, not evidence of execution or maliciousness.", [], extractEmbeddedConfig);
