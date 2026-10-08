// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { peAuthenticodeImageHash } from './_authentihash.js';
module('PE Authenticode Image Hash (SHA256)','Raw Windows PE .exe or .dll; calculate the SHA-256 Authenticode image digest excluding checksum/security directory and terminal certificate. This does NOT verify an embedded CMS signature, certificate chain, timestamps, revocation or Windows trust policy.',[],async data=>JSON.stringify(await peAuthenticodeImageHash(data)));
