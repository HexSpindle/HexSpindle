// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeRunKeys } from './_windows.js';
module("Run Key Analyzer", "Input: Raw SOFTWARE hive (machine Run keys) OR raw NTUSER.DAT (per-user Run keys). Reads Run/RunOnce values from a native regf hive. Text/JSON exports are NOT accepted by the current implementation; HKCU and HKLM need separate runs.", [], analyzeRunKeys);
