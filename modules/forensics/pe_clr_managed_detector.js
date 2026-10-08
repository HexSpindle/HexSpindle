// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { peClrInspector } from './_binary.js';
module('PE CLR Managed Detector', 'Inspect a raw Windows PE (.exe/.dll) for the CLR Runtime Directory. Native executables are normal and do not contain .NET metadata.', [], peClrInspector);
