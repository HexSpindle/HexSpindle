// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { correlateStartup } from './_windows.js';
module("Startup Artifact Correlator", "Input: JSON array of previously extracted startup records. Normalization/correlation input is structured data, not a raw registry hive.", [], correlateStartup);
