// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { evaluateSigmaSubset } from './_logs.js';
module("Sigma Rule Evaluator (Subset)", "Input: Sigma-like rule plus normalized events (see operation scope). Supports only a subset of Sigma: not production rule-engine parity.", [], evaluateSigmaSubset);
