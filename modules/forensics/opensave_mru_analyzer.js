// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseOpenSaveMru } from './_windows.js';
module("OpenSave MRU Analyzer", "Input: Raw NTUSER.DAT registry hive (regf). Forensic string candidates are extracted from PIDL data, not full PIDL path reconstruction; raw hive is preferred.", [], parseOpenSaveMru);
