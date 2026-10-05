import { module } from './_cat.js';

const V_TABLE = new Uint8Array([
  1, 87, 49, 12, 176, 178, 102, 166, 121, 193, 6, 84, 249, 230, 44, 163,
  14, 197, 213, 181, 161, 85, 218, 80, 64, 239, 24, 226, 236, 142, 38, 200,
  110, 177, 104, 103, 141, 253, 255, 50, 77, 101, 81, 18, 45, 96, 31, 222,
  25, 107, 190, 70, 86, 237, 240, 34, 72, 242, 20, 214, 244, 227, 149, 235,
  97, 234, 57, 22, 60, 250, 82, 175, 208, 5, 127, 199, 111, 62, 135, 248,
  174, 169, 211, 58, 66, 154, 106, 195, 245, 171, 17, 187, 182, 179, 0, 243,
  132, 56, 148, 75, 128, 133, 158, 100, 130, 126, 91, 13, 153, 246, 216, 219,
  119, 68, 223, 78, 83, 88, 201, 99, 122, 11, 92, 32, 136, 114, 52, 10,
  138, 30, 48, 183, 156, 35, 61, 26, 143, 74, 251, 94, 129, 162, 63, 152,
  170, 7, 115, 167, 241, 206, 3, 150, 55, 59, 151, 220, 90, 53, 23, 131,
  125, 173, 15, 238, 79, 95, 89, 16, 105, 137, 225, 224, 217, 160, 37, 123,
  118, 73, 2, 157, 46, 116, 9, 145, 134, 228, 207, 212, 202, 215, 69, 229,
  27, 188, 67, 124, 168, 252, 42, 4, 29, 108, 21, 247, 19, 205, 39, 203,
  233, 40, 186, 147, 198, 192, 155, 33, 164, 191, 98, 204, 165, 180, 117, 76,
  140, 36, 210, 172, 41, 54, 159, 8, 185, 232, 113, 196, 231, 47, 146, 120,
  51, 65, 28, 144, 254, 221, 93, 189, 194, 139, 112, 43, 71, 109, 184, 209,
]);
function fastB(ms, i, j, k) { return V_TABLE[V_TABLE[V_TABLE[ms ^ i] ^ j] ^ k]; }

const EFF_BUCKETS = 128, CODE_SIZE = 32, MIN_DATA_LENGTH = 50;

const TOPVAL = [1,2,3,5,7,11,17,25,38,57,86,129,194,291,437,656,854,1110,1443,1876,2439,3171,3475,3823,4205,4626,5088,5597,6157,6772,7450,8195,9014,9916,10907,11998,13198,14518,15970,17567,19323,21256,23382,25720,28292,31121,34233,37656,41422,45564,50121,55133,60646,66711,73382,80721,88793,97672,107439,118183,130002,143002,157302,173032,190335,209369,230306,253337,278670,306538,337191,370911,408002,448802,493682,543050,597356,657091,722800,795081,874589,962048,1058252,1164078,1280486,1408534,1549388,1704327,1874759,2062236,2268459,2495305,2744836,3019320,3321252,3653374,4018711,4420582,4862641,5348905,5883796,6472176,7119394,7831333,8614467,9475909,10423501,11465851,12612437,13873681,15261050,16787154,18465870,20312458,22343706,24578077,27035886,29739474,32713425,35984770,39583245,43541573,47895730,52685306,57953837,63749221,70124148,77136564,84850228,93335252,102668779,112935659,124229227,136652151,150317384,165349128,181884040,200072456,220079703,242087671,266296456,292926096,322218735,354440623,389884688,428873168,471760495,518936559,570830240,627913311,690704607,759775136,835752671,919327967,1011260767,1112386880,1223623232,1345985727,1480584256,1628642751,1791507135,1970657856,2167723648,2384496256,2622945920,2885240448,3173764736,3491141248,3840255616,4224281216];

function lCapturing(len) {
  let bottom = 0, top = 170, idx = 85;
  for (;;) {
    if (idx === 0) return idx;
    if (len <= TOPVAL[idx] && len > TOPVAL[idx - 1]) return idx;
    if (len < TOPVAL[idx]) top = idx - 1; else bottom = idx + 1;
    idx = Math.floor((bottom + top) / 2);
  }
}
function swapByte(b) { return (((b & 0xf0) >> 4) | ((b & 0x0f) << 4)) & 0xff; }

export function tlshHash(data) {
  const aBucket = new Uint32Array(256);
  let checksum = 0;
  for (let i = 4; i < data.length; i++) {
    const a0 = data[i - 4], a1 = data[i - 3], a2 = data[i - 2], a3 = data[i - 1], a4 = data[i];
    checksum = fastB(1, a4, a3, checksum);
    aBucket[fastB(49, a4, a3, a2)]++;
    aBucket[fastB(12, a4, a3, a1)]++;
    aBucket[fastB(178, a4, a2, a1)]++;
    aBucket[fastB(166, a4, a2, a0)]++;
    aBucket[fastB(84, a4, a3, a0)]++;
    aBucket[fastB(230, a4, a1, a0)]++;
  }
  const dataLen = data.length;
  if (dataLen < MIN_DATA_LENGTH) return null;

  const bucket = aBucket.subarray(0, EFF_BUCKETS);
  const sorted = Array.from(bucket).sort((a, b) => a - b);
  const q1 = sorted[EFF_BUCKETS / 4 - 1], q2 = sorted[EFF_BUCKETS / 2 - 1], q3 = sorted[EFF_BUCKETS - EFF_BUCKETS / 4 - 1];
  if (q3 === 0) return null;

  let nonzero = 0;
  for (let i = 0; i < EFF_BUCKETS; i++) if (bucket[i] > 0) nonzero++;
  if (nonzero <= EFF_BUCKETS / 2) return null;

  const tmpCode = new Uint8Array(CODE_SIZE);
  for (let i = 0; i < CODE_SIZE; i++) {
    let h = 0;
    for (let j = 0; j < 4; j++) {
      const k = bucket[4 * i + j];
      if (q3 < k) h += 3 << (j * 2);
      else if (q2 < k) h += 2 << (j * 2);
      else if (q1 < k) h += 1 << (j * 2);
    }
    tmpCode[i] = h;
  }

  const Lvalue = lCapturing(dataLen);
  const Q1ratio = Math.floor(q1 * 100 / q3) % 16;
  const Q2ratio = Math.floor(q2 * 100 / q3) % 16;
  return { checksum, Lvalue, Q1ratio, Q2ratio, tmpCode };
}

export function tlshHashToString(bin) {
  if (!bin) return '';
  const QB = ((bin.Q2ratio & 0xf) << 4) | (bin.Q1ratio & 0xf);
  const bytes = new Uint8Array(3 + CODE_SIZE);
  bytes[0] = swapByte(bin.checksum);
  bytes[1] = swapByte(bin.Lvalue);
  bytes[2] = swapByte(QB);
  for (let i = 0; i < CODE_SIZE; i++) bytes[3 + i] = bin.tmpCode[CODE_SIZE - 1 - i];
  const hex = [...bytes].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
  return 'T1' + hex;
}

export function parseTlshStr(str) {
  let s = str.trim();
  if (s.startsWith('T1')) s = s.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(s) || s.length !== 3 * 2 + CODE_SIZE * 2) throw new Error('Not a valid TLSH hash');
  const bytes = new Uint8Array(3 + CODE_SIZE);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.substr(i * 2, 2), 16);
  const checksum = swapByte(bytes[0]);
  const Lvalue = swapByte(bytes[1]);
  const QB = swapByte(bytes[2]);
  const Q1ratio = QB & 0xf, Q2ratio = (QB >> 4) & 0xf;
  const tmpCode = new Uint8Array(CODE_SIZE);
  for (let i = 0; i < CODE_SIZE; i++) tmpCode[i] = bytes[3 + (CODE_SIZE - 1 - i)];
  return { checksum, Lvalue, Q1ratio, Q2ratio, tmpCode };
}

function modDiff(x, y, R) {
  let dl, dr;
  if (y > x) { dl = y - x; dr = x + R - y; } else { dl = x - y; dr = y + R - x; }
  return Math.min(dl, dr);
}
function byteDiff(bv, obv) {
  const h1 = bv >> 4, oh1 = obv >> 4, h2 = bv & 0xf, oh2 = obv & 0xf;
  const p1 = h1 >> 2, op1 = oh1 >> 2, p2 = h1 & 3, op2 = oh1 & 3;
  const p3 = h2 >> 2, op3 = oh2 >> 2, p4 = h2 & 3, op4 = oh2 & 3;
  const pairbit = (a, b) => { const d = Math.abs(a - b); return d <= 1 ? d : d === 2 ? 2 : 6; };
  return pairbit(p1, op1) + pairbit(p2, op2) + pairbit(p3, op3) + pairbit(p4, op4);
}
export function totalDiff(a, b, lenDiff = true) {
  const lengthMult = 12, qratioMult = 12;
  let diff = 0;
  if (lenDiff) {
    const ldiff = modDiff(a.Lvalue, b.Lvalue, 256);
    diff = ldiff <= 1 ? ldiff : ldiff * lengthMult;
  }
  const q1diff = modDiff(a.Q1ratio, b.Q1ratio, 16);
  diff += q1diff <= 1 ? q1diff : (q1diff - 1) * qratioMult;
  const q2diff = modDiff(a.Q2ratio, b.Q2ratio, 16);
  diff += q2diff <= 1 ? q2diff : (q2diff - 1) * qratioMult;
  if (a.checksum !== b.checksum) diff += 1;
  for (let i = 0; i < CODE_SIZE; i++) diff += byteDiff(a.tmpCode[i], b.tmpCode[i]);
  return diff;
}

module('TLSH (fuzzy hash)', 'Trend Micro Locality Sensitive Hash: a similarity-preserving hash for malware/file triage. Needs at least ~50 bytes with enough byte variety; short or very repetitive input is rejected.', [],
  (data) => {
    const bin = tlshHash(data);
    const h = bin ? tlshHashToString(bin) : '';
    if (!h) throw new Error('Input is too short or has too little byte variety for TLSH (needs roughly 50+ varied bytes)');
    return h;
  });
