import { parseSeq, parseOneDer, derUint, decodeOid, derSequence, derInteger, derOid, derNull, derBitString, derOctetString } from './_asn1.js';
import { findPem, findAllPem } from './_pem.js';
import { bigIntToBytes } from './_bignum.js';
import { concatBytes } from '../../core/util.js';
import { OID_NAMES, EC_CURVE_OID_TO_WEBCRYPTO, WEBCRYPTO_CURVE_TO_OID } from './_oids.js';

export const OID = {
  rsaEncryption: '1.2.840.113549.1.1.1', ecPublicKey: '1.2.840.10045.2.1', dsa: '1.2.840.10040.4.1',
  ed25519: '1.3.101.112', ed448: '1.3.101.113', x25519: '1.3.101.110', x448: '1.3.101.111',
  pbes2: '1.2.840.113549.1.5.13', pbkdf2: '1.2.840.113549.1.5.12',
};

export function keyKindFromOid(oid) {
  if (oid === OID.rsaEncryption) return 'RSA';
  if (oid === OID.ecPublicKey) return 'EC';
  if (oid === OID.dsa) return 'DSA';
  if (oid === OID.ed25519) return 'Ed25519';
  if (oid === OID.ed448) return 'Ed448';
  if (oid === OID.x25519) return 'X25519';
  if (oid === OID.x448) return 'X448';
  return null;
}

export function splitSpki(der) {
  const [algoSeq, bits] = parseOneDer(der).children;
  const [oidNode, paramsNode] = algoSeq.children;
  const oid = decodeOid(oidNode.value);
  const unused = bits.value[0];
  const keyBits = bits.value.subarray(1);
  return { oid, paramsNode, keyBits, unused };
}

export function splitPkcs8(der) {
  const top = parseOneDer(der).children;
  const [versionNode, algoSeq, keyOctets] = top;
  const [oidNode, paramsNode] = algoSeq.children;
  const oid = decodeOid(oidNode.value);
  return { oid, paramsNode, keyOctets: keyOctets.value };
}

export function isEncryptedPkcs8(der) {
  const top = parseOneDer(der).children;
  return top.length >= 2 && !(top[0].class === 0 && top[0].tag === 2);
}

export function ecCurveFromParams(paramsNode) {
  const oid = decodeOid(paramsNode.value);
  const curve = EC_CURVE_OID_TO_WEBCRYPTO[oid];
  if (!curve) throw new Error(`Unsupported EC curve OID: ${oid}`);
  return curve;
}


const PRF_HASH = {
  '1.2.840.113549.2.7': 'SHA-1', '1.2.840.113549.2.9': 'SHA-256',
  '1.2.840.113549.2.10': 'SHA-384', '1.2.840.113549.2.11': 'SHA-512',
};
const AES_CBC_OID = { '2.16.840.1.101.3.4.1.2': 128, '2.16.840.1.101.3.4.1.22': 192, '2.16.840.1.101.3.4.1.42': 256 };

export async function decryptPkcs8(der, password) {
  if (!password) throw new Error('This is an encrypted private key: a password is required');
  const [encAlgo, encryptedOctets] = parseOneDer(der).children;
  const [schemeOidNode, schemeParams] = encAlgo.children;
  const schemeOid = decodeOid(schemeOidNode.value);
  if (schemeOid !== OID.pbes2) throw new Error(`Unsupported private-key encryption scheme: ${OID_NAMES[schemeOid] || schemeOid} (only PBES2 is supported)`);
  const [kdfAlgo, encSchemeAlgo] = schemeParams.children;
  const kdfOid = decodeOid(kdfAlgo.children[0].value);
  if (kdfOid !== OID.pbkdf2) throw new Error(`Unsupported key-derivation function: ${OID_NAMES[kdfOid] || kdfOid} (only PBKDF2 is supported)`);
  const kdfParams = kdfAlgo.children[1].children;
  const salt = kdfParams[0].value;
  const iterations = Number(derUint(kdfParams[1]));
  let prfHash = 'SHA-1', idx = 2;
  if (kdfParams[idx] && kdfParams[idx].tag === 2 && kdfParams[idx].class === 0) idx++; // optional keyLength
  if (kdfParams[idx]) prfHash = PRF_HASH[decodeOid(kdfParams[idx].children[0].value)] || 'SHA-1';

  const encSchemeOid = decodeOid(encSchemeAlgo.children[0].value);
  const keyBits = AES_CBC_OID[encSchemeOid];
  if (!keyBits) throw new Error(`Unsupported private-key encryption cipher: ${OID_NAMES[encSchemeOid] || encSchemeOid} (only AES-CBC is supported)`);
  const iv = encSchemeAlgo.children[1].value;

  const pwKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: prfHash }, pwKey, { name: 'AES-CBC', length: keyBits }, false, ['decrypt']);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, aesKey, encryptedOctets.value);
    return new Uint8Array(plain);
  } catch (e) {
    throw new Error('Could not decrypt the private key (wrong password?)');
  }
}

export function traditionalToPkcs8(label, der) {
  const top = parseOneDer(der);
  if (label === 'RSA PRIVATE KEY') {
    return derSequence([derInteger(0), derSequence([derOid(OID.rsaEncryption), derNull()]), derOctetString(der)]);
  }
  if (label === 'EC PRIVATE KEY') {

    const params = top.children.find((c) => c.class === 2 && c.tag === 0);
    if (!params) throw new Error('EC private key has no curve parameters');
    const inner = derSequence(top.children.filter((c) => !(c.class === 2 && c.tag === 0)).map((c) => c.raw));
    return derSequence([derInteger(0), derSequence([derOid(OID.ecPublicKey), params.children[0].raw]), derOctetString(inner)]);
  }
  if (label === 'DSA PRIVATE KEY') {
    const [, p, q, g, , x] = top.children.map(derUint);
    return buildDsaPkcs8Der(p, q, g, x);
  }
  throw new Error(`Unsupported private key type: ${label}`);
}

export async function loadKeyInfo(pem, password) {
  const block = findAllPem(pem).find(b => /PRIVATE KEY/.test(b.label)) || findPem(pem);
  if (!block) throw new Error('No PEM key found');
  let { label, der } = block;
  if (/PRIVATE KEY/.test(label) && /ENCRYPTED/.test(label)) {
    der = await decryptPkcs8(der, password);
    label = 'PRIVATE KEY';
  }
  if (/^(RSA|EC|DSA) PRIVATE KEY$/.test(label)) {
    if (/Proc-Type:\s*4,\s*ENCRYPTED/.test(pem)) throw new Error(`Legacy OpenSSL-encrypted "${label}" PEM is not supported - convert it to PKCS#8 first (openssl pkcs8 -topk8)`);
    der = traditionalToPkcs8(label, der);
    label = 'PRIVATE KEY';
  }
  if (/PRIVATE KEY/.test(label)) {
    if (isEncryptedPkcs8(der)) { der = await decryptPkcs8(der, password); }
    const { oid } = splitPkcs8(der);
    const kind = keyKindFromOid(oid);
    if (!kind) throw new Error(`Unsupported private key algorithm OID: ${oid}`);
    return { type: 'private', kind, der };
  }
  if (/PUBLIC KEY/.test(label)) {
    const { oid } = splitSpki(der);
    const kind = keyKindFromOid(oid);
    if (!kind) throw new Error(`Unsupported public key algorithm OID: ${oid}`);
    return { type: 'public', kind, der };
  }
  if (/CERTIFICATE/.test(label)) {
    const { parseX509 } = await import('./_x509.js');
    const cert = parseX509(der);
    const spkiDer = cert.tbs.spkiRaw;
    const { oid } = splitSpki(spkiDer);
    const kind = keyKindFromOid(oid);
    if (!kind) throw new Error(`Unsupported public key algorithm OID: ${oid}`);
    return { type: 'public', kind, der: spkiDer };
  }
  throw new Error('No PEM key found');
}

export function rsaPublicNumbersFromSpkiDer(der) {
  const { oid, keyBits } = splitSpki(der);
  if (oid !== OID.rsaEncryption) throw new Error('Not an RSA public key');
  const [nNode, eNode] = parseOneDer(keyBits).children;
  return { n: derUint(nNode), e: derUint(eNode) };
}

export function rsaPrivateNumbersFromPkcs8Der(der) {
  const { oid, keyOctets } = splitPkcs8(der);
  if (oid !== OID.rsaEncryption) throw new Error('Not an RSA private key');
  const fields = parseOneDer(keyOctets).children;
  return { n: derUint(fields[1]), e: derUint(fields[2]), d: derUint(fields[3]) };
}

export function dsaPublicNumbersFromSpkiDer(der) {
  const { oid, paramsNode, keyBits } = splitSpki(der);
  if (oid !== OID.dsa) throw new Error('Not a DSA public key');
  const [p, q, g] = paramsNode.children.map(derUint);
  const y = derUint(parseSeq(keyBits)[0]);
  return { p, q, g, y };
}

export function dsaPrivateNumbersFromPkcs8Der(der) {
  const { oid, paramsNode, keyOctets } = splitPkcs8(der);
  if (oid !== OID.dsa) throw new Error('Not a DSA private key');
  const [p, q, g] = paramsNode.children.map(derUint);
  const x = derUint(parseSeq(keyOctets)[0]);
  return { p, q, g, x };
}

export function buildDsaSpkiDer(p, q, g, y) {
  const algo = derSequence([derOid(OID.dsa), derSequence([derInteger(p), derInteger(q), derInteger(g)])]);
  const yDer = derInteger(y);
  return derSequence([algo, derBitString(yDer, 0)]);
}

export function buildDsaPkcs8Der(p, q, g, x) {
  const algo = derSequence([derOid(OID.dsa), derSequence([derInteger(p), derInteger(q), derInteger(g)])]);
  const xDer = derInteger(x);
  return derSequence([derInteger(0), algo, derOctetString(xDer)]);
}

export function derSignatureToRaw(der, fieldLen) {
  const [rNode, sNode] = parseOneDer(der).children;
  return concatBytes([bigIntToBytes(derUint(rNode), fieldLen), bigIntToBytes(derUint(sNode), fieldLen)]);
}
export function rawSignatureToDer(raw) {
  const half = raw.length / 2;
  const r = derUint({ value: raw.subarray(0, half) });
  const s = derUint({ value: raw.subarray(half) });
  return derSequence([derInteger(r), derInteger(s)]);
}

export async function dsaVerifyRaw(p, q, g, y, hashName, data, r, s) {
  const { modExp, modInverse, bytesToBigInt } = await import('./_bignum.js');
  if (r <= 0n || r >= q || s <= 0n || s >= q) return false;
  const digest = new Uint8Array(await crypto.subtle.digest(hashName, data));
  const nBytes = Math.ceil(q.toString(2).length / 8);
  const truncated = digest.length <= nBytes ? digest : digest.subarray(0, nBytes);
  const z = bytesToBigInt(truncated);
  const w = modInverse(s, q);
  const u1 = (z * w) % q, u2 = (r * w) % q;
  const v = ((modExp(g, u1, p) * modExp(y, u2, p)) % p) % q;
  return v === r;
}

const SIG_ALGO_INFO = {
  '1.2.840.113549.1.1.5': { kind: 'RSA', hash: 'SHA-1' }, '1.2.840.113549.1.1.11': { kind: 'RSA', hash: 'SHA-256' },
  '1.2.840.113549.1.1.12': { kind: 'RSA', hash: 'SHA-384' }, '1.2.840.113549.1.1.13': { kind: 'RSA', hash: 'SHA-512' },
  '1.2.840.10045.4.1': { kind: 'ECDSA', hash: 'SHA-1' }, '1.2.840.10045.4.3.2': { kind: 'ECDSA', hash: 'SHA-256' },
  '1.2.840.10045.4.3.3': { kind: 'ECDSA', hash: 'SHA-384' }, '1.2.840.10045.4.3.4': { kind: 'ECDSA', hash: 'SHA-512' },
  '1.3.101.112': { kind: 'Ed25519' }, '1.3.101.113': { kind: 'Ed448' },
  '1.2.840.10040.4.3': { kind: 'DSA', hash: 'SHA-1' }, '2.16.840.1.101.3.4.3.2': { kind: 'DSA', hash: 'SHA-256' },
};
const EC_FIELD_BYTES = { 'P-256': 32, 'P-384': 48, 'P-521': 66 };

export async function verifyX509Signature(spkiDer, sigAlgoOid, signedData, signature) {
  const info = SIG_ALGO_INFO[sigAlgoOid];
  if (!info) throw new Error(`Unsupported signature algorithm for verification: ${OID_NAMES[sigAlgoOid] || sigAlgoOid}`);
  if (info.kind === 'RSA') {
    const key = await crypto.subtle.importKey('spki', spkiDer, { name: 'RSASSA-PKCS1-v1_5', hash: info.hash }, false, ['verify']);
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signedData);
  }
  if (info.kind === 'ECDSA') {
    const { paramsNode } = splitSpki(spkiDer);
    const curve = ecCurveFromParams(paramsNode);
    const key = await crypto.subtle.importKey('spki', spkiDer, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
    const raw = derSignatureToRaw(signature, EC_FIELD_BYTES[curve]);
    return crypto.subtle.verify({ name: 'ECDSA', hash: info.hash }, key, raw, signedData);
  }
  if (info.kind === 'Ed25519' || info.kind === 'Ed448') {
    const key = await crypto.subtle.importKey('spki', spkiDer, { name: info.kind }, false, ['verify']);
    return crypto.subtle.verify(info.kind, key, signature, signedData);
  }
  if (info.kind === 'DSA') {
    const { p, q, g, y } = dsaPublicNumbersFromSpkiDer(spkiDer);
    const [rNode, sNode] = parseOneDer(signature).children;
    return dsaVerifyRaw(p, q, g, y, info.hash, signedData, derUint(rNode), derUint(sNode));
  }
  return false;
}

const CURVE448_PRIV_LEN = { Ed448: 57, X448: 56 };
let noble448;
export function loadCurve448() {
  if (!noble448) noble448 = import('./_noble_curve448.mjs');
  return noble448;
}
export const isCurve448 = (kind) => kind === 'Ed448' || kind === 'X448';

export function curve448RawPrivate(kind, der) {
  const raw = parseOneDer(splitPkcs8(der).keyOctets).value;
  if (!raw || raw.length !== CURVE448_PRIV_LEN[kind]) throw new Error(`Invalid ${kind} private key length`);
  return raw;
}
export function curve448RawPublic(kind, der) {
  const raw = splitSpki(der).keyBits;
  if (raw.length !== CURVE448_PRIV_LEN[kind]) throw new Error(`Invalid ${kind} public key length`);
  return raw;
}
export function buildCurve448SpkiDer(kind, pub) {
  return derSequence([derSequence([derOid(OID[kind.toLowerCase()])]), derBitString(pub)]);
}
export function buildCurve448Pkcs8Der(kind, priv) {
  return derSequence([derInteger(0), derSequence([derOid(OID[kind.toLowerCase()])]), derOctetString(derOctetString(priv))]);
}
export async function curve448Lib(kind) {
  const m = await loadCurve448();
  return kind === 'Ed448' ? m.ed448 : m.x448;
}
export async function curve448SpkiFromPkcs8(kind, der) {
  const lib = await curve448Lib(kind);
  return buildCurve448SpkiDer(kind, lib.getPublicKey(curve448RawPrivate(kind, der)));
}
export async function generateCurve448(kind) {
  const lib = await curve448Lib(kind);
  const priv = lib.utils.randomSecretKey();
  return { spki: buildCurve448SpkiDer(kind, lib.getPublicKey(priv)), pkcs8: buildCurve448Pkcs8Der(kind, priv) };
}
