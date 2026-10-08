// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { peImportHash } from './_binary.js';
module("PE Import Hash (imphash)", "Input: Raw portable executable bytes (.exe/.dll/.sys), not a textual import listing. PE import table functions parsed from binary; ordinal-only imports and uncommon bound imports need independent comparison.", [], peImportHash);
