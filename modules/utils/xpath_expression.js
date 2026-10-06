import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';
import { xmldomToString } from './_xmldom_serialize.js';

function stripDefaultNs(src) {
  let prev;
  do { prev = src; src = src.replace(/(<[A-Za-z_][^<>]*?)\s+xmlns\s*=\s*("[^"]*"|'[^']*')/g, '$1'); } while (src !== prev);
  return src;
}

function pathOf(node) {
  const path = [];
  for (let n = node; n.parentNode; n = n.parentNode) path.unshift([...n.parentNode.childNodes].indexOf(n));
  return path;
}

function nodeAt(doc, path) { return path.reduce((n, i) => n && n.childNodes[i], doc); }

function mapNode(node, real) {
  if (node.nodeType === 2) {
    const owner = nodeAt(real, pathOf(node.ownerElement));
    return owner && owner.getAttributeNode(node.name);
  }
  return node.nodeType === 9 ? real : nodeAt(real, pathOf(node));
}

module('XPath expression', 'Evaluates an XPath expression against XML/HTML input.', [A.string('XPath', ''), A.string('Result delimiter', '\\n')],
  (t, xp, d) => {
    let doc = new DOMParser().parseFromString(t, 'application/xml');
    let evalDoc = doc, isXml = true;
    if (doc.querySelector('parsererror')) { doc = evalDoc = new DOMParser().parseFromString(t, 'text/html'); isXml = false; }
    else {
      const stripped = new DOMParser().parseFromString(stripDefaultNs(t), 'application/xml');
      if (!stripped.querySelector('parsererror')) evalDoc = stripped;
    }
    // Prefixes resolve against the declarations on the document element, like the xpath package.
    const root = doc.documentElement;
    let unresolved = null;
    const resolver = (prefix) => {
      if (prefix === 'xml') return 'http://www.w3.org/XML/1998/namespace';
      const uri = root && root.getAttribute('xmlns:' + prefix);
      if (uri == null) unresolved = prefix;
      return uri;
    };
    let result;
    try { result = evalDoc.evaluate(xp, evalDoc, resolver, XPathResult.ANY_TYPE, null); }
    catch (e) { throw new Error(`Invalid XPath. Details:\n${unresolved ? 'Cannot resolve QName ' + unresolved : e.message}.`); }
    const sep = delim(d);
    if (result.resultType === XPathResult.NUMBER_TYPE) return String(result.numberValue);
    if (result.resultType === XPathResult.STRING_TYPE) return result.stringValue;
    if (result.resultType === XPathResult.BOOLEAN_TYPE) return String(result.booleanValue);
    const out = [];
    for (let node = result.iterateNext(); node; node = result.iterateNext()) {
      const real = evalDoc === doc ? node : mapNode(node, doc) || node;
      out.push(xmldomToString(real, { plain: !isXml }));
    }
    return out.join(sep);
  }, { text: true });
