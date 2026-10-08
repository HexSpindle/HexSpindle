// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeLinuxAuth } from './_logs.js';
module("Linux Auth Log Analyzer", "Input: Text sshd/auth log. Rotated/compressed logs should be expanded before input.", [], analyzeLinuxAuth);
