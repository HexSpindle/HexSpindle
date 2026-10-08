// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseShimCache } from './_windows.js';
module("ShimCache Parser", "Input: Raw SYSTEM registry hive (regf). ShimCache layout depends on OS version; parser currently extracts path-like strings, not fully decoded per-build entries or execution timestamps.", [], parseShimCache);
