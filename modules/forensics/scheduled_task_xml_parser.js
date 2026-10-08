// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseScheduledTaskXml } from './_logs.js';
module("Scheduled Task XML Parser", "Input: Raw task XML text. Import XML content, not the running .exe.", [], parseScheduledTaskXml);
