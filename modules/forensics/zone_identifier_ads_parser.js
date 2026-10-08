// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseZoneIdentifier } from './_windows.js';
module("Zone.Identifier ADS Parser", "Input: Text content of the Zone.Identifier named NTFS alternate data stream (not the parent file). Some downloads lack MOTW/Zone.Identifier; absence does not imply local provenance.", [], parseZoneIdentifier);
