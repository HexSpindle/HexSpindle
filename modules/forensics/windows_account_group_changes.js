// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { eventAccountChanges } from './_event_hunting.js';
module('Windows Account & Group Changes', 'Investigate account creation/deletion, password changes and security-group membership (Security 4720–4757). Provider-qualified.', [], eventAccountChanges);
