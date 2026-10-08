// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeM365 } from './_logs.js';
module("Microsoft 365 Audit Log Analyzer", "Input: Unified Audit Log JSON/CSV export. Permissions, retention and tenant settings affect available events.", [], analyzeM365);
