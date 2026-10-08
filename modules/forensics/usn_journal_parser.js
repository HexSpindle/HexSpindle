// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseUsn } from './_windows.js';
module("USN Journal Parser", "Input: Raw binary USN_RECORD_V2/V3 sequences (journal $J stream). Supports V2/V3 structures with limited validation; $Max metadata stream is not the $J event stream.", [], parseUsn);
