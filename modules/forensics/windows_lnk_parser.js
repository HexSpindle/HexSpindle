// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseLnk } from './_windows.js';
module("Windows LNK Parser", "Input: Raw Shell Link (.lnk) file bytes. Reports main header, links and some string data; not every shell item or extradata block is decoded.", [], parseLnk);
