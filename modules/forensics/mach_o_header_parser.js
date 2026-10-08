// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { machoHeaderInspect } from './_binary.js';
module("Mach-O Header Parser", "Input: Raw Mach-O executable or dylib. Inspecting signature blob is not complete code-signing verification.", [], machoHeaderInspect);
