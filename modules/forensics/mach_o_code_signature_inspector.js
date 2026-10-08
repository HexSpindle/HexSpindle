// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { machoCodeSignature } from './_binary.js';
module("Mach-O Code Signature Inspector", "Input: Raw Mach-O executable or dylib. Inspecting signature blob is not complete code-signing verification.", [], machoCodeSignature);
