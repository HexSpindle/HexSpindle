// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { dedupeIocs } from './_logs.js';
module("IOC Deduplicator and Normalizer", "Input: Plain text or JSON of observables. Normalize carefully: do not lose evidence of original obfuscation.", [], dedupeIocs);
