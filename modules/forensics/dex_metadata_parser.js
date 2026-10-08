// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { dexMetadata } from './_binary.js';
module("DEX Metadata Parser", "Input: Raw classes.dex. Import DEX bytes, not the parent APK.", [], dexMetadata);
