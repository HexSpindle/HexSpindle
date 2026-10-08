// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeChromiumExtensionManifest } from './_browser.js';
module("Chromium Extension Manifest Analyzer", "Input: Unpacked extension manifest.json. Permissions are indicators, not proof of malicious behavior.", [], analyzeChromiumExtensionManifest);
