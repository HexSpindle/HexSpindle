// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseRegistryHive } from './_windows.js';
module("Windows Registry Hive Inspector", "Input: Raw base registry hive (regf), not .reg text or individual exported keys. Traversal of base hive only; deleted-cell recovery, transaction-log replay, and forensic key interpretation are out of scope.", [], parseRegistryHive);
