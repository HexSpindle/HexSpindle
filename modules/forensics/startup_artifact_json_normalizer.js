// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseStartupArtifactsJson } from './_browser.js';
module("Startup Artifact JSON Normalizer", "Input: JSON array of previously extracted startup records. Normalization/correlation input is structured data, not a raw registry hive.", [], parseStartupArtifactsJson);
