import { ECC_TABLE, FORMAT_INFO, VERSION_INFO, EC_BITS, GF_EXP, GF_LOG, gfMul, MASK_FUNCS, buildFunctionPatterns, zigzagPositions } from './_qr.js';
import { decodeUtf8 } from '../../core/util.js';

function toGrayscale(data, width, height) {
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < gray.length; i += 4, p++) gray[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  return gray;
}

function otsuThreshold(gray) {
  const hist = new Array(256).fill(0);
  for (const g of gray) hist[g]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = -1, threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > maxVar) { maxVar = varBetween; threshold = t; }
  }
  return threshold;
}

function binarize(rgba, width, height) {
  const gray = toGrayscale(rgba, width, height);
  const t = otsuThreshold(gray);
  const bits = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) bits[i] = gray[i] <= t ? 1 : 0;
  return bits;
}

function runLengthEncode(isDark, width, height, axis, fixed) {
  const len = axis === 'row' ? width : height;
  const at = p => axis === 'row' ? isDark[fixed * width + p] : isDark[p * width + fixed];
  const runs = [];
  let color = at(0), start = 0;
  for (let p = 1; p <= len; p++) {
    const c = p < len ? at(p) : -1;
    if (c !== color) { runs.push({ color, start, length: p - start }); color = c; start = p; }
  }
  return runs;
}

function checkRatio(runs, k) {
  if (runs[k].color !== 1) return null;
  const c = [runs[k].length, runs[k + 1].length, runs[k + 2].length, runs[k + 3].length, runs[k + 4].length];
  const total = c[0] + c[1] + c[2] + c[3] + c[4];
  if (total < 7) return null;
  const module = total / 7;
  const tol = module * 0.5;
  if (Math.abs(c[0] - module) > tol) return null;
  if (Math.abs(c[1] - module) > tol) return null;
  if (Math.abs(c[2] - 3 * module) > 3 * tol) return null;
  if (Math.abs(c[3] - module) > tol) return null;
  if (Math.abs(c[4] - module) > tol) return null;
  const center = runs[k].start + c[0] + c[1] + c[2] / 2;
  return { center, moduleSize: module };
}

function findCandidatesAlongLine(isDark, width, height, axis, fixed) {
  const runs = runLengthEncode(isDark, width, height, axis, fixed);
  const out = [];
  for (let k = 0; k + 4 < runs.length; k++) {
    const r = checkRatio(runs, k);
    if (r) out.push(r);
  }
  return out;
}

function clusterCandidates(points) {
  const clusters = [];
  for (const p of points) {
    let hit = null;
    for (const c of clusters) {
      if (Math.hypot(c.x / c.n - p.x, c.y / c.n - p.y) < Math.max(p.moduleSize, 2)) { hit = c; break; }
    }
    if (hit) { hit.x += p.x; hit.y += p.y; hit.m += p.moduleSize; hit.n++; } else clusters.push({ x: p.x, y: p.y, m: p.moduleSize, n: 1 });
  }
  return clusters.map(c => ({ x: c.x / c.n, y: c.y / c.n, moduleSize: c.m / c.n, count: c.n })).sort((a, b) => b.count - a.count);
}

function findFinderPatterns(isDark, width, height) {
  const hits = [];
  for (let y = 0; y < height; y++) {
    for (const cand of findCandidatesAlongLine(isDark, width, height, 'row', y)) {
      const vert = findCandidatesAlongLine(isDark, width, height, 'col', Math.round(cand.center));
      const v = vert.find(v2 => Math.abs(v2.center - y) < cand.moduleSize * 2);
      if (v) hits.push({ x: cand.center, y: v.center, moduleSize: (cand.moduleSize + v.moduleSize) / 2 });
    }
  }
  if (hits.length < 3) throw new Error('Could not locate the three QR finder patterns in the image.');
  const clusters = clusterCandidates(hits);
  if (clusters.length < 3) throw new Error('Could not locate three distinct QR finder patterns in the image.');
  const [a, b, c] = clusters.slice(0, 3);
  const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const dab = d(a, b), dbc = d(b, c), dca = d(c, a);
  let topLeft, p1, p2;
  if (dab >= dbc && dab >= dca) { topLeft = c; p1 = a; p2 = b; }
  else if (dbc >= dab && dbc >= dca) { topLeft = a; p1 = b; p2 = c; }
  else { topLeft = b; p1 = c; p2 = a; }
  const cross = (p1.x - topLeft.x) * (p2.y - topLeft.y) - (p1.y - topLeft.y) * (p2.x - topLeft.x);
  const topRight = cross > 0 ? p1 : p2;
  const bottomLeft = cross > 0 ? p2 : p1;
  const moduleSize = (topLeft.moduleSize + topRight.moduleSize + bottomLeft.moduleSize) / 3;
  return { topLeft, topRight, bottomLeft, moduleSize };
}

function nearestValidVersion(moduleCountEstimate) {
  let v = Math.round((moduleCountEstimate - 17) / 4);
  if (v < 1) v = 1;
  if (v > 40) v = 40;
  return v;
}

function sampleGrid(isDark, width, height, finder) {
  const { topLeft, topRight, bottomLeft, moduleSize } = finder;
  const pixelDist = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const moduleCountEstimate = Math.round(pixelDist / moduleSize) + 7;
  const version = nearestValidVersion(moduleCountEstimate);
  const size = version * 4 + 17;
  const span = size - 7;
  const ux = (topRight.x - topLeft.x) / span, uy = (topRight.y - topLeft.y) / span;
  const vx = (bottomLeft.x - topLeft.x) / span, vy = (bottomLeft.y - topLeft.y) / span;
  const toPixel = (mx, my) => ({
    x: topLeft.x + (mx - 3) * ux + (my - 3) * vx,
    y: topLeft.y + (mx - 3) * uy + (my - 3) * vy,
  });
  const matrix = Array.from({ length: size }, () => new Uint8Array(size));
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const { x, y } = toPixel(col, row);
      const px = Math.round(x), py = Math.round(y);
      matrix[row][col] = (px >= 0 && px < width && py >= 0 && py < height) ? isDark[py * width + px] : 0;
    }
  }
  return { matrix, size, version };
}

function popcount15(n) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }

function readFormatBits(matrix, size) {
  let bits = 0, voffset = 0, hoffset = 0;
  for (let i = 0; i < 8; i++) {
    if (i === 6) { voffset = 1; hoffset = 1; }
    bits |= matrix[i + voffset][8] << i;
    bits |= matrix[8][i + hoffset] << (14 - i);
  }
  return bits;
}

const EC_LEVEL_BY_BITS = Object.fromEntries(Object.entries(EC_BITS).map(([level, bits]) => [bits, level]));

function decodeFormatInfo(bits15) {
  let best = -1, bestDist = 99;
  for (let idx = 0; idx < 32; idx++) {
    const dist = popcount15(bits15 ^ FORMAT_INFO[idx]);
    if (dist < bestDist) { bestDist = dist; best = idx; }
  }
  if (bestDist > 3) throw new Error('Could not read the QR format information (the code may be too damaged, or this may not be a QR code).');
  return { ecLevel: EC_LEVEL_BY_BITS[best >> 3], mask: best & 7 };
}

function popcount18(n) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }

function decodeVersionInfo(matrix, size) {
  let vinfo = 0;
  for (let i = 0; i < 6; i++) for (let b = 0; b < 3; b++) vinfo |= matrix[size - 11 + b][i] << (i * 3 + b);
  let best = -1, bestDist = 99;
  for (let idx = 0; idx < VERSION_INFO.length; idx++) {
    const dist = popcount18(vinfo ^ VERSION_INFO[idx]);
    if (dist < bestDist) { bestDist = dist; best = idx; }
  }
  if (bestDist > 3) return null;
  return best + 7;
}

function gfInverse(a) { return GF_EXP[255 - GF_LOG[a]]; }
function gfDiv(a, b) { return a === 0 ? 0 : gfMul(a, gfInverse(b)); }
function gfPow(a, n) { if (n === 0) return 1; if (a === 0) return 0; return GF_EXP[(GF_LOG[a] * n) % 255]; }

function calcSyndromes(codewords, nsym) {
  const synd = new Array(nsym).fill(0);
  for (let i = 0; i < nsym; i++) {
    const x = GF_EXP[i];
    let y = 0;
    for (const c of codewords) y = gfMul(y, x) ^ c;
    synd[i] = y;
  }
  return synd;
}

function berlekampMassey(synd) {
  let C = [1], B = [1], L = 0, m = 1, b = 1;
  for (let n = 0; n < synd.length; n++) {
    let delta = synd[n];
    for (let i = 1; i <= L; i++) delta ^= gfMul(C[i] || 0, synd[n - i]);
    if (delta === 0) {
      m++;
    } else {
      const T = C.slice();
      const coef = gfDiv(delta, b);
      while (C.length < B.length + m) C.push(0);
      for (let i = 0; i < B.length; i++) C[i + m] ^= gfMul(coef, B[i]);
      if (2 * L <= n) { L = n + 1 - L; B = T; b = delta; m = 1; } else { m++; }
    }
  }
  return { sigma: C, errorCount: L };
}

function chienSearch(sigma, n) {
  const positions = [];
  for (let i = 0; i < n; i++) {
    const x = GF_EXP[(255 - (i % 255)) % 255]; // alpha^-i
    let y = sigma[0] || 0;
    for (let j = 1; j < sigma.length; j++) y ^= gfMul(sigma[j], gfPow(x, j));
    if (y === 0) positions.push(n - 1 - i);
  }
  return positions;
}

function forneyMagnitudes(synd, sigma, errPositions, n) {
  const nsym = synd.length;
  const omega = new Array(nsym).fill(0);
  for (let i = 0; i < nsym; i++) {
    let s = 0;
    for (let j = 0; j <= i; j++) s ^= gfMul(synd[i - j], sigma[j] || 0);
    omega[i] = s;
  }
  const evalSigmaDeriv = x => {
    let r = 0;
    for (let i = 1; i < sigma.length; i += 2) r ^= gfMul(sigma[i], gfPow(x, i - 1));
    return r;
  };
  const magnitudes = new Map();
  for (const pos of errPositions) {
    const i = n - 1 - pos; // power of x for this root, x = alpha^-i
    const xInv = GF_EXP[(255 - (i % 255)) % 255];
    let omegaVal = omega[0] || 0;
    for (let j = 1; j < omega.length; j++) omegaVal ^= gfMul(omega[j] || 0, gfPow(xInv, j));
    const sigmaDerivVal = evalSigmaDeriv(xInv);
    if (sigmaDerivVal === 0) throw new Error('Reed-Solomon decoding failed (could not compute error magnitude).');
    const xk = GF_EXP[i % 255];
    const magnitude = gfMul(xk, gfDiv(omegaVal, sigmaDerivVal));
    magnitudes.set(pos, magnitude);
  }
  return magnitudes;
}

export function rsDecodeBlock(codewords, nsym) {
  const synd = calcSyndromes(codewords, nsym);
  if (synd.every(s => s === 0)) return codewords;
  const { sigma, errorCount } = berlekampMassey(synd);
  if (errorCount === 0 || errorCount > nsym / 2) throw new Error('Too many errors to correct in this QR code block.');
  const errPositions = chienSearch(sigma, codewords.length);
  if (errPositions.length !== errorCount) throw new Error('Too many errors to correct in this QR code block (error locator search failed).');
  const magnitudes = forneyMagnitudes(synd, sigma, errPositions, codewords.length);
  const corrected = codewords.slice();
  for (const [pos, mag] of magnitudes) corrected[pos] ^= mag;
  const check = calcSyndromes(corrected, nsym);
  if (!check.every(s => s === 0)) throw new Error('Too many errors to correct in this QR code block.');
  return corrected;
}

function deinterleave(codewords, blocks) {
  const infos = [];
  for (const [numBlocks, total, dataLen] of blocks) {
    for (let i = 0; i < numBlocks; i++) infos.push({ total, dataLen, ecLen: total - dataLen, data: new Uint8Array(dataLen), ec: new Uint8Array(total - dataLen) });
  }
  let idx = 0;
  const maxData = Math.max(...infos.map(b => b.dataLen));
  for (let i = 0; i < maxData; i++) for (const b of infos) if (i < b.dataLen) b.data[i] = codewords[idx++];
  const maxEc = Math.max(...infos.map(b => b.ecLen));
  for (let i = 0; i < maxEc; i++) for (const b of infos) if (i < b.ecLen) b.ec[i] = codewords[idx++];
  return infos;
}

const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const numericCountBits = v => v <= 9 ? 10 : v <= 26 ? 12 : 14;
const alnumCountBits = v => v <= 9 ? 9 : v <= 26 ? 11 : 13;
const byteCountBits = v => v <= 9 ? 8 : 16;

function bytesToBits(bytes) {
  const bits = new Uint8Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) for (let b = 0; b < 8; b++) bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
  return bits;
}

export function decodeDataCodewords(dataBytes, version) {
  const bits = bytesToBits(dataBytes);
  let pos = 0;
  const readBits = n => { let v = 0; for (let k = 0; k < n; k++) v = (v << 1) | (bits[pos++] || 0); return v; };
  let out = '';
  while (pos + 4 <= bits.length) {
    const mode = readBits(4);
    if (mode === 0) break; // terminator
    if (mode === 1) { // numeric
      let remaining = readBits(numericCountBits(version));
      while (remaining >= 3) { out += readBits(10).toString().padStart(3, '0'); remaining -= 3; }
      if (remaining === 2) out += readBits(7).toString().padStart(2, '0');
      else if (remaining === 1) out += readBits(4).toString();
    } else if (mode === 2) { // alphanumeric
      let remaining = readBits(alnumCountBits(version));
      while (remaining >= 2) { const v = readBits(11); out += ALNUM[Math.floor(v / 45)] + ALNUM[v % 45]; remaining -= 2; }
      if (remaining === 1) out += ALNUM[readBits(6)];
    } else if (mode === 4) { // byte
      const count = readBits(byteCountBits(version));
      const bytes = new Uint8Array(count);
      for (let k = 0; k < count; k++) bytes[k] = readBits(8);
      out += decodeUtf8(bytes);
    } else if (mode === 8) {
      throw new Error('This QR code uses Kanji mode, which is not supported by this decoder.');
    } else {
      break; // padding or an unsupported/ECI mode indicator - stop here
    }
  }
  return out;
}

export function decodeQrFromPixels(rgba, width, height) {
  const isDark = binarize(rgba, width, height);
  const finder = findFinderPatterns(isDark, width, height);
  const { matrix, size, version: estimatedVersion } = sampleGrid(isDark, width, height, finder);

  const { ecLevel, mask } = decodeFormatInfo(readFormatBits(matrix, size));

  let version = estimatedVersion;
  if (version >= 7) {
    const confirmed = decodeVersionInfo(matrix, size);
    if (confirmed !== null && confirmed !== version) {
      const correctedSize = confirmed * 4 + 17;
      const span = correctedSize - 7;
      const { topLeft, topRight, bottomLeft } = finder;
      const ux = (topRight.x - topLeft.x) / span, uy = (topRight.y - topLeft.y) / span;
      const vx = (bottomLeft.x - topLeft.x) / span, vy = (bottomLeft.y - topLeft.y) / span;
      const m2 = Array.from({ length: correctedSize }, () => new Uint8Array(correctedSize));
      for (let row = 0; row < correctedSize; row++) for (let col = 0; col < correctedSize; col++) {
        const px = Math.round(topLeft.x + (col - 3) * ux + (row - 3) * vx);
        const py = Math.round(topLeft.y + (col - 3) * uy + (row - 3) * vy);
        m2[row][col] = (px >= 0 && px < width && py >= 0 && py < height) ? isDark[py * width + px] : 0;
      }
      return finishDecode(m2, correctedSize, confirmed, ecLevel, mask);
    }
  }
  return finishDecode(matrix, size, version, ecLevel, mask);
}

export function finishDecode(matrix, size, version, ecLevel, mask) {
  const { isFunction } = buildFunctionPatterns(size, version);
  const maskFn = MASK_FUNCS[mask];
  const positions = zigzagPositions(size, isFunction);
  const bits = positions.map(([i, j]) => matrix[i][j] ^ (maskFn(i, j) ? 1 : 0));

  const codewords = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
    codewords.push(b);
  }

  const blocks = ECC_TABLE[version - 1][ecLevel];
  if (!blocks) throw new Error(`Unsupported error-correction level "${ecLevel}" for version ${version}.`);
  const blockInfos = deinterleave(codewords, blocks);

  const dataParts = [];
  for (const b of blockInfos) {
    const full = new Uint8Array(b.total);
    full.set(b.data, 0);
    full.set(b.ec, b.dataLen);
    const corrected = rsDecodeBlock(Array.from(full), b.ecLen);
    dataParts.push(Uint8Array.from(corrected.slice(0, b.dataLen)));
  }
  const totalLen = dataParts.reduce((s, p) => s + p.length, 0);
  const allData = new Uint8Array(totalLen);
  let off = 0;
  for (const p of dataParts) { allData.set(p, off); off += p.length; }

  return decodeDataCodewords(allData, version);
}
