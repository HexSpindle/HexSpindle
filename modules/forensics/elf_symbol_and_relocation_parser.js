// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { elfSymbolsRelocations } from './_binary.js';
module("ELF Symbol and Relocation Parser", "Input: Raw ELF binary (.so, executable, .o). For stripped binaries, many symbol tables will be absent.", [], elfSymbolsRelocations);
