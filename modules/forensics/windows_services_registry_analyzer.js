// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeServicesRegistry } from './_windows.js';
module("Windows Services Registry Analyzer", "Input: Raw SYSTEM registry hive (regf). The parser expects a native SYSTEM hive, not an exported .reg file, JSON, or text. No transaction-log replay.", [], analyzeServicesRegistry);
