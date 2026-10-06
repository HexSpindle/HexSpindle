// XML serialiser following @xmldom/xmldom (MIT).
const XMLNS = 'http://www.w3.org/2000/xmlns/';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const XHTML = 'http://www.w3.org/1999/xhtml';

const enc = c => c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&#' + c.charCodeAt(0) + ';';
const attrText = (name, value) => ' ' + name + '="' + value.replace(/[<>&"\t\n\r]/g, enc) + '"';

function needNamespaceDefine(node, visible) {
  const prefix = node.prefix || '';
  const uri = node.namespaceURI;
  if (!uri) return false;
  if ((prefix === 'xml' && uri === XML_NS) || uri === XMLNS) return false;
  for (let i = visible.length - 1; i >= 0; i--) if (visible[i].prefix === prefix) return visible[i].namespace !== uri;
  return true;
}

function lookupPrefix(node, uri) {
  for (let el = node.nodeType === 1 ? node : node.parentNode; el && el.nodeType === 1; el = el.parentNode)
    for (const a of el.attributes) if (a.prefix === 'xmlns' && a.value === uri) return a.localName;
  return null;
}

function walk(n, buf, ns, html, plain) {
  switch (n.nodeType) {
    case 1: {
      const attrs = [...n.attributes];
      const uri = plain ? null : n.namespaceURI;
      const nodeName = plain ? n.localName : n.tagName;
      html = (!plain && uri === XHTML) || html;
      let prefixed = nodeName;
      if (!html && !n.prefix && uri) {
        let defaultNS;
        const own = attrs.find(a => a.name === 'xmlns');
        if (own) defaultNS = own.value;
        if (!defaultNS) for (let i = ns.length - 1; i >= 0; i--) if (ns[i].prefix === '' && ns[i].namespace === uri) { defaultNS = uri; break; }
        if (defaultNS !== uri) for (let i = ns.length - 1; i >= 0; i--) if (ns[i].namespace === uri) { if (ns[i].prefix) prefixed = ns[i].prefix + ':' + nodeName; break; }
      }
      buf.push('<', prefixed);
      const childNs = ns.slice();
      for (const a of attrs) {
        if (a.prefix === 'xmlns') childNs.push({ prefix: a.localName, namespace: a.value });
        else if (a.name === 'xmlns') childNs.push({ prefix: '', namespace: a.value });
      }
      for (const a of attrs) {
        if (!plain && needNamespaceDefine(a, childNs)) {
          const p = a.prefix || '';
          buf.push(attrText(p ? 'xmlns:' + p : 'xmlns', a.namespaceURI));
          childNs.push({ prefix: p, namespace: a.namespaceURI });
        }
        buf.push(attrText(plain ? a.localName : a.name, a.value));
      }
      if (!plain && nodeName === prefixed && needNamespaceDefine(n, childNs)) {
        const p = n.prefix || '';
        buf.push(attrText(p ? 'xmlns:' + p : 'xmlns', uri));
        childNs.push({ prefix: p, namespace: uri });
      }
      const kids = n.nodeName === 'TEMPLATE' && n.content ? n.content.childNodes : n.childNodes;
      if (kids.length || (html && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName))) {
        buf.push('>');
        if (html && /^script$/i.test(nodeName)) {
          for (const k of kids) { if (k.data) buf.push(k.data); else walk(k, buf, childNs.slice(), html, plain); }
        } else {
          for (const k of kids) walk(k, buf, childNs, html, plain);
        }
        buf.push('</', prefixed, '>');
      } else {
        buf.push('/>');
      }
      return;
    }
    case 9: case 11:
      for (const k of n.childNodes) walk(k, buf, ns.slice(), html, plain);
      return;
    case 2: buf.push(attrText(plain ? n.localName : n.name, n.value)); return;
    case 3: buf.push(n.data.replace(/[<&>]/g, enc)); return;
    case 4: buf.push('<![CDATA[', n.data.replace(/]]>/g, ']]]]><![CDATA[>'), ']]>'); return;
    case 8: buf.push('<!--', n.data, '-->'); return;
    case 7: buf.push('<?', n.target, ' ', n.data, '?>'); return;
    case 10: {
      buf.push('<!DOCTYPE ', n.name);
      if (n.publicId) { buf.push(' PUBLIC ', n.publicId); if (n.systemId && n.systemId !== '.') buf.push(' ', n.systemId); buf.push('>'); }
      else if (n.systemId && n.systemId !== '.') buf.push(' SYSTEM ', n.systemId, '>');
      else buf.push('>');
      return;
    }
    default: return;
  }
}

export function xmldomToString(node, { plain = false } = {}) {
  const buf = [];
  const ref = node.nodeType === 9 && node.documentElement || node;
  let visible = [];
  if (!plain && ref.namespaceURI && ref.prefix == null && lookupPrefix(ref, ref.namespaceURI) == null)
    visible = [{ namespace: ref.namespaceURI, prefix: null }];
  walk(node, buf, visible, false, plain);
  return buf.join('');
}
