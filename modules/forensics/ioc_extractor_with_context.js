// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { extractIocContext } from './_logs.js';
module("IOC Extractor with Context", "Input: Plain text or JSON of observables. Normalize carefully: do not lose evidence of original obfuscation.", [], extractIocContext);
