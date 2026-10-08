import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

// Defer the Markdown renderer until this operation is executed.
// Keep a single cached import across multiple recipes.
let markdownItPromise;
async function loadMarkdownIt() {
  if (!markdownItPromise) {
    markdownItPromise = import('./_markdownit.js').then(m => m.default).catch(err => {
      markdownItPromise = null; // Allow retry after a transient loading failure.
      throw err;
    });
  }
  return markdownItPromise;
}

module('Render Markdown', 'Renders Markdown as formatted HTML (CommonMark via markdown-it; raw HTML in the input is not rendered).',
  [A.boolean('Autoconvert URLs to links', false), A.boolean('Enable syntax highlighting', true), A.boolean('Open links in new tab.', false)],
  async (t, convertLinks, _highlight, openLinksBlank) => {
    const MarkdownIt = await loadMarkdownIt();
    const md = new MarkdownIt({ linkify: convertLinks, html: false, highlight: () => '' });
    if (openLinksBlank) {
      const defaultRender = md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        if (tokens[idx].attrIndex('target') < 0) tokens[idx].attrPush(['target', '_blank']);
        // Avoid exposing the opener when rendered links open another tab.
        const relIndex = tokens[idx].attrIndex('rel');
        if (relIndex < 0) tokens[idx].attrPush(['rel', 'noopener noreferrer']);
        else {
          const existing = tokens[idx].attrs[relIndex][1].split(/\s+/);
          tokens[idx].attrs[relIndex][1] = [...new Set([...existing, 'noopener', 'noreferrer'])].join(' ');
        }
        return defaultRender(tokens, idx, options, env, self);
      };
    }
    return new Html(`<div style="font-family: var(--primary-font-family)">${md.render(t)}</div>`);
  }, { text: true });
