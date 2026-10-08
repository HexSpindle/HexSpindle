// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { peRichHeader } from './_binary.js';
module("PE Rich Header Parser", "Input: Raw PE .exe, .dll or .sys bytes. Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison.", [], peRichHeader);
