// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { dotnetMetadata } from './_binary.js';
module(".NET Assembly Metadata Parser", "Input: Raw managed .NET PE assembly (.exe/.dll) with CLR metadata (not any native PE). Requires CLR metadata directory; native Windows EXEs are not valid .NET assemblies. Obfuscated/mixed-mode assemblies can require specialist tooling.", [], dotnetMetadata);
