// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { peAuthenticode } from './_binary.js';
module("PE Authenticode Inspector", "Input: Raw PE .exe, .dll or .sys bytes. Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison.", [], peAuthenticode);
