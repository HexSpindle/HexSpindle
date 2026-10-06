/** A port of parts of jsrsasign's X509 / X509CRL / CSRUtil (MIT, Copyright (c) Kenji Urushima). */
import {
  getChildIdx, getIdxbyList, getTLV, getTLVbyList, getV, getVbyList, getVidx,
  getIdxbyListEx, getX500Name, getTLVbyListEx, getVbyListEx, hextorstr, hextoutf8, hextoip, oid2name, oidname, oidHexToInt,
} from './_asn1hex.js';

export function getAlgorithmIdentifierName(tlv) { return oidname(getVbyListEx(tlv, 0, [0], '06')); }

/* ---- GeneralName / GeneralNames ---- */
export function getGeneralName(tlv) {
  const tag = tlv.substr(0, 2);
  const v = getV(tlv, 0);
  const s = hextorstr(v);
  if (tag === '81') return { rfc822: s };
  if (tag === '82') return { dns: s };
  if (tag === '86') return { uri: s };
  if (tag === '87') return { ip: hextoip(v) };
  if (tag === 'a4') return { dn: getX500Name(v) };
  if (tag === 'a0') return { other: getOtherName(tlv) };
  return undefined;
}
export function getGeneralNames(tlv) {
  return getChildIdx(tlv, 0).map(i => getGeneralName(getTLV(tlv, i))).filter(x => x !== undefined);
}
function getOtherName(tlv) {
  const kids = getChildIdx(tlv, 0);
  return { oid: oidname(getVbyList(tlv, kids[0], [], '06')), value: { utf8str: { str: hextoutf8(getVbyList(tlv, kids[1], [])) } } };
}

/* ---- Extension value parsers (X509.getExt*) ---- */
export const KEYUSAGE_NAME = ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment',
  'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly'];

export function getExtBasicConstraints(hExtV, critical) {
  const o = { extname: 'basicConstraints' };
  if (critical) o.critical = true;
  if (hExtV === '3000') return o;
  if (hExtV === '30030101ff') { o.cA = true; return o; }
  if (hExtV.substr(0, 12) === '30060101ff02') { o.cA = true; o.pathLen = parseInt(getV(hExtV, 10), 16); return o; }
  throw new Error('hExtV parse error: ' + hExtV);
}
export function getExtKeyUsageBin(hExtV) {
  if (hExtV.length !== 8 && hExtV.length !== 10) throw new Error('malformed key usage value: ' + hExtV);
  let b = '000000000000000' + parseInt(hExtV.substr(6), 16).toString(2);
  b = hExtV.length === 8 ? b.slice(-8) : b.slice(-16);
  b = b.replace(/0+$/, '');
  return b === '' ? '0' : b;
}
export function getExtKeyUsageString(hExtV) {
  const bits = getExtKeyUsageBin(hExtV);
  const names = [];
  for (let i = 0; i < bits.length; i++) if (bits.substr(i, 1) === '1') names.push(KEYUSAGE_NAME[i]);
  return names.join(',');
}
export function getExtKeyUsage(hExtV, critical) {
  const o = { extname: 'keyUsage' };
  if (critical) o.critical = true;
  o.names = getExtKeyUsageString(hExtV).split(',');
  return o;
}
export function getExtSubjectKeyIdentifier(hExtV, critical) {
  const o = { extname: 'subjectKeyIdentifier' };
  if (critical) o.critical = true;
  o.kid = { hex: getV(hExtV, 0) };
  return o;
}
export function getExtAuthorityKeyIdentifier(hExtV, critical) {
  const o = { extname: 'authorityKeyIdentifier' };
  if (critical) o.critical = true;
  for (const i of getChildIdx(hExtV, 0)) {
    const tag = hExtV.substr(i, 2);
    if (tag === '80') o.kid = { hex: getV(hExtV, i) };
    if (tag === 'a1') o.issuer = getGeneralNames(getTLV(hExtV, i))[0].dn;
    if (tag === '82') o.sn = { hex: getV(hExtV, i) };
  }
  return o;
}
export function getExtExtKeyUsage(hExtV, critical) {
  const o = { extname: 'extKeyUsage', array: [] };
  if (critical) o.critical = true;
  for (const i of getChildIdx(hExtV, 0)) o.array.push(oidname(getV(hExtV, i)));
  return o;
}
export function getExtSubjectAltName(hExtV, critical) {
  const o = { extname: 'subjectAltName', array: getGeneralNames(hExtV) };
  if (critical) o.critical = true;
  return o;
}
export function getExtIssuerAltName(hExtV, critical) {
  const o = { extname: 'issuerAltName', array: getGeneralNames(hExtV) };
  if (critical) o.critical = true;
  return o;
}
export function getExtCRLDistributionPoints(hExtV, critical) {
  const o = { extname: 'cRLDistributionPoints', array: [] };
  if (critical) o.critical = true;
  for (const i of getChildIdx(hExtV, 0)) {
    const dp = getTLV(hExtV, i);
    const entry = {};
    for (const j of getChildIdx(dp, 0)) {
      if (dp.substr(j, 2) === 'a0') {
        const dpn = getTLV(dp, j);
        const name = {};
        for (const k of getChildIdx(dpn, 0)) if (dpn.substr(k, 2) === 'a0') name.full = getGeneralNames(getTLV(dpn, k));
        entry.dpname = name;
      }
    }
    o.array.push(entry);
  }
  return o;
}
export function getExtAuthorityInfoAccess(hExtV, critical) {
  const o = { extname: 'authorityInfoAccess', array: [] };
  if (critical) o.critical = true;
  for (const i of getChildIdx(hExtV, 0)) {
    const method = getVbyListEx(hExtV, i, [0], '06');
    const value = hextoutf8(getVbyList(hExtV, i, [1], '86'));
    if (method === '2b06010505073001') o.array.push({ ocsp: value });
    else if (method === '2b06010505073002') o.array.push({ caissuer: value });
    else throw new Error('unknown method: ' + method);
  }
  return o;
}
export function getExtCertificatePolicies(hExtV, critical) {
  const o = { extname: 'certificatePolicies', array: [] };
  if (critical) o.critical = true;
  for (const i of getChildIdx(hExtV, 0)) {
    const pi = getTLV(hExtV, i);
    const info = { policyoid: oidname(getVbyList(pi, 0, [0], '06')) };
    const qIdx = getIdxbyListEx(pi, 0, [1]);
    if (qIdx !== -1) {
      info.array = [];
      for (const j of getChildIdx(pi, qIdx)) {
        const q = getTLV(pi, j);
        const oid = getVbyList(q, 0, [0], '06');
        if (oid === '2b06010505070201') info.array.push({ cps: hextorstr(getVbyList(q, 0, [1], '16')) });
      }
    }
    o.array.push(info);
  }
  return o;
}
export function getExtCRLNumber(hExtV, critical) {
  const o = { extname: 'cRLNumber' };
  if (critical) o.critical = true;
  if (hExtV.substr(0, 2) === '02') { o.num = { hex: getV(hExtV, 0) }; return o; }
  throw new Error('hExtV parse error: ' + hExtV);
}
export function getExtCRLReason(hExtV, critical) {
  const o = { extname: 'cRLReason' };
  if (critical) o.critical = true;
  if (hExtV.substr(0, 2) === '0a') { o.code = parseInt(getV(hExtV, 0), 16); return o; }
  throw new Error('hExtV parse error: ' + hExtV);
}

function parseLite(tlv) {
  const tag = tlv.substr(0, 2);
  if (tag === '06') return { oid: oidHexToInt(getV(tlv, 0)) };
  if (tag === '18') return { gentime: { str: hextorstr(getV(tlv, 0)) } };
  if (tag === '17') return { utctime: { str: hextorstr(getV(tlv, 0)) } };
  return { hex: tlv };
}

const EXT_BY_OID = {
  '2.5.29.14': getExtSubjectKeyIdentifier, '2.5.29.15': getExtKeyUsage, '2.5.29.17': getExtSubjectAltName,
  '2.5.29.18': getExtIssuerAltName, '2.5.29.19': getExtBasicConstraints, '2.5.29.31': getExtCRLDistributionPoints,
  '2.5.29.32': getExtCertificatePolicies, '2.5.29.35': getExtAuthorityKeyIdentifier, '2.5.29.37': getExtExtKeyUsage,
  '1.3.6.1.5.5.7.1.1': getExtAuthorityInfoAccess, '2.5.29.20': getExtCRLNumber, '2.5.29.21': getExtCRLReason,
};

export function getExtParam(tlv) {
  const kids = getChildIdx(tlv, 0);
  if (kids.length !== 2 && kids.length !== 3) throw new Error(`wrong number elements in Extension: ${kids.length} ${tlv}`);
  const oid = oidHexToInt(getVbyList(tlv, 0, [0], '06'));
  const critical = kids.length === 3 && getTLVbyList(tlv, 0, [1]) === '0101ff';
  const hExtV = getTLVbyList(tlv, 0, [kids.length - 1, 0]);
  const parser = EXT_BY_OID[oid];
  if (parser) {
    const r = parser(hExtV, critical);
    if (r !== undefined) return r;
  }
  const o = { extname: oid, extn: parseLite(hExtV) };
  if (critical) o.critical = true;
  return o;
}
/** X509.getExtParamArray: the SEQUENCE OF Extension TLV -> array of parameter objects. */
export function getExtParamArray(seqTlv) {
  return getChildIdx(seqTlv, 0).map(i => getExtParam(getTLV(seqTlv, i)));
}

/* ---- Public keys out of a SubjectPublicKeyInfo ---- */
export const EC_CURVES = {
  '1.2.840.10045.3.1.7': { name: 'secp256r1', nist: 'P-256', keylen: 256 },
  '1.3.132.0.34': { name: 'secp384r1', nist: 'P-384', keylen: 384 },
  '1.3.132.0.35': { name: 'secp521r1', nist: 'P-521', keylen: 521 },
  '1.3.132.0.10': { name: 'secp256k1', nist: '', keylen: 256 },
};

function hexToBigInt(h) { return h === '' ? 0n : BigInt('0x' + h); }
export function bitLength(h) { const n = hexToBigInt(h); return n === 0n ? 0 : n.toString(2).length; }
/** BigInteger.toString(16) of a positive integer: no leading zero byte. */
export function posHex(h) { const n = hexToBigInt(h); return n === 0n ? '0' : n.toString(16); }

export function getPublicKeyFromSPKI(spki) {
  const algoOid = oidHexToInt(getVbyList(spki, 0, [0, 0], '06'));
  const keyHex = getVbyList(spki, 0, [1], '03', true);
  if (algoOid === '1.2.840.113549.1.1.1') {
    const kids = getChildIdx(keyHex, 0);
    return { type: 'RSA', nHex: getV(keyHex, kids[0]), eHex: getV(keyHex, kids[1]) };
  }
  if (algoOid === '1.2.840.10045.2.1') {
    const curveOid = oidHexToInt(getVbyList(spki, 0, [0, 1], '06'));
    const info = EC_CURVES[curveOid];
    if (!info) throw new Error('unsupported curve: ' + curveOid);
    return { type: 'EC', curveName: info.name, nistName: info.nist, keylen: info.keylen, pubKeyHex: keyHex };
  }
  if (algoOid === '1.2.840.10040.4.1') {
    const p = getChildIdx(spki, 0)[0];
    const params = getIdxbyList(spki, 0, [0, 1]);
    const pk = getChildIdx(spki, params);
    void p;
    return {
      type: 'DSA', pHex: getV(spki, pk[0]), qHex: getV(spki, pk[1]), gHex: getV(spki, pk[2]),
      yHex: getV(keyHex, 0),
    };
  }
  throw new Error('unsupported public key algorithm: ' + algoOid);
}

/* ---- X509 (certificate) ---- */
export class CcX509 {
  constructor(hex) {
    this.hex = hex;
    this.foffset = 0;
    this.version = this.getVersion();
    this.aExtInfo = null;
    try { if (getIdxbyList(this.hex, 0, [0, 7], 'a3') !== -1) this.parseExt(); } catch { /* no extensions */ }
  }

  getVersion() {
    const a = getTLVbyList(this.hex, 0, [0, 0]);
    if (a.substr(0, 2) === 'a0') {
      const b = getTLVbyList(a, 0, [0]);
      const n = parseInt(getV(b, 0), 16);
      if (n < 0 || n > 2) throw new Error('malformed version field');
      return n + 1;
    }
    this.foffset = -1;
    return 1;
  }
  getSerialNumberHex() { return getVbyListEx(this.hex, 0, [0, 0], '02'); }
  getSignatureAlgorithmField() { return getAlgorithmIdentifierName(getTLVbyListEx(this.hex, 0, [0, 1])); }
  getIssuerHex() { return getTLVbyList(this.hex, 0, [0, 3 + this.foffset], '30'); }
  getSubjectHex() { return getTLVbyList(this.hex, 0, [0, 5 + this.foffset], '30'); }
  getIssuer() { return getX500Name(this.getIssuerHex()); }
  getSubject() { return getX500Name(this.getSubjectHex()); }
  getNotBefore() { return hextorstr(getVbyList(this.hex, 0, [0, 4 + this.foffset, 0])); }
  getNotAfter() { return hextorstr(getVbyList(this.hex, 0, [0, 4 + this.foffset, 1])); }
  getSPKI() { return getTLVbyList(this.hex, 0, [0, 6 + this.foffset], '30'); }
  getPublicKey() { return getPublicKeyFromSPKI(this.getSPKI()); }
  getSignatureAlgorithmName() { return getAlgorithmIdentifierName(getTLVbyList(this.hex, 0, [1], '30')); }
  getSignatureValueHex() { return getVbyList(this.hex, 0, [2], '03', true); }

  parseExt() {
    if (this.version !== 3) return -1;
    const base = getIdxbyList(this.hex, 0, [0, 7, 0], '30');
    const idxs = getChildIdx(this.hex, base);
    this.aExtInfo = [];
    for (const i of idxs) {
      const kids = getChildIdx(this.hex, i);
      const info = { critical: false };
      let off = 0;
      if (kids.length === 3) { info.critical = true; off = 1; }
      info.oid = oidHexToInt(getVbyList(this.hex, i, [0], '06'));
      info.vidx = getVidx(this.hex, getIdxbyList(this.hex, i, [1 + off]));
      this.aExtInfo.push(info);
    }
    return undefined;
  }

  getInfoExtensions() {
    if (this.aExtInfo === undefined || this.aExtInfo === null) return null;
    const sanLines = (ext) => {
      let s = '';
      for (const v of ext.array) {
        if (v.dn !== undefined) s += '    dn: ' + v.dn.str + '\n';
        if (v.ip !== undefined) s += '    ip: ' + v.ip + '\n';
        if (v.rfc822 !== undefined) s += '    rfc822: ' + v.rfc822 + '\n';
        if (v.dns !== undefined) s += '    dns: ' + v.dns + '\n';
        if (v.uri !== undefined) s += '    uri: ' + v.uri + '\n';
        if (v.other !== undefined) s += '    other: ' + v.other.oid + '=' + JSON.stringify(v.other.value).replace(/"/g, '') + '\n';
      }
      return s.replace(/\n$/, '');
    };
    let out = '';
    for (const info of this.aExtInfo) {
      const hExtV = getTLV(this.hex, info.vidx);
      let name = oid2name(info.oid);
      if (name === '') name = info.oid;
      out += '  ' + name + ' ' + (info.critical === true ? 'CRITICAL' : '') + ':\n';
      if (name === 'basicConstraints') {
        const bc = getExtBasicConstraints(hExtV, info.critical);
        if (bc.cA === undefined) out += '    {}\n';
        else out += '    cA=true' + (bc.pathLen !== undefined ? ', pathLen=' + bc.pathLen : '') + '\n';
      } else if (name === 'keyUsage') {
        out += '    ' + getExtKeyUsageString(hExtV) + '\n';
      } else if (name === 'subjectKeyIdentifier') {
        out += '    ' + getExtSubjectKeyIdentifier(hExtV, info.critical).kid.hex + '\n';
      } else if (name === 'authorityKeyIdentifier') {
        const akid = getExtAuthorityKeyIdentifier(hExtV, info.critical);
        if (akid.kid !== undefined) out += '    kid=' + akid.kid.hex + '\n';
      } else if (name === 'extKeyUsage') {
        out += '    ' + getExtExtKeyUsage(hExtV, info.critical).array.join(', ') + '\n';
      } else if (name === 'subjectAltName') {
        out += sanLines(getExtSubjectAltName(hExtV, info.critical)) + '\n';
      } else if (name === 'cRLDistributionPoints') {
        for (const dp of getExtCRLDistributionPoints(hExtV, info.critical).array) {
          try { if (dp.dpname.full[0].uri !== undefined) out += '    ' + dp.dpname.full[0].uri + '\n'; } catch { /* no URI */ }
        }
      } else if (name === 'authorityInfoAccess') {
        for (const a of getExtAuthorityInfoAccess(hExtV, info.critical).array) {
          if (a.caissuer !== undefined) out += '    caissuer: ' + a.caissuer + '\n';
          if (a.ocsp !== undefined) out += '    ocsp: ' + a.ocsp + '\n';
        }
      } else if (name === 'certificatePolicies') {
        for (const p of getExtCertificatePolicies(hExtV, info.critical).array) {
          out += '    policy oid: ' + p.policyoid + '\n';
          if (p.array !== undefined) for (const q of p.array) if (q.cps !== undefined) out += '    cps: ' + q.cps + '\n';
        }
      }
    }
    return out;
  }
}

/* ---- X509CRL ---- */
export class CcX509CRL {
  constructor(hex) {
    this.hex = hex;
    const firstIdx = getIdxbyList(this.hex, 0, [0, 0]);
    const first = this.hex.substr(firstIdx, 2);
    if (first === '02') this.posSigAlg = 1;
    else if (first === '30') this.posSigAlg = 0;
    else throw new Error('malformed 1st item of TBSCertList: ' + first);
    const updIdx = getIdxbyList(this.hex, 0, [0, this.posSigAlg + 3]);
    const upd = this.hex.substr(updIdx, 2);
    if (upd === '17' || upd === '18') {
      const nextIdx = getIdxbyList(this.hex, 0, [0, this.posSigAlg + 4]);
      this.posRevCert = null;
      if (nextIdx !== -1 && this.hex.substr(nextIdx, 2) === '30') this.posRevCert = this.posSigAlg + 4;
    } else if (upd === '30') this.posRevCert = this.posSigAlg + 3;
    else if (upd === 'a0') this.posRevCert = null;
    else throw new Error('malformed nextUpdate or revCert tag: ' + upd);
  }

  getVersion() { return this.posSigAlg === 0 ? null : parseInt(getVbyList(this.hex, 0, [0, 0], '02'), 16) + 1; }
  getSignatureAlgorithmField() { return getAlgorithmIdentifierName(getTLVbyList(this.hex, 0, [0, this.posSigAlg], '30')); }
  getIssuer() { return getX500Name(getTLVbyList(this.hex, 0, [0, this.posSigAlg + 1], '30')); }
  getThisUpdate() { return hextorstr(getVbyList(this.hex, 0, [0, this.posSigAlg + 2])); }
  getNextUpdate() {
    const i = getIdxbyList(this.hex, 0, [0, this.posSigAlg + 3]);
    const tag = this.hex.substr(i, 2);
    if (tag !== '17' && tag !== '18') return null;
    return hextorstr(getV(this.hex, i));
  }
  getRevCertArray() {
    if (this.posRevCert === null) return null;
    const base = getIdxbyList(this.hex, 0, [0, this.posRevCert]);
    return getChildIdx(this.hex, base).map(i => {
      const tlv = getTLV(this.hex, i);
      const kids = getChildIdx(tlv, 0);
      const o = { sn: { hex: getVbyList(tlv, 0, [0], '02') }, date: hextorstr(getVbyList(tlv, 0, [1])) };
      if (kids.length === 3) o.ext = getExtParamArray(getTLVbyList(tlv, 0, [2]));
      return o;
    });
  }
  /** getParam().ext: the crlExtensions, taken from the [0]-tagged element of TBSCertList. */
  getExtensions() {
    const tbs = getIdxbyList(this.hex, 0, [0]);
    for (const i of getChildIdx(this.hex, tbs)) {
      if (this.hex.substr(i, 2) !== 'a0') continue;
      return getExtParamArray(getTLVbyList(this.hex, i, [0], '30'));
    }
    return undefined;
  }
  getSignatureValueHex() { return getVbyList(this.hex, 0, [2], '03', true); }
}
