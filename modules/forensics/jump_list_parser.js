// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseJumpList } from './_windows.js';
module("Jump List Parser", "Input: Raw .automaticDestinations-ms or .customDestinations-ms file. Current implementation scans embedded LNK signature candidates, not full Compound File Binary/CustomDestinations or DestList parsing.", [], parseJumpList);
