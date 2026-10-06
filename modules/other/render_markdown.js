import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import MarkdownIt from './_markdownit.js';

module('Render Markdown', 'Renders Markdown as formatted HTML (CommonMark via markdown-it; raw HTML in the input is not rendered).',
  [A.boolean('Autoconvert URLs to links', false), A.boolean('Enable syntax highlighting', true), A.boolean('Open links in new tab.', false)],
  (t, convertLinks, _highlight, openLinksBlank) => {
    const md = new MarkdownIt({ linkify: convertLinks, html: false, highlight: () => '' });
    if (openLinksBlank) {
      const defaultRender = md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        if (tokens[idx].attrIndex('target') < 0) tokens[idx].attrPush(['target', '_blank']);
        return defaultRender(tokens, idx, options, env, self);
      };
    }
    return new Html(`<div style="font-family: var(--primary-font-family)">${md.render(t)}</div>`);
  }, { text: true });
