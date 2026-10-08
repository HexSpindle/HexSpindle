// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { pePackerHeuristics } from './_binary.js';
module("PE Packer Heuristics", "Input: Raw PE .exe, .dll or .sys bytes. Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison.", [], pePackerHeuristics);
