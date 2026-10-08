// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseRecycleBin } from './_windows.js';
module("Windows Recycle Bin Parser", "Input: Raw $I metadata binary file (NOT its $R content companion). Parses known $I format versions; a normal deleted-file $R is not an $I record.", [], parseRecycleBin);
