import { module } from './_cat.js';

module('Remove Diacritics', 'Strips accents from letters (é → e).', [], (t) => t.normalize('NFD').replace(/\p{Mn}/gu, ''), { text: true });
