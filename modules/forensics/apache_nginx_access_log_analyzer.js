// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseWebAccess } from './_logs.js';
module("Apache/Nginx Access Log Analyzer", "Input: Text access.log combined/common format. Custom LogFormat may not parse correctly.", [], parseWebAccess);
