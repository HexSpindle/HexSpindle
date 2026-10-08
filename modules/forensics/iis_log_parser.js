// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseIis } from './_logs.js';
module("IIS Log Parser", "Input: Plain text W3C IIS log. Check field order in header; not every IIS configuration logs identical columns.", [], parseIis);
