// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeFirefoxExtensions } from './_browser.js';
module("Firefox Extensions Analyzer", "Input: Firefox profile extensions.json (JSON metadata file). Expected top-level addons/extensions list. An individual WebExtension manifest.json is not accepted as equivalent without conversion.", [], analyzeFirefoxExtensions);
