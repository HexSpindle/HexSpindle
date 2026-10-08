// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseRecentDocs } from './_windows.js';
module("RecentDocs Analyzer", "Input: Raw NTUSER.DAT registry hive (regf). The implementation reads native registry key values; exported JSON or .reg are not supported.", [], parseRecentDocs);
