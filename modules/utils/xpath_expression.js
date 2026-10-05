import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

module('XPath expression', 'Evaluates an XPath expression against XML/HTML input.', [A.string('XPath', ''), A.string('Result delimiter', '\\n')],
  (t, xp, d) => {
    let doc = new DOMParser().parseFromString(t, 'application/xml');
    if (doc.querySelector('parsererror')) doc = new DOMParser().parseFromString(t, 'text/html');
    const result = doc.evaluate(xp, doc, null, XPathResult.ANY_TYPE, null);
    const sep = delim(d);
    if (result.resultType === XPathResult.NUMBER_TYPE) return String(result.numberValue);
    if (result.resultType === XPathResult.STRING_TYPE) return result.stringValue;
    if (result.resultType === XPathResult.BOOLEAN_TYPE) return String(result.booleanValue);
    const out = [];
    let node = result.iterateNext();
    while (node) {
      out.push(node.nodeType === 1 ? new XMLSerializer().serializeToString(node) : String(node.nodeValue ?? node.textContent ?? ''));
      node = result.iterateNext();
    }
    return out.join(sep);
  }, { text: true });
