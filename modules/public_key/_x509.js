import {
  parseOneDer, derUint, decodeOid, decodeAsn1Time, derSequence, derSet, derOid, derUtf8String,
  derPrintableString, derBoolean, derOctetString, derContextPrimitive, derInteger, bytesToHex,
} from './_asn1.js';
import { decodeUtf8 } from '../../core/util.js';
import { OID_NAMES, RFC4514_ABBR } from './_oids.js';

export function oidName(oid) { return OID_NAMES[oid] || oid; }

function rfc4514Escape(v) {
  let s = v.replace(/[,+"\\<>;]/g, c => '\\' + c);
  if (s.startsWith(' ')) s = '\\' + s;
  if (s.endsWith(' ') && !s.endsWith('\\ ')) s = s.slice(0, -1) + '\\ ';
  if (s.startsWith('#')) s = '\\' + s;
  return s;
}

export function nameToRfc4514(nameNode) {
  const rdns = nameNode.children.map(rdnSet => rdnSet.children.map(atv => {
    const oid = decodeOid(atv.children[0].value);
    const val = decodeUtf8(atv.children[1].value);
    return `${RFC4514_ABBR[oid] || oid}=${rfc4514Escape(val)}`;
  }).join('+'));
  return rdns.slice().reverse().join(',');
}

function parseAlgorithmIdentifier(node) {
  const oid = decodeOid(node.children[0].value);
  return { oid, name: oidName(oid) };
}

function parseExtensions(seqNode) {
  return seqNode.children.map(ext => {
    const oid = decodeOid(ext.children[0].value);
    let idx = 1, critical = false;
    if (ext.children[idx] && ext.children[idx].class === 0 && ext.children[idx].tag === 1) {
      critical = ext.children[idx].value[0] !== 0;
      idx++;
    }
    return { oid, name: oidName(oid), critical, valueOctets: ext.children[idx].value };
  });
}

export function formatExtensionValue(ext) {
  try {
    const inner = parseOneDer(ext.valueOctets, 0);
    switch (ext.oid) {
      case '2.5.29.19': { // basicConstraints
        const kids = inner.children;
        let ca = false, idx = 0, pathLen = null;
        if (kids[idx] && kids[idx].tag === 1 && kids[idx].class === 0) { ca = kids[idx].value[0] !== 0; idx++; }
        if (kids[idx] && kids[idx].tag === 2 && kids[idx].class === 0) pathLen = Number(derUint(kids[idx]));
        return `CA:${ca}, pathlen:${pathLen === null ? 'None' : pathLen}`;
      }
      case '2.5.29.17': // subjectAltName
        return inner.children.map(formatGeneralName).join(', ');
      case '2.5.29.15': { // keyUsage
        const bits = ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment', 'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly'];
        const bytes = inner.value.subarray(1);
        const set = [];
        for (let i = 0; i < bits.length; i++) {
          const byteIdx = i >> 3, bitPos = 7 - (i & 7);
          if (bytes[byteIdx] !== undefined && (bytes[byteIdx] >> bitPos) & 1) set.push(bits[i]);
        }
        return set.join(', ');
      }
      case '2.5.29.37': // extKeyUsage
        return inner.children.map(o => oidName(decodeOid(o.value))).join(', ');
      case '2.5.29.14': // subjectKeyIdentifier
        return bytesToHex(inner.value);
      case '2.5.29.35': // authorityKeyIdentifier
        return inner.children.map(c => (c.class === 2 && c.tag === 0) ? `keyid:${bytesToHex(c.value)}` : bytesToHex(c.raw)).join(', ');
      default:
        return bytesToHex(ext.valueOctets);
    }
  } catch {
    return bytesToHex(ext.valueOctets);
  }
}

function formatGeneralName(gn) {
  if (gn.class !== 2) return bytesToHex(gn.raw);
  if (gn.tag === 1) return `email:${decodeUtf8(gn.value)}`;
  if (gn.tag === 2) return `DNS:${decodeUtf8(gn.value)}`;
  if (gn.tag === 6) return `URI:${decodeUtf8(gn.value)}`;
  if (gn.tag === 7) return `IP:${[...gn.value].join('.')}`;
  return `[${gn.tag}]:${bytesToHex(gn.value)}`;
}


export function parseTbsCertificate(tbs) {
  const c = tbs.children;
  let i = 0, version = 0;
  if (c[i].class === 2 && c[i].tag === 0) { version = Number(derUint(c[i].children[0])); i++; }
  const serial = derUint(c[i++]);
  const sigAlgo = parseAlgorithmIdentifier(c[i++]);
  const issuer = c[i++];
  const validity = c[i++];
  const notBefore = decodeAsn1Time(validity.children[0]);
  const notAfter = decodeAsn1Time(validity.children[1]);
  const subject = c[i++];
  const spkiNode = c[i++];
  let extensions = [];
  for (; i < c.length; i++) {
    if (c[i].class === 2 && c[i].tag === 3) extensions = parseExtensions(c[i].children[0]);
  }
  return { version, serial, sigAlgo, issuer, notBefore, notAfter, subject, spkiNode, spkiRaw: spkiNode.raw, extensions };
}

export function parseX509(der) {
  const top = parseOneDer(der);
  const [tbsNode, sigAlgoNode, sigNode] = top.children;
  const tbs = parseTbsCertificate(tbsNode);
  const sigAlgo = parseAlgorithmIdentifier(sigAlgoNode);
  return { tbs, tbsRaw: tbsNode.raw, sigAlgo, signature: sigNode.value.subarray(1), raw: der };
}


export function parseCsr(der) {
  const top = parseOneDer(der);
  const [infoNode, sigAlgoNode, sigNode] = top.children;
  const [versionNode, subjectNode, spkiNode, attrsNode] = infoNode.children;
  let extensions = [];
  if (attrsNode) {
    for (const attr of attrsNode.children) {
      const oid = decodeOid(attr.children[0].value);
      if (oid === '1.2.840.113549.1.9.14') { // extensionRequest
        const extSeq = attr.children[1].children[0];
        extensions = parseExtensions(extSeq);
      }
    }
  }
  const sigAlgo = parseAlgorithmIdentifier(sigAlgoNode);
  return {
    version: Number(derUint(versionNode)), subject: subjectNode, spkiNode, spkiRaw: spkiNode.raw,
    extensions, sigAlgo, signature: sigNode.value.subarray(1), infoRaw: infoNode.raw,
  };
}


export function parseCrl(der) {
  const top = parseOneDer(der);
  const [tbsNode] = top.children;
  const c = tbsNode.children;
  let i = 0, version = 0;
  if (c[i].class === 0 && c[i].tag === 2) { version = Number(derUint(c[i])); i++; }
  const sigAlgo = parseAlgorithmIdentifier(c[i++]);
  const issuer = c[i++];
  const thisUpdate = decodeAsn1Time(c[i++]);
  let nextUpdate = null;
  if (c[i] && c[i].class === 0 && (c[i].tag === 23 || c[i].tag === 24)) { nextUpdate = decodeAsn1Time(c[i]); i++; }
  let revoked = [];
  if (c[i] && c[i].class === 0 && c[i].tag === 16) {
    revoked = c[i].children.map(r => ({ serial: derUint(r.children[0]), revocationDate: decodeAsn1Time(r.children[1]) }));
  }
  return { version, sigAlgo, issuer, thisUpdate, nextUpdate, revoked };
}

export function buildName(attrs) {
  const rdns = attrs.map(a => derSet([derSequence([derOid(a.oid), a.printable ? derPrintableString(a.value) : derUtf8String(a.value)])]));
  return derSequence(rdns);
}

export function buildExtensionTLV(oid, critical, valueOctets) {
  const parts = [derOid(oid)];
  if (critical) parts.push(derBoolean(true));
  parts.push(derOctetString(valueOctets));
  return derSequence(parts);
}

export function buildSanValue(dnsNames) {
  return derSequence(dnsNames.map(n => derContextPrimitive(2, new TextEncoder().encode(n))));
}

export function buildBasicConstraintsValue(ca, pathLen) {
  const parts = [];
  if (ca) parts.push(derBoolean(true));
  if (pathLen !== null && pathLen !== undefined) parts.push(derInteger(pathLen));
  return derSequence(parts);
}
