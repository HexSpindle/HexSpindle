// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { decodeUserAssist } from './_windows.js';
module("UserAssist Decoder", "Input: Raw NTUSER.DAT hive (regf), or ROT13-encoded value-name text for a simple decode. Full user history requires the user hive; a single ROT13 string only decodes the name, not run count or last run.", [], decodeUserAssist);
