// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeEntra } from './_logs.js';
module("Azure/Entra Sign-in Log Analyzer", "Input: Entra sign-in JSON export. Sign-in visibility and retention depend on tenant/licensing.", [], analyzeEntra);
