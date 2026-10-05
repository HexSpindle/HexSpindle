import { module } from './_cat.js';

module('URL Decode', 'Decodes percent-encoded text (+ becomes space).', [],
  (t) => {
    const withSpaces = t.replace(/\+/g, ' ');
    try { return decodeURIComponent(withSpaces.replace(/%(?![0-9A-Fa-f]{2})/g, '%25')); }
    catch { return unescape(withSpaces); }
  }, { text: true });
