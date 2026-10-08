// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseAmcache } from './_windows.js';
module("Amcache Parser", "Input: Raw Amcache.hve registry hive (regf). Does not replay transaction logs; key schema differs by Windows version. Amcache entries are not definitive proof of execution.", [], parseAmcache);
