// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseBamDam } from './_windows.js';
module("BAM/DAM Parser", "Input: Raw SYSTEM registry hive (regf). Reads BAM/DAM named values; empty results can reflect absent data or version differences. Prefer not to claim direct proof of execution without corroboration.", [], parseBamDam);
