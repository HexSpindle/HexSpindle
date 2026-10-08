// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { elfNotesBuildId } from './_binary.js';
module("ELF Notes and Build-ID Extractor", "Input: Raw ELF binary (.so, executable, .o). For stripped binaries, many symbol tables will be absent.", [], elfNotesBuildId);
