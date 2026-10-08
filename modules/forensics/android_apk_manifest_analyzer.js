// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { apkManifest } from './_binary.js';
module("Android APK Manifest Analyzer", "Input: Raw APK ZIP. Binary AndroidManifest.xml differs from plain-text XML.", [], apkManifest);
