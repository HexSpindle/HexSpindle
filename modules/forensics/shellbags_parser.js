// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseShellBags } from './_windows.js';
module("ShellBags Parser", "Input: Raw UsrClass.dat registry hive (regf); older Windows may store comparable keys in NTUSER.DAT. Current output is recovered candidate strings, not a complete shell item ID-list decoder or definitive folder access timeline.", [], parseShellBags);
