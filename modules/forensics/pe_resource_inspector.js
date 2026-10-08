// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { peResources } from './_binary.js';
module("PE Resource Inspector", "Input: Raw PE .exe, .dll or .sys bytes. Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison.", [], peResources);
