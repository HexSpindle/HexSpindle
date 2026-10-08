// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeChromiumPreferences } from './_browser.js';
module("Chromium Preferences Analyzer", "Input: Chrome/Edge Preferences JSON file. Sensitive profile preferences should be processed offline.", [], analyzeChromiumPreferences);
