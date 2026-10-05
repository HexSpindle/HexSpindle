import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { detect } from '../../core/filetypes.js';
import { base64Encode } from '../../core/util.js';

module('Play Media', 'Plays the input as audio or video in the output pane.', [A.select('Type', ['Auto', 'Audio', 'Video'])],
  (data, kind) => {
    const found = detect(data).map(([, , m]) => m).find(m => m.startsWith('audio/') || m.startsWith('video/'));
    const mime = found || 'audio/mpeg';
    const tag = kind === 'Video' || (kind === 'Auto' && mime.startsWith('video/')) ? 'video' : 'audio';
    return new Html(`<${tag} controls style="max-width:100%" src="data:${mime};base64,${base64Encode(data)}"></${tag}>`);
  });
