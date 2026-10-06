// Vendored hash primitives for SHA-224, SHA-512/t, RIPEMD-128/256/320, Whirlpool-0/T and GOST R 34.11-94:
// crypto-api 0.8.5 (MIT, Copyright (c) nf404) and crypto-gost-js (MIT). Built with esbuild.
var Hasher = class {
  /**
   * @param {Object} options
   * @constructor
   */
  constructor(options) {
    this.unitSize = 4;
    this.unitOrder = 0;
    this.blockSize = 16;
    this.blockSizeInBytes = this.blockSize * this.unitSize;
    this.options = options || {};
    this.reset();
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    this.state = {};
    this.state.message = "";
    this.state.length = 0;
  }
  /**
   * Return current state
   *
   * @returns {Object}
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  /**
   * Set current state
   *
   * @param {Object} state
   */
  setState(state) {
    this.state = state;
  }
  /**
   * Update message from binary string
   *
   * @param {string} message
   */
  update(message) {
    this.state.message += message;
    this.state.length += message.length;
    this.process();
  }
  /**
   * Process ready blocks
   *
   * @protected
   */
  process() {
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    return "";
  }
  /**
   * Get hash from state
   *
   * @protected
   * @param {number} [size=this.state.hash.length] - Limit hash size (in chunks)
   * @returns {string}
   */
  getStateHash(size) {
    return "";
  }
  /**
   * Add PKCS7 padding to message
   * Pad with bytes all of the same value as the number of padding bytes
   *
   * @protected
   * @param {number} length
   */
  addPaddingPKCS7(length) {
    this.state.message += new Array(length + 1).join(String.fromCharCode(length));
  }
  /**
   * Add ISO7816-4 padding to message
   * Pad with 0x80 followed by zero bytes
   *
   * @protected
   * @param {number} length
   */
  addPaddingISO7816(length) {
    this.state.message += "\x80" + new Array(length).join("\0");
  }
  /**
   * Add zero padding to message
   * Pad with 0x00 characters
   *
   * @protected
   * @param {number} length
   */
  addPaddingZero(length) {
    this.state.message += new Array(length + 1).join("\0");
  }
};
var hasher_default = Hasher;

// node_modules/crypto-api/src/hasher/hasher32le.mjs
var Hasher32le = class extends hasher_default {
  /**
   * @param {Object} [options]
   */
  constructor(options) {
    super(options);
    this.blockUnits = [];
  }
  /**
   * Process ready blocks
   *
   * @protected
   */
  process() {
    while (this.state.message.length >= this.blockSizeInBytes) {
      this.blockUnits = [];
      for (let b = 0; b < this.blockSizeInBytes; b += 4) {
        this.blockUnits.push(
          this.state.message.charCodeAt(b) | this.state.message.charCodeAt(b + 1) << 8 | this.state.message.charCodeAt(b + 2) << 16 | this.state.message.charCodeAt(b + 3) << 24
        );
      }
      this.state.message = this.state.message.substr(this.blockSizeInBytes);
      this.processBlock(this.blockUnits);
    }
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @param {number[]} M
   */
  processBlock(M) {
  }
  /**
   * Get hash from state
   *
   * @protected
   * @param {number} [size=this.state.hash.length] - Limit hash size (in chunks)
   * @returns {string}
   */
  getStateHash(size) {
    size = size || this.state.hash.length;
    let hash = "";
    for (let i = 0; i < size; i++) {
      hash += String.fromCharCode(this.state.hash[i] & 255) + String.fromCharCode(this.state.hash[i] >> 8 & 255) + String.fromCharCode(this.state.hash[i] >> 16 & 255) + String.fromCharCode(this.state.hash[i] >> 24 & 255);
    }
    return hash;
  }
  /**
   * Add to message cumulative size of message in bits
   *
   * @protected
   */
  addLengthBits() {
    this.state.message += String.fromCharCode(this.state.length << 3 & 255) + String.fromCharCode(this.state.length >> 5 & 255) + String.fromCharCode(this.state.length >> 13 & 255) + String.fromCharCode(this.state.length >> 21 & 255) + String.fromCharCode(this.state.length >> 29 & 255) + "\0\0\0";
  }
};
var hasher32le_default = Hasher32le;

// node_modules/crypto-api/src/tools/tools.mjs
function rotateLeft(x, n) {
  return x << n | x >>> 32 - n | 0;
}
function rotateRight(x, n) {
  return x >>> n | x << 32 - n | 0;
}
function rotateRight64hi(hi, lo, n) {
  if (n === 32) {
    return lo;
  }
  if (n > 32) {
    return rotateRight64hi(lo, hi, n - 32);
  }
  return (hi >>> n | lo << 32 - n) & 4294967295;
}
function rotateRight64lo(hi, lo, n) {
  if (n === 32) {
    return hi;
  }
  if (n > 32) {
    return rotateRight64lo(lo, hi, n - 32);
  }
  return (lo >>> n | hi << 32 - n) & 4294967295;
}

// node_modules/crypto-api/src/hasher/has160.mjs
var K = [0, 1518500249, 1859775393, 2400959708];
var ROT = [
  5,
  11,
  7,
  15,
  6,
  13,
  8,
  14,
  7,
  12,
  9,
  11,
  8,
  15,
  6,
  12,
  9,
  14,
  5,
  13
];
var ROT2 = [10, 17, 25, 30];
var IND = [
  18,
  0,
  1,
  2,
  3,
  19,
  4,
  5,
  6,
  7,
  16,
  8,
  9,
  10,
  11,
  17,
  12,
  13,
  14,
  15,
  22,
  3,
  6,
  9,
  12,
  23,
  15,
  2,
  5,
  8,
  20,
  11,
  14,
  1,
  4,
  21,
  7,
  10,
  13,
  0,
  26,
  12,
  5,
  14,
  7,
  27,
  0,
  9,
  2,
  11,
  24,
  4,
  13,
  6,
  15,
  25,
  8,
  1,
  10,
  3,
  30,
  7,
  2,
  13,
  8,
  31,
  3,
  14,
  9,
  4,
  28,
  15,
  10,
  5,
  0,
  29,
  11,
  6,
  1,
  12
];
var Has160 = class extends hasher32le_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.rounds=80] - Number of rounds (Can be from 1 to 80)
   */
  constructor(options) {
    super(options);
    this.options.rounds = this.options.rounds || 80;
    this.W = new Array(32);
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = [
      1732584193,
      4023233417,
      2562383102,
      271733878,
      3285377520
    ];
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let a = this.state.hash[0] | 0;
    let b = this.state.hash[1] | 0;
    let c = this.state.hash[2] | 0;
    let d = this.state.hash[3] | 0;
    let e = this.state.hash[4] | 0;
    for (let i = 0; i < 16; i++) {
      this.W[i] = block[i] | 0;
    }
    this.W[16] = this.W[0] ^ this.W[1] ^ this.W[2] ^ this.W[3] | 0;
    this.W[17] = this.W[4] ^ this.W[5] ^ this.W[6] ^ this.W[7] | 0;
    this.W[18] = this.W[8] ^ this.W[9] ^ this.W[10] ^ this.W[11] | 0;
    this.W[19] = this.W[12] ^ this.W[13] ^ this.W[14] ^ this.W[15] | 0;
    this.W[20] = this.W[3] ^ this.W[6] ^ this.W[9] ^ this.W[12] | 0;
    this.W[21] = this.W[2] ^ this.W[5] ^ this.W[8] ^ this.W[15] | 0;
    this.W[22] = this.W[1] ^ this.W[4] ^ this.W[11] ^ this.W[14] | 0;
    this.W[23] = this.W[0] ^ this.W[7] ^ this.W[10] ^ this.W[13] | 0;
    this.W[24] = this.W[5] ^ this.W[7] ^ this.W[12] ^ this.W[14] | 0;
    this.W[25] = this.W[0] ^ this.W[2] ^ this.W[9] ^ this.W[11] | 0;
    this.W[26] = this.W[4] ^ this.W[6] ^ this.W[13] ^ this.W[15] | 0;
    this.W[27] = this.W[1] ^ this.W[3] ^ this.W[8] ^ this.W[10] | 0;
    this.W[28] = this.W[2] ^ this.W[7] ^ this.W[8] ^ this.W[13] | 0;
    this.W[29] = this.W[3] ^ this.W[4] ^ this.W[9] ^ this.W[14] | 0;
    this.W[30] = this.W[0] ^ this.W[5] ^ this.W[10] ^ this.W[15] | 0;
    this.W[31] = this.W[1] ^ this.W[6] ^ this.W[11] ^ this.W[12] | 0;
    for (let i = 0; i < this.options.rounds; i++) {
      let t = rotateLeft(a, ROT[i % 20]) + e + this.W[IND[i]] + K[i / 20 >> 0] | 0;
      if (i < 20) {
        t = t + (b & c | ~b & d) | 0;
      } else if (i < 40) {
        t = t + (b ^ c ^ d) | 0;
      } else if (i < 60) {
        t = t + (c ^ (b | ~d)) | 0;
      } else {
        t = t + (b ^ c ^ d) | 0;
      }
      e = d;
      d = c;
      c = rotateLeft(b, ROT2[i / 20 >> 0]) | 0;
      b = a;
      a = t;
    }
    this.state.hash[0] = this.state.hash[0] + a | 0;
    this.state.hash[1] = this.state.hash[1] + b | 0;
    this.state.hash[2] = this.state.hash[2] + c | 0;
    this.state.hash[3] = this.state.hash[3] + d | 0;
    this.state.hash[4] = this.state.hash[4] + e | 0;
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 56 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var has160_default = Has160;

// node_modules/crypto-api/src/hasher/hasher8.mjs
var Hasher8 = class extends hasher_default {
  /**
   * @param {Object} [options]
   */
  constructor(options) {
    super(options);
    this.unitSize = 1;
    this.blockSizeInBytes = this.blockSize * this.unitSize;
    this.blockUnits = [];
  }
  /**
   * Process ready blocks
   */
  process() {
    while (this.state.message.length >= this.blockSizeInBytes) {
      this.blockUnits = new Array(this.blockSizeInBytes);
      for (let i = 0; i < this.blockSizeInBytes; i++) {
        this.blockUnits[i] = this.state.message.charCodeAt(i) | 0;
      }
      this.state.message = this.state.message.substr(this.blockSizeInBytes);
      this.processBlock(this.blockUnits);
    }
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @param {number[]} M
   */
  processBlock(M) {
  }
  /**
   * Get hash from state
   *
   * @protected
   * @param {number} [size=this.state.hash.length] - Limit hash size (in chunks)
   * @returns {string}
   */
  getStateHash(size) {
    size = size || this.state.hash.length;
    let hash = "";
    for (let i = 0; i < size; i++) {
      hash += String.fromCharCode(this.state.hash[i] & 255);
    }
    return hash;
  }
};
var hasher8_default = Hasher8;

// node_modules/crypto-api/src/hasher/md2.mjs
var SBOX = [
  41,
  46,
  67,
  201,
  162,
  216,
  124,
  1,
  61,
  54,
  84,
  161,
  236,
  240,
  6,
  19,
  98,
  167,
  5,
  243,
  192,
  199,
  115,
  140,
  152,
  147,
  43,
  217,
  188,
  76,
  130,
  202,
  30,
  155,
  87,
  60,
  253,
  212,
  224,
  22,
  103,
  66,
  111,
  24,
  138,
  23,
  229,
  18,
  190,
  78,
  196,
  214,
  218,
  158,
  222,
  73,
  160,
  251,
  245,
  142,
  187,
  47,
  238,
  122,
  169,
  104,
  121,
  145,
  21,
  178,
  7,
  63,
  148,
  194,
  16,
  137,
  11,
  34,
  95,
  33,
  128,
  127,
  93,
  154,
  90,
  144,
  50,
  39,
  53,
  62,
  204,
  231,
  191,
  247,
  151,
  3,
  255,
  25,
  48,
  179,
  72,
  165,
  181,
  209,
  215,
  94,
  146,
  42,
  172,
  86,
  170,
  198,
  79,
  184,
  56,
  210,
  150,
  164,
  125,
  182,
  118,
  252,
  107,
  226,
  156,
  116,
  4,
  241,
  69,
  157,
  112,
  89,
  100,
  113,
  135,
  32,
  134,
  91,
  207,
  101,
  230,
  45,
  168,
  2,
  27,
  96,
  37,
  173,
  174,
  176,
  185,
  246,
  28,
  70,
  97,
  105,
  52,
  64,
  126,
  15,
  85,
  71,
  163,
  35,
  221,
  81,
  175,
  58,
  195,
  92,
  249,
  206,
  186,
  197,
  234,
  38,
  44,
  83,
  13,
  110,
  133,
  40,
  132,
  9,
  211,
  223,
  205,
  244,
  65,
  129,
  77,
  82,
  106,
  220,
  55,
  200,
  108,
  193,
  171,
  250,
  36,
  225,
  123,
  8,
  12,
  189,
  177,
  74,
  120,
  136,
  149,
  139,
  227,
  99,
  232,
  109,
  233,
  203,
  213,
  254,
  59,
  0,
  29,
  57,
  242,
  239,
  183,
  14,
  102,
  88,
  208,
  228,
  166,
  119,
  114,
  248,
  235,
  117,
  75,
  10,
  49,
  68,
  80,
  180,
  143,
  237,
  31,
  26,
  219,
  153,
  141,
  51,
  159,
  17,
  131,
  20
];
var Md2 = class extends hasher8_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.rounds=18] - Number of rounds (Must be greater than 0)
   */
  constructor(options) {
    super(options);
    this.options.rounds = this.options.rounds || 18;
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = new Array(48);
    this.state.checksum = new Array(16);
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    for (let i = 0; i < 16; i++) {
      this.state.hash[16 + i] = block[i] | 0;
      this.state.hash[32 + i] = block[i] ^ this.state.hash[i];
    }
    let t = 0;
    for (let i = 0; i < this.options.rounds; i++) {
      for (let j = 0; j < 48; j++) {
        t = this.state.hash[j] ^= SBOX[t];
      }
      t = t + i & 255;
    }
    t = this.state.checksum[15] & 255;
    for (let i = 0; i < 16; i++) {
      t = this.state.checksum[i] ^= SBOX[block[i] ^ t];
    }
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingPKCS7(16 - (this.state.message.length & 15) | 0);
    this.process();
    for (let i = 0; i < 16; i++) {
      this.state.message += String.fromCharCode(this.state.checksum[i]);
    }
    this.process();
    return this.getStateHash(16);
  }
};
var md2_default = Md2;

// node_modules/crypto-api/src/hasher/md4.mjs
var S = [
  [3, 7, 11, 19],
  [3, 5, 9, 13],
  [3, 9, 11, 15]
];
var F = 0;
var G = 1518500249;
var H = 1859775393;
var Md4 = class _Md4 extends hasher32le_default {
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = [
      1732584193 | 0,
      4023233417 | 0,
      2562383102 | 0,
      271733878 | 0
    ];
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static FF(x, y, z) {
    return x & y | ~x & z;
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static GG(x, y, z) {
    return x & y | x & z | y & z;
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static HH(x, y, z) {
    return x ^ y ^ z;
  }
  /**
   * @private
   * @ignore
   * @param {function} f
   * @param {number} k
   * @param {number} a
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} m
   * @param {number} s
   * @returns {number}
   * @constructor
   */
  static CC(f, k, a, x, y, z, m, s) {
    return rotateLeft(a + f(x, y, z) + m + k, s) | 0;
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let a = this.state.hash[0] | 0;
    let b = this.state.hash[1] | 0;
    let c = this.state.hash[2] | 0;
    let d = this.state.hash[3] | 0;
    a = _Md4.CC(_Md4.FF, F, a, b, c, d, block[0], S[0][0]);
    d = _Md4.CC(_Md4.FF, F, d, a, b, c, block[1], S[0][1]);
    c = _Md4.CC(_Md4.FF, F, c, d, a, b, block[2], S[0][2]);
    b = _Md4.CC(_Md4.FF, F, b, c, d, a, block[3], S[0][3]);
    a = _Md4.CC(_Md4.FF, F, a, b, c, d, block[4], S[0][0]);
    d = _Md4.CC(_Md4.FF, F, d, a, b, c, block[5], S[0][1]);
    c = _Md4.CC(_Md4.FF, F, c, d, a, b, block[6], S[0][2]);
    b = _Md4.CC(_Md4.FF, F, b, c, d, a, block[7], S[0][3]);
    a = _Md4.CC(_Md4.FF, F, a, b, c, d, block[8], S[0][0]);
    d = _Md4.CC(_Md4.FF, F, d, a, b, c, block[9], S[0][1]);
    c = _Md4.CC(_Md4.FF, F, c, d, a, b, block[10], S[0][2]);
    b = _Md4.CC(_Md4.FF, F, b, c, d, a, block[11], S[0][3]);
    a = _Md4.CC(_Md4.FF, F, a, b, c, d, block[12], S[0][0]);
    d = _Md4.CC(_Md4.FF, F, d, a, b, c, block[13], S[0][1]);
    c = _Md4.CC(_Md4.FF, F, c, d, a, b, block[14], S[0][2]);
    b = _Md4.CC(_Md4.FF, F, b, c, d, a, block[15], S[0][3]);
    a = _Md4.CC(_Md4.GG, G, a, b, c, d, block[0], S[1][0]);
    d = _Md4.CC(_Md4.GG, G, d, a, b, c, block[4], S[1][1]);
    c = _Md4.CC(_Md4.GG, G, c, d, a, b, block[8], S[1][2]);
    b = _Md4.CC(_Md4.GG, G, b, c, d, a, block[12], S[1][3]);
    a = _Md4.CC(_Md4.GG, G, a, b, c, d, block[1], S[1][0]);
    d = _Md4.CC(_Md4.GG, G, d, a, b, c, block[5], S[1][1]);
    c = _Md4.CC(_Md4.GG, G, c, d, a, b, block[9], S[1][2]);
    b = _Md4.CC(_Md4.GG, G, b, c, d, a, block[13], S[1][3]);
    a = _Md4.CC(_Md4.GG, G, a, b, c, d, block[2], S[1][0]);
    d = _Md4.CC(_Md4.GG, G, d, a, b, c, block[6], S[1][1]);
    c = _Md4.CC(_Md4.GG, G, c, d, a, b, block[10], S[1][2]);
    b = _Md4.CC(_Md4.GG, G, b, c, d, a, block[14], S[1][3]);
    a = _Md4.CC(_Md4.GG, G, a, b, c, d, block[3], S[1][0]);
    d = _Md4.CC(_Md4.GG, G, d, a, b, c, block[7], S[1][1]);
    c = _Md4.CC(_Md4.GG, G, c, d, a, b, block[11], S[1][2]);
    b = _Md4.CC(_Md4.GG, G, b, c, d, a, block[15], S[1][3]);
    a = _Md4.CC(_Md4.HH, H, a, b, c, d, block[0], S[2][0]);
    d = _Md4.CC(_Md4.HH, H, d, a, b, c, block[8], S[2][1]);
    c = _Md4.CC(_Md4.HH, H, c, d, a, b, block[4], S[2][2]);
    b = _Md4.CC(_Md4.HH, H, b, c, d, a, block[12], S[2][3]);
    a = _Md4.CC(_Md4.HH, H, a, b, c, d, block[2], S[2][0]);
    d = _Md4.CC(_Md4.HH, H, d, a, b, c, block[10], S[2][1]);
    c = _Md4.CC(_Md4.HH, H, c, d, a, b, block[6], S[2][2]);
    b = _Md4.CC(_Md4.HH, H, b, c, d, a, block[14], S[2][3]);
    a = _Md4.CC(_Md4.HH, H, a, b, c, d, block[1], S[2][0]);
    d = _Md4.CC(_Md4.HH, H, d, a, b, c, block[9], S[2][1]);
    c = _Md4.CC(_Md4.HH, H, c, d, a, b, block[5], S[2][2]);
    b = _Md4.CC(_Md4.HH, H, b, c, d, a, block[13], S[2][3]);
    a = _Md4.CC(_Md4.HH, H, a, b, c, d, block[3], S[2][0]);
    d = _Md4.CC(_Md4.HH, H, d, a, b, c, block[11], S[2][1]);
    c = _Md4.CC(_Md4.HH, H, c, d, a, b, block[7], S[2][2]);
    b = _Md4.CC(_Md4.HH, H, b, c, d, a, block[15], S[2][3]);
    this.state.hash = [
      this.state.hash[0] + a | 0,
      this.state.hash[1] + b | 0,
      this.state.hash[2] + c | 0,
      this.state.hash[3] + d | 0
    ];
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 56 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var md4_default = Md4;

// node_modules/crypto-api/src/hasher/md5.mjs
var S2 = [
  [7, 12, 17, 22],
  [5, 9, 14, 20],
  [4, 11, 16, 23],
  [6, 10, 15, 21]
];
var T = new Array(64);
for (let i = 0; i < 64; i++) {
  T[i] = Math.abs(Math.sin(i + 1)) * 4294967296 | 0;
}
var Md5 = class _Md5 extends hasher32le_default {
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = [
      1732584193 | 0,
      4023233417 | 0,
      2562383102 | 0,
      271733878 | 0
    ];
  }
  /**
   * @protected
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static FF(x, y, z) {
    return x & y | ~x & z;
  }
  /**
   * @protected
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static GG(x, y, z) {
    return x & z | y & ~z;
  }
  /**
   * @protected
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static HH(x, y, z) {
    return x ^ y ^ z;
  }
  /**
   * @protected
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static II(x, y, z) {
    return y ^ (x | ~z);
  }
  /**
   * @protected
   * @ignore
   * @param {function} f
   * @param {number} k
   * @param {number} a
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} m
   * @param {number} s
   * @returns {number}
   */
  static CC(f, k, a, x, y, z, m, s) {
    return rotateLeft(a + f(x, y, z) + m + k, s) + x | 0;
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let a = this.state.hash[0] | 0;
    let b = this.state.hash[1] | 0;
    let c = this.state.hash[2] | 0;
    let d = this.state.hash[3] | 0;
    a = _Md5.CC(_Md5.FF, T[0], a, b, c, d, block[0], S2[0][0]);
    d = _Md5.CC(_Md5.FF, T[1], d, a, b, c, block[1], S2[0][1]);
    c = _Md5.CC(_Md5.FF, T[2], c, d, a, b, block[2], S2[0][2]);
    b = _Md5.CC(_Md5.FF, T[3], b, c, d, a, block[3], S2[0][3]);
    a = _Md5.CC(_Md5.FF, T[4], a, b, c, d, block[4], S2[0][0]);
    d = _Md5.CC(_Md5.FF, T[5], d, a, b, c, block[5], S2[0][1]);
    c = _Md5.CC(_Md5.FF, T[6], c, d, a, b, block[6], S2[0][2]);
    b = _Md5.CC(_Md5.FF, T[7], b, c, d, a, block[7], S2[0][3]);
    a = _Md5.CC(_Md5.FF, T[8], a, b, c, d, block[8], S2[0][0]);
    d = _Md5.CC(_Md5.FF, T[9], d, a, b, c, block[9], S2[0][1]);
    c = _Md5.CC(_Md5.FF, T[10], c, d, a, b, block[10], S2[0][2]);
    b = _Md5.CC(_Md5.FF, T[11], b, c, d, a, block[11], S2[0][3]);
    a = _Md5.CC(_Md5.FF, T[12], a, b, c, d, block[12], S2[0][0]);
    d = _Md5.CC(_Md5.FF, T[13], d, a, b, c, block[13], S2[0][1]);
    c = _Md5.CC(_Md5.FF, T[14], c, d, a, b, block[14], S2[0][2]);
    b = _Md5.CC(_Md5.FF, T[15], b, c, d, a, block[15], S2[0][3]);
    a = _Md5.CC(_Md5.GG, T[16], a, b, c, d, block[1], S2[1][0]);
    d = _Md5.CC(_Md5.GG, T[17], d, a, b, c, block[6], S2[1][1]);
    c = _Md5.CC(_Md5.GG, T[18], c, d, a, b, block[11], S2[1][2]);
    b = _Md5.CC(_Md5.GG, T[19], b, c, d, a, block[0], S2[1][3]);
    a = _Md5.CC(_Md5.GG, T[20], a, b, c, d, block[5], S2[1][0]);
    d = _Md5.CC(_Md5.GG, T[21], d, a, b, c, block[10], S2[1][1]);
    c = _Md5.CC(_Md5.GG, T[22], c, d, a, b, block[15], S2[1][2]);
    b = _Md5.CC(_Md5.GG, T[23], b, c, d, a, block[4], S2[1][3]);
    a = _Md5.CC(_Md5.GG, T[24], a, b, c, d, block[9], S2[1][0]);
    d = _Md5.CC(_Md5.GG, T[25], d, a, b, c, block[14], S2[1][1]);
    c = _Md5.CC(_Md5.GG, T[26], c, d, a, b, block[3], S2[1][2]);
    b = _Md5.CC(_Md5.GG, T[27], b, c, d, a, block[8], S2[1][3]);
    a = _Md5.CC(_Md5.GG, T[28], a, b, c, d, block[13], S2[1][0]);
    d = _Md5.CC(_Md5.GG, T[29], d, a, b, c, block[2], S2[1][1]);
    c = _Md5.CC(_Md5.GG, T[30], c, d, a, b, block[7], S2[1][2]);
    b = _Md5.CC(_Md5.GG, T[31], b, c, d, a, block[12], S2[1][3]);
    a = _Md5.CC(_Md5.HH, T[32], a, b, c, d, block[5], S2[2][0]);
    d = _Md5.CC(_Md5.HH, T[33], d, a, b, c, block[8], S2[2][1]);
    c = _Md5.CC(_Md5.HH, T[34], c, d, a, b, block[11], S2[2][2]);
    b = _Md5.CC(_Md5.HH, T[35], b, c, d, a, block[14], S2[2][3]);
    a = _Md5.CC(_Md5.HH, T[36], a, b, c, d, block[1], S2[2][0]);
    d = _Md5.CC(_Md5.HH, T[37], d, a, b, c, block[4], S2[2][1]);
    c = _Md5.CC(_Md5.HH, T[38], c, d, a, b, block[7], S2[2][2]);
    b = _Md5.CC(_Md5.HH, T[39], b, c, d, a, block[10], S2[2][3]);
    a = _Md5.CC(_Md5.HH, T[40], a, b, c, d, block[13], S2[2][0]);
    d = _Md5.CC(_Md5.HH, T[41], d, a, b, c, block[0], S2[2][1]);
    c = _Md5.CC(_Md5.HH, T[42], c, d, a, b, block[3], S2[2][2]);
    b = _Md5.CC(_Md5.HH, T[43], b, c, d, a, block[6], S2[2][3]);
    a = _Md5.CC(_Md5.HH, T[44], a, b, c, d, block[9], S2[2][0]);
    d = _Md5.CC(_Md5.HH, T[45], d, a, b, c, block[12], S2[2][1]);
    c = _Md5.CC(_Md5.HH, T[46], c, d, a, b, block[15], S2[2][2]);
    b = _Md5.CC(_Md5.HH, T[47], b, c, d, a, block[2], S2[2][3]);
    a = _Md5.CC(_Md5.II, T[48], a, b, c, d, block[0], S2[3][0]);
    d = _Md5.CC(_Md5.II, T[49], d, a, b, c, block[7], S2[3][1]);
    c = _Md5.CC(_Md5.II, T[50], c, d, a, b, block[14], S2[3][2]);
    b = _Md5.CC(_Md5.II, T[51], b, c, d, a, block[5], S2[3][3]);
    a = _Md5.CC(_Md5.II, T[52], a, b, c, d, block[12], S2[3][0]);
    d = _Md5.CC(_Md5.II, T[53], d, a, b, c, block[3], S2[3][1]);
    c = _Md5.CC(_Md5.II, T[54], c, d, a, b, block[10], S2[3][2]);
    b = _Md5.CC(_Md5.II, T[55], b, c, d, a, block[1], S2[3][3]);
    a = _Md5.CC(_Md5.II, T[56], a, b, c, d, block[8], S2[3][0]);
    d = _Md5.CC(_Md5.II, T[57], d, a, b, c, block[15], S2[3][1]);
    c = _Md5.CC(_Md5.II, T[58], c, d, a, b, block[6], S2[3][2]);
    b = _Md5.CC(_Md5.II, T[59], b, c, d, a, block[13], S2[3][3]);
    a = _Md5.CC(_Md5.II, T[60], a, b, c, d, block[4], S2[3][0]);
    d = _Md5.CC(_Md5.II, T[61], d, a, b, c, block[11], S2[3][1]);
    c = _Md5.CC(_Md5.II, T[62], c, d, a, b, block[2], S2[3][2]);
    b = _Md5.CC(_Md5.II, T[63], b, c, d, a, block[9], S2[3][3]);
    this.state.hash[0] = this.state.hash[0] + a | 0;
    this.state.hash[1] = this.state.hash[1] + b | 0;
    this.state.hash[2] = this.state.hash[2] + c | 0;
    this.state.hash[3] = this.state.hash[3] + d | 0;
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 56 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var md5_default = Md5;

// node_modules/crypto-api/src/hasher/ripemd.mjs
var ZL = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  7,
  4,
  13,
  1,
  10,
  6,
  15,
  3,
  12,
  0,
  9,
  5,
  2,
  14,
  11,
  8,
  3,
  10,
  14,
  4,
  9,
  15,
  8,
  1,
  2,
  7,
  0,
  6,
  13,
  11,
  5,
  12,
  1,
  9,
  11,
  10,
  0,
  8,
  12,
  4,
  13,
  3,
  7,
  15,
  14,
  5,
  6,
  2,
  4,
  0,
  5,
  9,
  7,
  12,
  2,
  10,
  14,
  1,
  3,
  8,
  11,
  6,
  15,
  13
];
var ZR = [
  5,
  14,
  7,
  0,
  9,
  2,
  11,
  4,
  13,
  6,
  15,
  8,
  1,
  10,
  3,
  12,
  6,
  11,
  3,
  7,
  0,
  13,
  5,
  10,
  14,
  15,
  8,
  12,
  4,
  9,
  1,
  2,
  15,
  5,
  1,
  3,
  7,
  14,
  6,
  9,
  11,
  8,
  12,
  2,
  10,
  0,
  4,
  13,
  8,
  6,
  4,
  1,
  3,
  11,
  15,
  0,
  5,
  12,
  2,
  13,
  9,
  7,
  10,
  14,
  12,
  15,
  10,
  4,
  1,
  5,
  8,
  7,
  6,
  2,
  13,
  14,
  0,
  3,
  9,
  11
];
var SL = [
  11,
  14,
  15,
  12,
  5,
  8,
  7,
  9,
  11,
  13,
  14,
  15,
  6,
  7,
  9,
  8,
  7,
  6,
  8,
  13,
  11,
  9,
  7,
  15,
  7,
  12,
  15,
  9,
  11,
  7,
  13,
  12,
  11,
  13,
  6,
  7,
  14,
  9,
  13,
  15,
  14,
  8,
  13,
  6,
  5,
  12,
  7,
  5,
  11,
  12,
  14,
  15,
  14,
  15,
  9,
  8,
  9,
  14,
  5,
  6,
  8,
  6,
  5,
  12,
  9,
  15,
  5,
  11,
  6,
  8,
  13,
  12,
  5,
  12,
  13,
  14,
  11,
  8,
  5,
  6
];
var SR = [
  8,
  9,
  9,
  11,
  13,
  15,
  15,
  5,
  7,
  7,
  8,
  11,
  14,
  14,
  12,
  6,
  9,
  13,
  15,
  7,
  12,
  8,
  9,
  11,
  7,
  7,
  12,
  7,
  6,
  15,
  13,
  11,
  9,
  7,
  15,
  11,
  8,
  6,
  6,
  14,
  12,
  13,
  5,
  14,
  13,
  13,
  7,
  5,
  15,
  5,
  8,
  11,
  14,
  14,
  6,
  14,
  6,
  9,
  12,
  9,
  12,
  5,
  15,
  8,
  8,
  5,
  12,
  9,
  12,
  5,
  14,
  6,
  8,
  13,
  6,
  5,
  15,
  13,
  11,
  11
];
var Ripemd = class _Ripemd extends hasher32le_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.length=160] - Length of hash result
   *
   * | Hash type | Length |
   * |-----------|--------|
   * | ripemd128 | 128    |
   * | ripemd160 | 160    |
   * | ripemd256 | 256    |
   * | ripemd320 | 320    |
   */
  constructor(options) {
    options = options || {};
    options.length = options.length || 160;
    super(options);
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    switch (this.options.length) {
      case 128:
        this.state.hash = [1732584193, 4023233417, 2562383102, 271733878];
        this.processBlock = this.processBlock128;
        break;
      case 256:
        this.state.hash = [
          1732584193,
          4023233417,
          2562383102,
          271733878,
          1985229328,
          4275878552,
          2309737967,
          19088743
        ];
        this.processBlock = this.processBlock256;
        break;
      case 320:
        this.state.hash = [
          1732584193,
          4023233417,
          2562383102,
          271733878,
          3285377520,
          1985229328,
          4275878552,
          2309737967,
          19088743,
          1009589775
        ];
        this.processBlock = this.processBlock320;
        break;
      default:
        this.state.hash = [
          1732584193,
          4023233417,
          2562383102,
          271733878,
          3285377520
        ];
        this.processBlock = this.processBlock160;
    }
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static F(x, y, z) {
    return x ^ y ^ z;
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static G(x, y, z) {
    return x & y | ~x & z;
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static H(x, y, z) {
    return (x | ~y) ^ z;
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static I(x, y, z) {
    return x & z | y & ~z;
  }
  /**
   * @private
   * @ignore
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  static J(x, y, z) {
    return x ^ (y | ~z);
  }
  /**
   * @private
   * @ignore
   * @param {number} i
   * @param {number} bl
   * @param {number} cl
   * @param {number} dl
   * @returns {number}
   */
  static T(i, bl, cl, dl) {
    if (i < 16) {
      return this.F(bl, cl, dl);
    }
    if (i < 32) {
      return this.G(bl, cl, dl) + 1518500249 | 0;
    }
    if (i < 48) {
      return this.H(bl, cl, dl) + 1859775393 | 0;
    }
    if (i < 64) {
      return this.I(bl, cl, dl) + 2400959708 | 0;
    }
    return this.J(bl, cl, dl) + 2840853838 | 0;
  }
  /**
   * @private
   * @ignore
   * @param {number} i
   * @param {number} br
   * @param {number} cr
   * @param {number} dr
   * @returns {number}
   */
  static T64(i, br, cr, dr) {
    if (i < 16) {
      return this.I(br, cr, dr) + 1352829926 | 0;
    }
    if (i < 32) {
      return this.H(br, cr, dr) + 1548603684 | 0;
    }
    if (i < 48) {
      return this.G(br, cr, dr) + 1836072691 | 0;
    }
    return this.F(br, cr, dr);
  }
  /**
   * @private
   * @ignore
   * @param {number} i
   * @param {number} br
   * @param {number} cr
   * @param {number} dr
   * @returns {number}
   */
  static T80(i, br, cr, dr) {
    if (i < 16) {
      return this.J(br, cr, dr) + 1352829926 | 0;
    }
    if (i < 32) {
      return this.I(br, cr, dr) + 1548603684 | 0;
    }
    if (i < 48) {
      return this.H(br, cr, dr) + 1836072691 | 0;
    }
    if (i < 64) {
      return this.G(br, cr, dr) + 2053994217 | 0;
    }
    return this.F(br, cr, dr);
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock128(block) {
    let al = this.state.hash[0] | 0;
    let bl = this.state.hash[1] | 0;
    let cl = this.state.hash[2] | 0;
    let dl = this.state.hash[3] | 0;
    let ar = al;
    let br = bl;
    let cr = cl;
    let dr = dl;
    for (let i = 0; i < 64; i++) {
      let t2 = al + block[ZL[i]] | 0;
      t2 = t2 + _Ripemd.T(i, bl, cl, dl) | 0;
      t2 = rotateLeft(t2, SL[i]);
      al = dl;
      dl = cl;
      cl = bl;
      bl = t2;
      t2 = ar + block[ZR[i]] | 0;
      t2 = t2 + _Ripemd.T64(i, br, cr, dr) | 0;
      t2 = rotateLeft(t2, SR[i]);
      ar = dr;
      dr = cr;
      cr = br;
      br = t2;
    }
    let t = this.state.hash[1] + cl + dr | 0;
    this.state.hash[1] = this.state.hash[2] + dl + ar | 0;
    this.state.hash[2] = this.state.hash[3] + al + br | 0;
    this.state.hash[3] = this.state.hash[0] + bl + cr | 0;
    this.state.hash[0] = t;
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock160(block) {
    let al = this.state.hash[0] | 0;
    let bl = this.state.hash[1] | 0;
    let cl = this.state.hash[2] | 0;
    let dl = this.state.hash[3] | 0;
    let el = this.state.hash[4] | 0;
    let ar = al;
    let br = bl;
    let cr = cl;
    let dr = dl;
    let er = el;
    for (let i = 0; i < 80; i++) {
      let t2 = al + block[ZL[i]] | 0;
      t2 = t2 + _Ripemd.T(i, bl, cl, dl) | 0;
      t2 = rotateLeft(t2, SL[i]);
      t2 = t2 + el | 0;
      al = el;
      el = dl;
      dl = rotateLeft(cl, 10);
      cl = bl;
      bl = t2;
      t2 = ar + block[ZR[i]] | 0;
      t2 = t2 + _Ripemd.T80(i, br, cr, dr) | 0;
      t2 = rotateLeft(t2, SR[i]);
      t2 = t2 + er | 0;
      ar = er;
      er = dr;
      dr = rotateLeft(cr, 10);
      cr = br;
      br = t2;
    }
    let t = this.state.hash[1] + cl + dr | 0;
    this.state.hash[1] = this.state.hash[2] + dl + er | 0;
    this.state.hash[2] = this.state.hash[3] + el + ar | 0;
    this.state.hash[3] = this.state.hash[4] + al + br | 0;
    this.state.hash[4] = this.state.hash[0] + bl + cr | 0;
    this.state.hash[0] = t;
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock256(block) {
    let al = this.state.hash[0] | 0;
    let bl = this.state.hash[1] | 0;
    let cl = this.state.hash[2] | 0;
    let dl = this.state.hash[3] | 0;
    let ar = this.state.hash[4] | 0;
    let br = this.state.hash[5] | 0;
    let cr = this.state.hash[6] | 0;
    let dr = this.state.hash[7] | 0;
    for (let i = 0; i < 64; i += 1) {
      let t = al + block[ZL[i]] | 0;
      t = t + _Ripemd.T(i, bl, cl, dl) | 0;
      t = rotateLeft(t, SL[i]);
      al = dl;
      dl = cl;
      cl = bl;
      bl = t;
      t = ar + block[ZR[i]] | 0;
      t = t + _Ripemd.T64(i, br, cr, dr) | 0;
      t = rotateLeft(t, SR[i]);
      ar = dr;
      dr = cr;
      cr = br;
      br = t;
      switch (i) {
        case 15:
          t = al;
          al = ar;
          ar = t;
          break;
        case 31:
          t = bl;
          bl = br;
          br = t;
          break;
        case 47:
          t = cl;
          cl = cr;
          cr = t;
          break;
        case 63:
          t = dl;
          dl = dr;
          dr = t;
          break;
      }
    }
    this.state.hash[0] = this.state.hash[0] + al | 0;
    this.state.hash[1] = this.state.hash[1] + bl | 0;
    this.state.hash[2] = this.state.hash[2] + cl | 0;
    this.state.hash[3] = this.state.hash[3] + dl | 0;
    this.state.hash[4] = this.state.hash[4] + ar | 0;
    this.state.hash[5] = this.state.hash[5] + br | 0;
    this.state.hash[6] = this.state.hash[6] + cr | 0;
    this.state.hash[7] = this.state.hash[7] + dr | 0;
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock320(block) {
    let al = this.state.hash[0] | 0;
    let bl = this.state.hash[1] | 0;
    let cl = this.state.hash[2] | 0;
    let dl = this.state.hash[3] | 0;
    let el = this.state.hash[4] | 0;
    let ar = this.state.hash[5] | 0;
    let br = this.state.hash[6] | 0;
    let cr = this.state.hash[7] | 0;
    let dr = this.state.hash[8] | 0;
    let er = this.state.hash[9] | 0;
    for (let i = 0; i < 80; i += 1) {
      let t = al + block[ZL[i]] | 0;
      t = t + _Ripemd.T(i, bl, cl, dl) | 0;
      t = rotateLeft(t, SL[i]);
      t = t + el | 0;
      al = el;
      el = dl;
      dl = rotateLeft(cl, 10);
      cl = bl;
      bl = t;
      t = ar + block[ZR[i]] | 0;
      t = t + _Ripemd.T80(i, br, cr, dr) | 0;
      t = rotateLeft(t, SR[i]);
      t = t + er | 0;
      ar = er;
      er = dr;
      dr = rotateLeft(cr, 10);
      cr = br;
      br = t;
      switch (i) {
        case 15:
          t = bl;
          bl = br;
          br = t;
          break;
        case 31:
          t = dl;
          dl = dr;
          dr = t;
          break;
        case 47:
          t = al;
          al = ar;
          ar = t;
          break;
        case 63:
          t = cl;
          cl = cr;
          cr = t;
          break;
        case 79:
          t = el;
          el = er;
          er = t;
          break;
      }
    }
    this.state.hash[0] = this.state.hash[0] + al | 0;
    this.state.hash[1] = this.state.hash[1] + bl | 0;
    this.state.hash[2] = this.state.hash[2] + cl | 0;
    this.state.hash[3] = this.state.hash[3] + dl | 0;
    this.state.hash[4] = this.state.hash[4] + el | 0;
    this.state.hash[5] = this.state.hash[5] + ar | 0;
    this.state.hash[6] = this.state.hash[6] + br | 0;
    this.state.hash[7] = this.state.hash[7] + cr | 0;
    this.state.hash[8] = this.state.hash[8] + dr | 0;
    this.state.hash[9] = this.state.hash[9] + er | 0;
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 56 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var ripemd_default = Ripemd;

// node_modules/crypto-api/src/hasher/hasher32be.mjs
var Hasher32be = class extends hasher_default {
  /**
   * @param {Object} [options]
   */
  constructor(options) {
    super(options);
    this.unitOrder = 1;
    this.blockUnits = [];
  }
  /**
   * Process ready blocks
   *
   * @protected
   */
  process() {
    while (this.state.message.length >= this.blockSizeInBytes) {
      this.blockUnits = [];
      for (let b = 0; b < this.blockSizeInBytes; b += 4) {
        this.blockUnits.push(
          this.state.message.charCodeAt(b) << 24 | this.state.message.charCodeAt(b + 1) << 16 | this.state.message.charCodeAt(b + 2) << 8 | this.state.message.charCodeAt(b + 3)
        );
      }
      this.state.message = this.state.message.substr(this.blockSizeInBytes);
      this.processBlock(this.blockUnits);
    }
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @param {number[]} M
   */
  processBlock(M) {
  }
  /**
   * Get hash from state
   *
   * @protected
   * @param {number} [size=this.state.hash.length] - Limit hash size (in chunks)
   * @returns {string}
   */
  getStateHash(size) {
    size = size || this.state.hash.length;
    let hash = "";
    for (let i = 0; i < size; i++) {
      hash += String.fromCharCode(this.state.hash[i] >> 24 & 255) + String.fromCharCode(this.state.hash[i] >> 16 & 255) + String.fromCharCode(this.state.hash[i] >> 8 & 255) + String.fromCharCode(this.state.hash[i] & 255);
    }
    return hash;
  }
  /**
   * Add to message cumulative size of message in bits
   *
   * @protected
   */
  addLengthBits() {
    this.state.message += "\0\0\0" + String.fromCharCode(this.state.length >> 29 & 255) + String.fromCharCode(this.state.length >> 21 & 255) + String.fromCharCode(this.state.length >> 13 & 255) + String.fromCharCode(this.state.length >> 5 & 255) + String.fromCharCode(this.state.length << 3 & 255);
  }
};
var hasher32be_default = Hasher32be;

// node_modules/crypto-api/src/hasher/sha0.mjs
var K2 = [1518500249, 1859775393, 2400959708, 3395469782];
var Sha0 = class extends hasher32be_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.rounds=80] - Number of rounds (Must be greater than 16)
   */
  constructor(options) {
    super(options);
    this.options.rounds = this.options.rounds || 80;
    this.W = new Array(80);
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = [
      1732584193 | 0,
      4023233417 | 0,
      2562383102 | 0,
      271733878 | 0,
      3285377520 | 0
    ];
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let a = this.state.hash[0] | 0;
    let b = this.state.hash[1] | 0;
    let c = this.state.hash[2] | 0;
    let d = this.state.hash[3] | 0;
    let e = this.state.hash[4] | 0;
    for (let i = 0; i < this.options.rounds; i++) {
      if (i < 16) {
        this.W[i] = block[i] | 0;
      } else {
        this.W[i] = this.W[i - 3] ^ this.W[i - 8] ^ this.W[i - 14] ^ this.W[i - 16] | 0;
      }
      let t = rotateLeft(a, 5) + e + this.W[i] + K2[i / 20 >> 0] | 0;
      if (i < 20) {
        t = t + (b & c | ~b & d) | 0;
      } else if (i < 40) {
        t = t + (b ^ c ^ d) | 0;
      } else if (i < 60) {
        t = t + (b & c | b & d | c & d) | 0;
      } else {
        t = t + (b ^ c ^ d) | 0;
      }
      e = d;
      d = c;
      c = rotateLeft(b, 30) | 0;
      b = a;
      a = t;
    }
    this.state.hash[0] = this.state.hash[0] + a | 0;
    this.state.hash[1] = this.state.hash[1] + b | 0;
    this.state.hash[2] = this.state.hash[2] + c | 0;
    this.state.hash[3] = this.state.hash[3] + d | 0;
    this.state.hash[4] = this.state.hash[4] + e | 0;
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 56 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var sha0_default = Sha0;

// node_modules/crypto-api/src/hasher/sha1.mjs
var K3 = [1518500249, 1859775393, 2400959708, 3395469782];
var Sha1 = class extends hasher32be_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.rounds=80] - Number of rounds (Must be greater than 16)
   */
  constructor(options) {
    super(options);
    this.options.rounds = this.options.rounds || 80;
    this.W = new Array(80);
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = [
      1732584193 | 0,
      4023233417 | 0,
      2562383102 | 0,
      271733878 | 0,
      3285377520 | 0
    ];
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let a = this.state.hash[0] | 0;
    let b = this.state.hash[1] | 0;
    let c = this.state.hash[2] | 0;
    let d = this.state.hash[3] | 0;
    let e = this.state.hash[4] | 0;
    for (let i = 0; i < this.options.rounds; i++) {
      if (i < 16) {
        this.W[i] = block[i] | 0;
      } else {
        this.W[i] = rotateLeft(this.W[i - 3] ^ this.W[i - 8] ^ this.W[i - 14] ^ this.W[i - 16], 1) | 0;
      }
      let t = rotateLeft(a, 5) + e + this.W[i] + K3[i / 20 >> 0] | 0;
      if (i < 20) {
        t = t + (b & c | ~b & d) | 0;
      } else if (i < 40) {
        t = t + (b ^ c ^ d) | 0;
      } else if (i < 60) {
        t = t + (b & c | b & d | c & d) | 0;
      } else {
        t = t + (b ^ c ^ d) | 0;
      }
      e = d;
      d = c;
      c = rotateLeft(b, 30) | 0;
      b = a;
      a = t;
    }
    this.state.hash[0] = this.state.hash[0] + a | 0;
    this.state.hash[1] = this.state.hash[1] + b | 0;
    this.state.hash[2] = this.state.hash[2] + c | 0;
    this.state.hash[3] = this.state.hash[3] + d | 0;
    this.state.hash[4] = this.state.hash[4] + e | 0;
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 56 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var sha1_default = Sha1;

// node_modules/crypto-api/src/hasher/sha256.mjs
var K4 = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
];
var Sha256 = class extends hasher32be_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.rounds=64] - Number of rounds (Must be greater than 16)
   * @param {number} [options.length=256] - Length of hash result
   *
   * | Hash type | Length |
   * |-----------|--------|
   * | sha224    | 224    |
   * | sha256    | 256    |
   */
  constructor(options) {
    options = options || {};
    options.length = options.length || 256;
    options.rounds = options.rounds || 64;
    super(options);
    this.W = new Array(64);
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    switch (this.options.length) {
      case 224:
        this.state.hash = [
          3238371032 | 0,
          914150663 | 0,
          812702999 | 0,
          4144912697 | 0,
          4290775857 | 0,
          1750603025 | 0,
          1694076839 | 0,
          3204075428 | 0
        ];
        break;
      default:
        this.state.hash = [
          1779033703 | 0,
          3144134277 | 0,
          1013904242 | 0,
          2773480762 | 0,
          1359893119 | 0,
          2600822924 | 0,
          528734635 | 0,
          1541459225 | 0
        ];
    }
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let a = this.state.hash[0] | 0;
    let b = this.state.hash[1] | 0;
    let c = this.state.hash[2] | 0;
    let d = this.state.hash[3] | 0;
    let e = this.state.hash[4] | 0;
    let f = this.state.hash[5] | 0;
    let g = this.state.hash[6] | 0;
    let h = this.state.hash[7] | 0;
    for (let i = 0; i < this.options.rounds; i++) {
      if (i < 16) {
        this.W[i] = block[i] | 0;
      } else {
        this.W[i] = this.W[i - 16] + (rotateRight(this.W[i - 15], 7) ^ rotateRight(this.W[i - 15], 18) ^ this.W[i - 15] >>> 3) + this.W[i - 7] + (rotateRight(this.W[i - 2], 17) ^ rotateRight(this.W[i - 2], 19) ^ this.W[i - 2] >>> 10) | 0;
      }
      let t1 = h + (rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)) + (e & f ^ ~e & g) + K4[i] + this.W[i] | 0;
      let t2 = (rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)) + (a & b ^ a & c ^ b & c) | 0;
      h = g;
      g = f;
      f = e;
      e = d + t1 | 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 | 0;
    }
    this.state.hash[0] = this.state.hash[0] + a | 0;
    this.state.hash[1] = this.state.hash[1] + b | 0;
    this.state.hash[2] = this.state.hash[2] + c | 0;
    this.state.hash[3] = this.state.hash[3] + d | 0;
    this.state.hash[4] = this.state.hash[4] + e | 0;
    this.state.hash[5] = this.state.hash[5] + f | 0;
    this.state.hash[6] = this.state.hash[6] + g | 0;
    this.state.hash[7] = this.state.hash[7] + h | 0;
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 56 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash(this.options.length / 32 | 0);
  }
};
var sha256_default = Sha256;

// node_modules/crypto-api/src/hasher/sha512.mjs
var K5 = [
  1116352408,
  3609767458,
  1899447441,
  602891725,
  3049323471,
  3964484399,
  3921009573,
  2173295548,
  961987163,
  4081628472,
  1508970993,
  3053834265,
  2453635748,
  2937671579,
  2870763221,
  3664609560,
  3624381080,
  2734883394,
  310598401,
  1164996542,
  607225278,
  1323610764,
  1426881987,
  3590304994,
  1925078388,
  4068182383,
  2162078206,
  991336113,
  2614888103,
  633803317,
  3248222580,
  3479774868,
  3835390401,
  2666613458,
  4022224774,
  944711139,
  264347078,
  2341262773,
  604807628,
  2007800933,
  770255983,
  1495990901,
  1249150122,
  1856431235,
  1555081692,
  3175218132,
  1996064986,
  2198950837,
  2554220882,
  3999719339,
  2821834349,
  766784016,
  2952996808,
  2566594879,
  3210313671,
  3203337956,
  3336571891,
  1034457026,
  3584528711,
  2466948901,
  113926993,
  3758326383,
  338241895,
  168717936,
  666307205,
  1188179964,
  773529912,
  1546045734,
  1294757372,
  1522805485,
  1396182291,
  2643833823,
  1695183700,
  2343527390,
  1986661051,
  1014477480,
  2177026350,
  1206759142,
  2456956037,
  344077627,
  2730485921,
  1290863460,
  2820302411,
  3158454273,
  3259730800,
  3505952657,
  3345764771,
  106217008,
  3516065817,
  3606008344,
  3600352804,
  1432725776,
  4094571909,
  1467031594,
  275423344,
  851169720,
  430227734,
  3100823752,
  506948616,
  1363258195,
  659060556,
  3750685593,
  883997877,
  3785050280,
  958139571,
  3318307427,
  1322822218,
  3812723403,
  1537002063,
  2003034995,
  1747873779,
  3602036899,
  1955562222,
  1575990012,
  2024104815,
  1125592928,
  2227730452,
  2716904306,
  2361852424,
  442776044,
  2428436474,
  593698344,
  2756734187,
  3733110249,
  3204031479,
  2999351573,
  3329325298,
  3815920427,
  3391569614,
  3928383900,
  3515267271,
  566280711,
  3940187606,
  3454069534,
  4118630271,
  4000239992,
  116418474,
  1914138554,
  174292421,
  2731055270,
  289380356,
  3203993006,
  460393269,
  320620315,
  685471733,
  587496836,
  852142971,
  1086792851,
  1017036298,
  365543100,
  1126000580,
  2618297676,
  1288033470,
  3409855158,
  1501505948,
  4234509866,
  1607167915,
  987167468,
  1816402316,
  1246189591
];
var Sha512 = class _Sha512 extends hasher32be_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.rounds=160] - Number of rounds (Must be greater than 32)
   * @param {number} [options.length=512] - Length of hash result (Can be from 32 to 480 with step 32)
   *
   * | Hash type  | Length |
   * |------------|--------|
   * | sha384     | 384    |
   * | sha512     | 512    |
   * | sha512/224 | 224    |
   * | sha512/256 | 256    |
   */
  constructor(options) {
    options = options || {};
    options.length = options.length || 512;
    options.rounds = options.rounds || 160;
    super(options);
    this.blockSize = 32;
    this.blockSizeInBytes = this.blockSize * this.unitSize;
    this.W = new Array(160);
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    switch (this.options.length) {
      case 384:
        this.state.hash = [
          3418070365 | 0,
          3238371032 | 0,
          1654270250 | 0,
          914150663 | 0,
          2438529370 | 0,
          812702999 | 0,
          355462360 | 0,
          4144912697 | 0,
          1731405415 | 0,
          4290775857 | 0,
          2394180231 | 0,
          1750603025 | 0,
          3675008525 | 0,
          1694076839 | 0,
          1203062813 | 0,
          3204075428 | 0
        ];
        break;
      case 512:
        this.state.hash = [
          1779033703 | 0,
          4089235720 | 0,
          3144134277 | 0,
          2227873595 | 0,
          1013904242 | 0,
          4271175723 | 0,
          2773480762 | 0,
          1595750129 | 0,
          1359893119 | 0,
          2917565137 | 0,
          2600822924 | 0,
          725511199 | 0,
          528734635 | 0,
          4215389547 | 0,
          1541459225 | 0,
          327033209 | 0
        ];
        break;
      default:
        const hasher = new _Sha512();
        for (let i = 0; i < 16; i++) {
          hasher.state.hash[i] = hasher.state.hash[i] ^ 2779096485;
        }
        hasher.update("SHA-512/" + this.options.length);
        const hash = hasher.finalize();
        this.state.hash = [];
        for (let b = 0; b < 64; b += 4) {
          this.state.hash.push(
            hash.charCodeAt(b) << 24 | hash.charCodeAt(b + 1) << 16 | hash.charCodeAt(b + 2) << 8 | hash.charCodeAt(b + 3)
          );
        }
    }
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let ah = this.state.hash[0];
    let al = this.state.hash[1];
    let bh = this.state.hash[2];
    let bl = this.state.hash[3];
    let ch = this.state.hash[4];
    let cl = this.state.hash[5];
    let dh = this.state.hash[6];
    let dl = this.state.hash[7];
    let eh = this.state.hash[8];
    let el = this.state.hash[9];
    let fh = this.state.hash[10];
    let fl = this.state.hash[11];
    let gh = this.state.hash[12];
    let gl = this.state.hash[13];
    let hh = this.state.hash[14];
    let hl = this.state.hash[15];
    let s0h, s0l, s1h, s1l;
    for (let i = 0; i < this.options.rounds; i += 2) {
      if (i < 32) {
        this.W[i] = block[i];
        this.W[i + 1] = block[i + 1];
      } else {
        s0h = rotateRight64hi(this.W[i - 30], this.W[i - 29], 1) ^ rotateRight64hi(this.W[i - 30], this.W[i - 29], 8) ^ this.W[i - 30] >>> 7;
        s0l = rotateRight64lo(this.W[i - 30], this.W[i - 29], 1) ^ rotateRight64lo(this.W[i - 30], this.W[i - 29], 8) ^ (this.W[i - 29] >>> 7 | this.W[i - 30] << 25);
        s1h = rotateRight64hi(this.W[i - 4], this.W[i - 3], 19) ^ rotateRight64hi(this.W[i - 4], this.W[i - 3], 61) ^ this.W[i - 4] >>> 6;
        s1l = rotateRight64lo(this.W[i - 4], this.W[i - 3], 19) ^ rotateRight64lo(this.W[i - 4], this.W[i - 3], 61) ^ (this.W[i - 3] >>> 6 | this.W[i - 4] << 26);
        let c1 = (this.W[i - 13] & 65535) + (this.W[i - 31] & 65535) + (s0l & 65535) + (s1l & 65535) | 0;
        let c2 = (this.W[i - 13] >>> 16) + (this.W[i - 31] >>> 16) + (s0l >>> 16) + (s1l >>> 16) + (c1 >>> 16) | 0;
        let c3 = (this.W[i - 14] & 65535) + (this.W[i - 32] & 65535) + (s0h & 65535) + (s1h & 65535) + (c2 >>> 16) | 0;
        let c4 = (this.W[i - 14] >>> 16) + (this.W[i - 32] >>> 16) + (s0h >>> 16) + (s1h >>> 16) + (c3 >>> 16) | 0;
        this.W[i] = (c4 << 16 | c3 & 65535) & 4294967295;
        this.W[i + 1] = (c2 << 16 | c1 & 65535) & 4294967295;
      }
      s0h = rotateRight64hi(ah, al, 28) ^ rotateRight64hi(ah, al, 34) ^ rotateRight64hi(ah, al, 39);
      s0l = rotateRight64lo(ah, al, 28) ^ rotateRight64lo(ah, al, 34) ^ rotateRight64lo(ah, al, 39);
      s1h = rotateRight64hi(eh, el, 14) ^ rotateRight64hi(eh, el, 18) ^ rotateRight64hi(eh, el, 41);
      s1l = rotateRight64lo(eh, el, 14) ^ rotateRight64lo(eh, el, 18) ^ rotateRight64lo(eh, el, 41);
      let chh = eh & fh ^ ~eh & gh;
      let chl = el & fl ^ ~el & gl;
      let majh = ah & bh ^ ah & ch ^ bh & ch;
      let majl = al & bl ^ al & cl ^ bl & cl;
      let t1l = hl + s1l | 0;
      let t1h = hh + s1h + (t1l >>> 0 < hl >>> 0 ? 1 : 0) | 0;
      t1l = t1l + chl | 0;
      t1h = t1h + chh + (t1l >>> 0 < chl >>> 0 ? 1 : 0) | 0;
      t1l = t1l + K5[i + 1] | 0;
      t1h = t1h + K5[i] + (t1l >>> 0 < K5[i + 1] >>> 0 ? 1 : 0) | 0;
      t1l = t1l + this.W[i + 1] | 0;
      t1h = t1h + this.W[i] + (t1l >>> 0 < this.W[i + 1] >>> 0 ? 1 : 0) | 0;
      let t2l = s0l + majl | 0;
      let t2h = s0h + majh + (t2l >>> 0 < s0l >>> 0 ? 1 : 0) | 0;
      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;
      el = dl + t1l | 0;
      eh = dh + t1h + (el >>> 0 < dl >>> 0 ? 1 : 0) | 0;
      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;
      al = t1l + t2l | 0;
      ah = t1h + t2h + (al >>> 0 < t1l >>> 0 ? 1 : 0) | 0;
    }
    this.state.hash[1] = this.state.hash[1] + al | 0;
    this.state.hash[0] = this.state.hash[0] + ah + (this.state.hash[1] >>> 0 < al >>> 0 ? 1 : 0) | 0;
    this.state.hash[3] = this.state.hash[3] + bl | 0;
    this.state.hash[2] = this.state.hash[2] + bh + (this.state.hash[3] >>> 0 < bl >>> 0 ? 1 : 0) | 0;
    this.state.hash[5] = this.state.hash[5] + cl | 0;
    this.state.hash[4] = this.state.hash[4] + ch + (this.state.hash[5] >>> 0 < cl >>> 0 ? 1 : 0) | 0;
    this.state.hash[7] = this.state.hash[7] + dl | 0;
    this.state.hash[6] = this.state.hash[6] + dh + (this.state.hash[7] >>> 0 < dl >>> 0 ? 1 : 0) | 0;
    this.state.hash[9] = this.state.hash[9] + el | 0;
    this.state.hash[8] = this.state.hash[8] + eh + (this.state.hash[9] >>> 0 < el >>> 0 ? 1 : 0) | 0;
    this.state.hash[11] = this.state.hash[11] + fl | 0;
    this.state.hash[10] = this.state.hash[10] + fh + (this.state.hash[11] >>> 0 < fl >>> 0 ? 1 : 0) | 0;
    this.state.hash[13] = this.state.hash[13] + gl | 0;
    this.state.hash[12] = this.state.hash[12] + gh + (this.state.hash[13] >>> 0 < gl >>> 0 ? 1 : 0) | 0;
    this.state.hash[15] = this.state.hash[15] + hl | 0;
    this.state.hash[14] = this.state.hash[14] + hh + (this.state.hash[15] >>> 0 < hl >>> 0 ? 1 : 0) | 0;
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 112 ? 112 - this.state.message.length | 0 : 240 - this.state.message.length | 0
    );
    this.state.message += "\0\0\0\0\0\0\0\0";
    this.addLengthBits();
    this.process();
    return this.getStateHash(this.options.length / 32 | 0);
  }
};
var sha512_default = Sha512;

// node_modules/crypto-api/src/hasher/snefru.mjs
var randTable = [
  10097,
  32533,
  76520,
  13586,
  34673,
  54876,
  80959,
  9117,
  39292,
  74945,
  37542,
  4805,
  64894,
  74296,
  24805,
  24037,
  20636,
  10402,
  822,
  91665,
  8422,
  68953,
  19645,
  9303,
  23209,
  2560,
  15953,
  34764,
  35080,
  33606,
  99019,
  2529,
  9376,
  70715,
  38311,
  31165,
  88676,
  74397,
  4436,
  27659,
  12807,
  99970,
  80157,
  36147,
  64032,
  36653,
  98951,
  16877,
  12171,
  76833,
  66065,
  74717,
  34072,
  76850,
  36697,
  36170,
  65813,
  39885,
  11199,
  29170,
  31060,
  10805,
  45571,
  82406,
  35303,
  42614,
  86799,
  7439,
  23403,
  9732,
  85269,
  77602,
  2051,
  65692,
  68665,
  74818,
  73053,
  85247,
  18623,
  88579,
  63573,
  32135,
  5325,
  47048,
  90553,
  57548,
  28468,
  28709,
  83491,
  25624,
  73796,
  45753,
  3529,
  64778,
  35808,
  34282,
  60935,
  20344,
  35273,
  88435,
  98520,
  17767,
  14905,
  68607,
  22109,
  40558,
  60970,
  93433,
  50500,
  73998,
  11805,
  5431,
  39808,
  27732,
  50725,
  68248,
  29405,
  24201,
  52775,
  67851,
  83452,
  99634,
  6288,
  98083,
  13746,
  70078,
  18475,
  40610,
  68711,
  77817,
  88685,
  40200,
  86507,
  58401,
  36766,
  67951,
  90364,
  76493,
  29609,
  11062,
  99594,
  67348,
  87517,
  64969,
  91826,
  8928,
  93785,
  61368,
  23478,
  34113,
  65481,
  17674,
  17468,
  50950,
  58047,
  76974,
  73039,
  57186,
  40218,
  16544,
  80124,
  35635,
  17727,
  8015,
  45318,
  22374,
  21115,
  78253,
  14385,
  53763,
  74350,
  99817,
  77402,
  77214,
  43236,
  210,
  45521,
  64237,
  96286,
  2655,
  69916,
  26803,
  66252,
  29148,
  36936,
  87203,
  76621,
  13990,
  94400,
  56418,
  9893,
  20505,
  14225,
  68514,
  46427,
  56788,
  96297,
  78822,
  54382,
  14598,
  91499,
  14523,
  68479,
  27686,
  46162,
  83554,
  94750,
  89923,
  37089,
  20048,
  80336,
  94598,
  26940,
  36858,
  70297,
  34135,
  53140,
  33340,
  42050,
  82341,
  44104,
  81949,
  85157,
  47954,
  32979,
  26575,
  57600,
  40881,
  22222,
  6413,
  12550,
  73742,
  11100,
  2040,
  12860,
  74697,
  96644,
  89439,
  28707,
  25815,
  63606,
  49329,
  16505,
  34484,
  40219,
  52563,
  43651,
  77082,
  7207,
  31790,
  61196,
  90446,
  26457,
  47774,
  51924,
  33729,
  65394,
  59593,
  42582,
  60527,
  15474,
  45266,
  95270,
  79953,
  59367,
  83848,
  82396,
  10118,
  33211,
  59466,
  94557,
  28573,
  67897,
  54387,
  54622,
  44431,
  91190,
  42592,
  92927,
  45973,
  42481,
  16213,
  97344,
  8721,
  16868,
  48767,
  3071,
  12059,
  25701,
  46670,
  23523,
  78317,
  73208,
  89837,
  68935,
  91416,
  26252,
  29663,
  5522,
  82562,
  4493,
  52494,
  75246,
  33824,
  45862,
  51025,
  61962,
  79335,
  65337,
  12472,
  549,
  97654,
  64051,
  88159,
  96119,
  63896,
  54692,
  82391,
  23287,
  29529,
  35963,
  15307,
  26898,
  9354,
  33351,
  35462,
  77974,
  50024,
  90103,
  39333,
  59808,
  8391,
  45427,
  26842,
  83609,
  49700,
  13021,
  24892,
  78565,
  20106,
  46058,
  85236,
  1390,
  92286,
  77281,
  44077,
  93910,
  83647,
  70617,
  42941,
  32179,
  597,
  87379,
  25241,
  5567,
  7007,
  86743,
  17157,
  85394,
  11838,
  69234,
  61406,
  20117,
  45204,
  15956,
  6e4,
  18743,
  92423,
  97118,
  96338,
  19565,
  41430,
  1758,
  75379,
  40419,
  21585,
  66674,
  36806,
  84962,
  85207,
  45155,
  14938,
  19476,
  7246,
  43667,
  94543,
  59047,
  90033,
  20826,
  69541,
  94864,
  31994,
  36168,
  10851,
  34888,
  81553,
  1540,
  35456,
  5014,
  51176,
  98086,
  24826,
  45240,
  28404,
  44999,
  8896,
  39094,
  73407,
  35441,
  31880,
  33185,
  16232,
  41941,
  50949,
  89435,
  48581,
  88695,
  41994,
  37548,
  73043,
  80951,
  406,
  96382,
  70774,
  20151,
  23387,
  25016,
  25298,
  94624,
  61171,
  79752,
  49140,
  71961,
  28296,
  69861,
  2591,
  74852,
  20539,
  387,
  59579,
  18633,
  32537,
  98145,
  6571,
  31010,
  24674,
  5455,
  61427,
  77938,
  91936,
  74029,
  43902,
  77557,
  32270,
  97790,
  17119,
  52527,
  58021,
  80814,
  51748,
  54178,
  45611,
  80993,
  37143,
  5335,
  12969,
  56127,
  19255,
  36040,
  90324,
  11664,
  49883,
  52079,
  84827,
  59381,
  71539,
  9973,
  33440,
  88461,
  23356,
  48324,
  77928,
  31249,
  64710,
  2295,
  36870,
  32307,
  57546,
  15020,
  9994,
  69074,
  94138,
  87637,
  91976,
  35584,
  4401,
  10518,
  21615,
  1848,
  76938,
  9188,
  20097,
  32825,
  39527,
  4220,
  86304,
  83389,
  87374,
  64278,
  58044,
  90045,
  85497,
  51981,
  50654,
  94938,
  81997,
  91870,
  76150,
  68476,
  64659,
  73189,
  50207,
  47677,
  26269,
  62290,
  64464,
  27124,
  67018,
  41361,
  82760,
  75768,
  76490,
  20971,
  87749,
  90429,
  12272,
  95375,
  5871,
  93823,
  43178,
  54016,
  44056,
  66281,
  31003,
  682,
  27398,
  20714,
  53295,
  7706,
  17813,
  8358,
  69910,
  78542,
  42785,
  13661,
  58873,
  4618,
  97553,
  31223,
  8420,
  28306,
  3264,
  81333,
  10591,
  40510,
  7893,
  32604,
  60475,
  94119,
  1840,
  53840,
  86233,
  81594,
  13628,
  51215,
  90290,
  28466,
  68795,
  77762,
  20791,
  91757,
  53741,
  61613,
  62269,
  50263,
  90212,
  55781,
  76514,
  83483,
  47055,
  89415,
  92694,
  397,
  58391,
  12607,
  17646,
  48949,
  72306,
  94541,
  37408,
  77513,
  3820,
  86864,
  29901,
  68414,
  82774,
  51908,
  13980,
  72893,
  55507,
  19502,
  37174,
  69979,
  20288,
  55210,
  29773,
  74287,
  75251,
  65344,
  67415,
  21818,
  59313,
  93278,
  81757,
  5686,
  73156,
  7082,
  85046,
  31853,
  38452,
  51474,
  66499,
  68107,
  23621,
  94049,
  91345,
  42836,
  9191,
  8007,
  45449,
  99559,
  68331,
  62535,
  24170,
  69777,
  12830,
  74819,
  78142,
  43860,
  72834,
  33713,
  48007,
  93584,
  72869,
  51926,
  64721,
  58303,
  29822,
  93174,
  93972,
  85274,
  86893,
  11303,
  22970,
  28834,
  34137,
  73515,
  90400,
  71148,
  43643,
  84133,
  89640,
  44035,
  52166,
  73852,
  70091,
  61222,
  60561,
  62327,
  18423,
  56732,
  16234,
  17395,
  96131,
  10123,
  91622,
  85496,
  57560,
  81604,
  18880,
  65138,
  56806,
  87648,
  85261,
  34313,
  65861,
  45875,
  21069,
  85644,
  47277,
  38001,
  2176,
  81719,
  11711,
  71602,
  92937,
  74219,
  64049,
  65584,
  49698,
  37402,
  96397,
  1304,
  77586,
  56271,
  10086,
  47324,
  62605,
  40030,
  37438,
  97125,
  40348,
  87083,
  31417,
  21815,
  39250,
  75237,
  62047,
  15501,
  29578,
  21826,
  41134,
  47143,
  34072,
  64638,
  85902,
  49139,
  6441,
  3856,
  54552,
  73135,
  42742,
  95719,
  9035,
  85794,
  74296,
  8789,
  88156,
  64691,
  19202,
  7638,
  77929,
  3061,
  18072,
  96207,
  44156,
  23821,
  99538,
  4713,
  66994,
  60528,
  83441,
  7954,
  19814,
  59175,
  20695,
  5533,
  52139,
  61212,
  6455,
  83596,
  35655,
  6958,
  92983,
  5128,
  9719,
  77433,
  53783,
  92301,
  50498,
  10850,
  62746,
  99599,
  10507,
  13499,
  6319,
  53075,
  71839,
  6410,
  19362,
  39820,
  98952,
  43622,
  63147,
  64421,
  80814,
  43800,
  9351,
  31024,
  73167,
  59580,
  6478,
  75569,
  78800,
  88835,
  54486,
  23768,
  6156,
  4111,
  8408,
  38508,
  7341,
  23793,
  48763,
  90822,
  97022,
  17719,
  4207,
  95954,
  49953,
  30692,
  70668,
  94688,
  16127,
  56196,
  80091,
  82067,
  63400,
  5462,
  69200,
  65443,
  95659,
  18288,
  27437,
  49632,
  24041,
  8337,
  65676,
  96299,
  90836,
  27267,
  50264,
  13192,
  72294,
  7477,
  44606,
  17985,
  48911,
  97341,
  30358,
  91307,
  6991,
  19072,
  24210,
  36699,
  53728,
  28825,
  35793,
  28976,
  66252,
  68434,
  94688,
  84473,
  13622,
  62126,
  98408,
  12843,
  82590,
  9815,
  93146,
  48908,
  15877,
  54745,
  24591,
  35700,
  4754,
  83824,
  52692,
  54130,
  55160,
  6913,
  45197,
  42672,
  78601,
  11883,
  9528,
  63011,
  98901,
  14974,
  40344,
  10455,
  16019,
  14210,
  33712,
  91342,
  37821,
  88325,
  80851,
  43667,
  70883,
  12883,
  97343,
  65027,
  61184,
  4285,
  1392,
  17974,
  15077,
  90712,
  26769,
  21778,
  30976,
  38807,
  36961,
  31649,
  42096,
  63281,
  2023,
  8816,
  47449,
  19523,
  59515,
  65122,
  59659,
  86283,
  68258,
  69572,
  13798,
  16435,
  91529,
  67245,
  52670,
  35583,
  16563,
  79246,
  86686,
  76463,
  34222,
  26655,
  90802,
  60584,
  47377,
  7500,
  37992,
  45134,
  26529,
  26760,
  83637,
  41326,
  44344,
  53853,
  41377,
  36066,
  94850,
  58838,
  73859,
  49364,
  73331,
  96240,
  43642,
  24637,
  38736,
  74384,
  89342,
  52623,
  7992,
  12369,
  18601,
  3742,
  83873,
  83080,
  12451,
  38992,
  22815,
  7759,
  51777,
  97377,
  27585,
  51972,
  37867,
  16444,
  24334,
  36151,
  99073,
  27493,
  70939,
  85130,
  32552,
  54846,
  54759,
  60790,
  18157,
  57178,
  65762,
  11161,
  78576,
  45819,
  52979,
  65130,
  4860,
  3991,
  10461,
  93716,
  16894,
  66083,
  24653,
  84609,
  58232,
  88618,
  19161,
  38555,
  95554,
  32886,
  59780,
  8355,
  60860,
  29735,
  47762,
  71299,
  23853,
  17546,
  73704,
  92052,
  46215,
  55121,
  29281,
  59076,
  7936,
  27954,
  58909,
  32643,
  52861,
  95819,
  6831,
  911,
  98936,
  76355,
  93779,
  80863,
  514,
  69572,
  68777,
  39510,
  35905,
  14060,
  40619,
  29549,
  69616,
  33564,
  60780,
  24122,
  66591,
  27699,
  6494,
  14845,
  46672,
  61958,
  77100,
  90899,
  75754,
  61196,
  30231,
  92962,
  61773,
  41839,
  55382,
  17267,
  70943,
  78038,
  70267,
  30532,
  21704,
  10274,
  12202,
  39685,
  23309,
  10061,
  68829,
  55986,
  66485,
  3788,
  97599,
  75867,
  20717,
  74416,
  53166,
  35208,
  33374,
  87539,
  8823,
  48228,
  63379,
  85783,
  47619,
  53152,
  67433,
  35663,
  52972,
  16818,
  60311,
  60365,
  94653,
  35075,
  33949,
  42614,
  29297,
  1918,
  28316,
  98953,
  73231,
  83799,
  42402,
  56623,
  34442,
  34994,
  41374,
  70071,
  14736,
  9958,
  18065,
  32960,
  7405,
  36409,
  83232,
  99385,
  41600,
  11133,
  7586,
  15917,
  6253,
  19322,
  53845,
  57620,
  52606,
  66497,
  68646,
  78138,
  66559,
  19640,
  99413,
  11220,
  94747,
  7399,
  37408,
  48509,
  23929,
  27482,
  45476,
  85244,
  35159,
  31751,
  57260,
  68980,
  5339,
  15470,
  48355,
  88651,
  22596,
  3152,
  19121,
  88492,
  99382,
  14454,
  4504,
  20094,
  98977,
  74843,
  93413,
  22109,
  78508,
  30934,
  47744,
  7481,
  83828,
  73788,
  6533,
  28597,
  20405,
  94205,
  20380,
  22888,
  48893,
  27499,
  98748,
  60530,
  45128,
  74022,
  84617,
  82037,
  10268,
  78212,
  16993,
  35902,
  91386,
  44372,
  15486,
  65741,
  14014,
  87481,
  37220,
  41849,
  84547,
  46850,
  52326,
  34677,
  58300,
  74910,
  64345,
  19325,
  81549,
  46352,
  33049,
  69248,
  93460,
  45305,
  7521,
  61318,
  31855,
  14413,
  70951,
  11087,
  96294,
  14013,
  31792,
  59747,
  67277,
  76503,
  34513,
  39663,
  77544,
  52701,
  8337,
  56303,
  87315,
  16520,
  69676,
  11654,
  99893,
  2181,
  68161,
  57275,
  36898,
  81304,
  48585,
  68652,
  27376,
  92852,
  55866,
  88448,
  3584,
  20857,
  73156,
  70284,
  24326,
  79375,
  95220,
  1159,
  63267,
  10622,
  48391,
  15633,
  84924,
  90415,
  93614,
  33521,
  26665,
  55823,
  47641,
  86225,
  31704,
  92694,
  48297,
  39904,
  2115,
  59589,
  49067,
  66821,
  41575,
  49767,
  4037,
  77613,
  19019,
  88152,
  80,
  20554,
  91409,
  96277,
  48257,
  50816,
  97616,
  38688,
  32486,
  45134,
  63545,
  59404,
  72059,
  43947,
  51680,
  43852,
  59693,
  25163,
  1889,
  70014,
  15021,
  41290,
  67312,
  71857,
  15957,
  68971,
  11403,
  65251,
  7629,
  37239,
  33295,
  5870,
  1119,
  92784,
  26340,
  18477,
  65622,
  36815,
  43625,
  18637,
  37509,
  82444,
  99005,
  4921,
  73701,
  14707,
  93997,
  64397,
  11692,
  5327,
  82162,
  20247,
  81759,
  45197,
  25332,
  83745,
  22567,
  4515,
  25624,
  95096,
  67946,
  48460,
  85558,
  15191,
  18782,
  16930,
  33361,
  83761,
  60873,
  43253,
  84145,
  60833,
  25983,
  1291,
  41349,
  20368,
  7126,
  14387,
  6345,
  80854,
  9279,
  43529,
  6318,
  38384,
  74761,
  41196,
  37480,
  51321,
  92246,
  80088,
  77074,
  88722,
  56736,
  66164,
  49431,
  66919,
  31678,
  72472,
  8,
  80890,
  18002,
  94813,
  31900,
  54155,
  83436,
  35352,
  54131,
  5466,
  55306,
  93128,
  18464,
  74457,
  90561,
  72848,
  11834,
  79982,
  68416,
  39528,
  72484,
  82474,
  25593,
  48545,
  35247,
  18619,
  13674,
  18611,
  19241,
  81616,
  18711,
  53342,
  44276,
  75122,
  11724,
  74627,
  73707,
  58319,
  15997,
  7586,
  16120,
  82641,
  22820,
  92904,
  13141,
  32392,
  19763,
  61199,
  67940,
  90767,
  4235,
  13574,
  17200,
  69902,
  63742,
  78464,
  22501,
  18627,
  90872,
  40188,
  28193,
  29593,
  88627,
  94972,
  11598,
  62095,
  36787,
  441,
  58997,
  34414,
  82157,
  86887,
  55087,
  19152,
  23,
  12302,
  80783,
  32624,
  68691,
  63439,
  75363,
  44989,
  16822,
  36024,
  867,
  76378,
  41605,
  65961,
  73488,
  67049,
  9070,
  93399,
  45547,
  94458,
  74284,
  5041,
  49807,
  20288,
  34060,
  79495,
  4146,
  52162,
  90286,
  54158,
  34243,
  46978,
  35482,
  59362,
  95938,
  91704,
  30552,
  4737,
  21031,
  75051,
  93029,
  47665,
  64382,
  99782,
  93478,
  94015,
  46874,
  32444,
  48277,
  59820,
  96163,
  64654,
  25843,
  41145,
  42820,
  74108,
  88222,
  88570,
  74015,
  25704,
  91035,
  1755,
  14750,
  48968,
  38603,
  62880,
  87873,
  95160,
  59221,
  22304,
  90314,
  72877,
  17334,
  39283,
  4149,
  11748,
  12102,
  80580,
  41867,
  17710,
  59621,
  6554,
  7850,
  73950,
  79552,
  17944,
  5600,
  60478,
  3343,
  25852,
  58905,
  57216,
  39618,
  49856,
  99326,
  66067,
  42792,
  95043,
  52680,
  46780,
  56487,
  9971,
  59481,
  37006,
  22186,
  54244,
  91030,
  45547,
  70818,
  59849,
  96169,
  61459,
  21647,
  87417,
  17198,
  30945,
  57589,
  31732,
  57260,
  47670,
  7654,
  46376,
  25366,
  94746,
  49580,
  69170,
  37403,
  86995,
  90307,
  94304,
  71803,
  26825,
  5511,
  12459,
  91314,
  8345,
  88975,
  35841,
  85771,
  8105,
  59987,
  87112,
  21476,
  14713,
  71181,
  27767,
  43584,
  85301,
  88977,
  29490,
  69714,
  73035,
  41207,
  74699,
  9310,
  13025,
  14338,
  54066,
  15243,
  47724,
  66733,
  47431,
  43905,
  31048,
  56699,
  80217,
  36292,
  98525,
  24335,
  24432,
  24896,
  43277,
  58874,
  11466,
  16082,
  10875,
  62004,
  90391,
  61105,
  57411,
  6368,
  53856,
  30743,
  8670,
  84741,
  54127,
  57326,
  26629,
  19087,
  24472,
  88779,
  30540,
  27886,
  61732,
  75454,
  60311,
  42824,
  37301,
  42678,
  45990,
  43242,
  17374,
  52003,
  70707,
  70214,
  49739,
  71484,
  92003,
  98086,
  76668,
  73209,
  59202,
  11973,
  2902,
  33250,
  78626,
  51594,
  16453,
  94614,
  39014,
  97066,
  83012,
  9832,
  25571,
  77628,
  66692,
  13986,
  99837,
  582,
  81232,
  44987,
  9504,
  96412,
  90193,
  79568,
  44071,
  28091,
  7362,
  97703,
  76447,
  42537,
  98524,
  97831,
  65704,
  9514,
  41468,
  85149,
  49554,
  17994,
  14924,
  39650,
  95294,
  556,
  70481,
  6905,
  94559,
  37559,
  49678,
  53119,
  70312,
  5682,
  66986,
  34099,
  74474,
  20740,
  41615,
  70360,
  64114,
  58660,
  90850,
  64618,
  80620,
  51790,
  11436,
  38072,
  50273,
  93113,
  41794,
  86861,
  24781,
  89683,
  55411,
  85667,
  77535,
  99892,
  41396,
  80504,
  90670,
  8289,
  40902,
  5069,
  95083,
  6783,
  28102,
  57816,
  25807,
  24260,
  71529,
  78920,
  72682,
  7385,
  90726,
  57166,
  98884,
  8583,
  6170,
  97965,
  88302,
  98041,
  21443,
  41808,
  68984,
  83620,
  89747,
  98882,
  60808,
  54444,
  74412,
  81105,
  1176,
  28838,
  36421,
  16489,
  18059,
  51061,
  80940,
  44893,
  10408,
  36222,
  80582,
  71944,
  92638,
  40333,
  67054,
  16067,
  19516,
  90120,
  46759,
  71643,
  13177,
  55292,
  21036,
  82808,
  77501,
  97427,
  49386,
  54480,
  23604,
  23554,
  21785,
  41101,
  91178,
  10174,
  29420,
  90438,
  6312,
  88940,
  15995,
  69321,
  47458,
  64809,
  98189,
  81851,
  29651,
  84215,
  60942,
  307,
  11897,
  92674,
  40405,
  68032,
  96717,
  54244,
  10701,
  41393,
  92329,
  98932,
  78284,
  46347,
  71209,
  92061,
  39448,
  93136,
  25722,
  8564,
  77936,
  63574,
  31384,
  51924,
  85561,
  29671,
  58137,
  17820,
  22751,
  36518,
  38101,
  77756,
  11657,
  13897,
  95889,
  57067,
  47648,
  13885,
  70669,
  93406,
  39641,
  69457,
  91339,
  22502,
  92613,
  89719,
  11947,
  56203,
  19324,
  20504,
  84054,
  40455,
  99396,
  63680,
  67667,
  60631,
  69181,
  96845,
  38525,
  11600,
  47468,
  3577,
  57649,
  63266,
  24700,
  71594,
  14004,
  23153,
  69249,
  5747,
  43321,
  31370,
  28977,
  23896,
  76479,
  68562,
  62342,
  7589,
  8899,
  5985,
  64281,
  61826,
  18555,
  64937,
  13173,
  33365,
  78851,
  16499,
  87064,
  13075,
  66847,
  70495,
  32350,
  2985,
  86716,
  38746,
  26313,
  77463,
  55387,
  72681,
  72461,
  33230,
  21529,
  53424,
  92581,
  2262,
  78438,
  66276,
  18396,
  73538,
  21032,
  91050,
  13058,
  16218,
  12470,
  56500,
  15292,
  76139,
  59526,
  52113,
  95362,
  67011,
  6651,
  16136,
  1016,
  857,
  55018,
  56374,
  35824,
  71708,
  49712,
  97380,
  10404,
  55452,
  34030,
  60726,
  75211,
  10271,
  36633,
  68424,
  58275,
  61764,
  97586,
  54716,
  50259,
  46345,
  87195,
  46092,
  26787,
  60939,
  89514,
  11788,
  68224,
  23417,
  73959,
  76145,
  30342,
  40277,
  11049,
  72049,
  15472,
  50669,
  48139,
  36732,
  46874,
  37088,
  73465,
  9819,
  58869,
  35220,
  12120,
  86124,
  51247,
  44302,
  60883,
  52109,
  21437,
  36786,
  49226,
  77837,
  19612,
  78430,
  11661,
  94770,
  77603,
  65669,
  86868,
  12665,
  30012,
  75989,
  39141,
  77400,
  28e3,
  64238,
  73258,
  71794,
  31340,
  26256,
  66453,
  37016,
  64756,
  80457,
  8747,
  12836,
  3469,
  50678,
  3274,
  43423,
  66677,
  82556,
  92901,
  51878,
  56441,
  22998,
  29718,
  38447,
  6453,
  25311,
  7565,
  53771,
  3551,
  90070,
  9483,
  94050,
  45938,
  18135,
  36908,
  43321,
  11073,
  51803,
  98884,
  66209,
  6830,
  53656,
  14663,
  56346,
  71430,
  4909,
  19818,
  5707,
  27369,
  86882,
  53473,
  7541,
  53633,
  70863,
  3748,
  12822,
  19360,
  49088,
  59066,
  75974,
  63335,
  20483,
  43514,
  37481,
  58278,
  26967,
  49325,
  43951,
  91647,
  93783,
  64169,
  49022,
  98588,
  9495,
  49829,
  59068,
  38831,
  4838,
  83605,
  92419,
  39542,
  7772,
  71568,
  75673,
  35185,
  89759,
  44901,
  74291,
  24895,
  88530,
  70774,
  35439,
  46758,
  70472,
  70207,
  92675,
  91623,
  61275,
  35720,
  26556,
  95596,
  20094,
  73750,
  85788,
  34264,
  1703,
  46833,
  65248,
  14141,
  53410,
  38649,
  6343,
  57256,
  61342,
  72709,
  75318,
  90379,
  37562,
  27416,
  75670,
  92176,
  72535,
  93119,
  56077,
  6886,
  18244,
  92344,
  31374,
  82071,
  7429,
  81007,
  47749,
  40744,
  56974,
  23336,
  88821,
  53841,
  10536,
  21445,
  82793,
  24831,
  93241,
  14199,
  76268,
  70883,
  68002,
  3829,
  17443,
  72513,
  76400,
  52225,
  92348,
  62308,
  98481,
  29744,
  33165,
  33141,
  61020,
  71479,
  45027,
  76160,
  57411,
  13780,
  13632,
  52308,
  77762,
  88874,
  33697,
  83210,
  51466,
  9088,
  50395,
  26743,
  5306,
  21706,
  70001,
  99439,
  80767,
  68749,
  95148,
  94897,
  78636,
  96750,
  9024,
  94538,
  91143,
  96693,
  61886,
  5184,
  75763,
  47075,
  88158,
  5313,
  53439,
  14908,
  8830,
  60096,
  21551,
  13651,
  62546,
  96892,
  25240,
  47511,
  58483,
  87342,
  78818,
  7855,
  39269,
  566,
  21220,
  292,
  24069,
  25072,
  29519,
  52548,
  54091,
  21282,
  21296,
  50958,
  17695,
  58072,
  68990,
  60329,
  95955,
  71586,
  63417,
  35947,
  67807,
  57621,
  64547,
  46850,
  37981,
  38527,
  9037,
  64756,
  3324,
  4986,
  83666,
  9282,
  25844,
  79139,
  78435,
  35428,
  43561,
  69799,
  63314,
  12991,
  93516,
  23394,
  94206,
  93432,
  37836,
  94919,
  26846,
  2555,
  74410,
  94915,
  48199,
  5280,
  37470,
  93622,
  4345,
  15092,
  19510,
  18094,
  16613,
  78234,
  50001,
  95491,
  97976,
  38306,
  32192,
  82639,
  54624,
  72434,
  92606,
  23191,
  74693,
  78521,
  104,
  18248,
  75583,
  90326,
  50785,
  54034,
  66251,
  35774,
  14692,
  96345,
  44579,
  85932,
  44053,
  75704,
  20840,
  86583,
  83944,
  52456,
  73766,
  77963,
  31151,
  32364,
  91691,
  47357,
  40338,
  23435,
  24065,
  8458,
  95366,
  7520,
  11294,
  23238,
  1748,
  41690,
  67328,
  54814,
  37777,
  10057,
  42332,
  38423,
  2309,
  70703,
  85736,
  46148,
  14258,
  29236,
  12152,
  5088,
  65825,
  2463,
  65533,
  21199,
  60555,
  33928,
  1817,
  7396,
  89215,
  30722,
  22102,
  15880,
  92261,
  17292,
  88190,
  61781,
  48898,
  92525,
  21283,
  88581,
  60098,
  71926,
  819,
  59144,
  224,
  30570,
  90194,
  18329,
  6999,
  26857,
  19238,
  64425,
  28108,
  16554,
  16016,
  42,
  83229,
  10333,
  36168,
  65617,
  94834,
  79782,
  23924,
  49440,
  30432,
  81077,
  31543,
  95216,
  64865,
  13658,
  51081,
  35337,
  74538,
  44553,
  64672,
  90960,
  41849,
  93865,
  44608,
  93176,
  34851,
  5249,
  29329,
  19715,
  94082,
  14738,
  86667,
  43708,
  66354,
  93692,
  25527,
  56463,
  99380,
  38793,
  85774,
  19056,
  13939,
  46062,
  27647,
  66146,
  63210,
  96296,
  33121,
  54196,
  34108,
  75814,
  85986,
  71171,
  15102,
  28992,
  63165,
  98380,
  36269,
  60014,
  7201,
  62448,
  46385,
  42175,
  88350,
  46182,
  49126,
  52567,
  64350,
  16315,
  53969,
  80395,
  81114,
  54358,
  64578,
  47269,
  15747,
  78498,
  90830,
  25955,
  99236,
  43286,
  91064,
  99969,
  95144,
  64424,
  77377,
  49553,
  24241,
  8150,
  89535,
  8703,
  91041,
  77323,
  81079,
  45127,
  93686,
  32151,
  7075,
  83155,
  10252,
  73100,
  88618,
  23891,
  87418,
  45417,
  20268,
  11314,
  50363,
  26860,
  27799,
  49416,
  83534,
  19187,
  8059,
  76677,
  2110,
  12364,
  71210,
  87052,
  50241,
  90785,
  97889,
  81399,
  58130,
  64439,
  5614,
  59467,
  58309,
  87834,
  57213,
  37510,
  33689,
  1259,
  62486,
  56320,
  46265,
  73452,
  17619,
  56421,
  40725,
  23439,
  41701,
  93223,
  41682,
  45026,
  47505,
  27635,
  56293,
  91700,
  4391,
  67317,
  89604,
  73020,
  69853,
  61517,
  51207,
  86040,
  2596,
  1655,
  9918,
  45161,
  222,
  54577,
  74821,
  47335,
  8582,
  52403,
  94255,
  26351,
  46527,
  68224,
  90183,
  85057,
  72310,
  34963,
  83462,
  49465,
  46581,
  61499,
  4844,
  94626,
  2963,
  41482,
  83879,
  44942,
  63915,
  94365,
  92560,
  12363,
  30246,
  2086,
  75036,
  88620,
  91088,
  67691,
  67762,
  34261,
  8769,
  91830,
  23313,
  18256,
  28850,
  37639,
  92748,
  57791,
  71328,
  37110,
  66538,
  39318,
  15626,
  44324,
  82827,
  8782,
  65960,
  58167,
  1305,
  83950,
  45424,
  72453,
  19444,
  68219,
  64733,
  94088,
  62006,
  89985,
  36936,
  61630,
  97966,
  76537,
  46467,
  30942,
  7479,
  67971,
  14558,
  22458,
  35148,
  1929,
  17165,
  12037,
  74558,
  16250,
  71750,
  55546,
  29693,
  94984,
  37782,
  41659,
  39098,
  23982,
  29899,
  71594,
  77979,
  54477,
  13764,
  17315,
  72893,
  32031,
  39608,
  75992,
  73445,
  1317,
  50525,
  87313,
  45191,
  30214,
  19769,
  90043,
  93478,
  58044,
  6949,
  31176,
  88370,
  50274,
  83987,
  45316,
  38551,
  79418,
  14322,
  91065,
  7841,
  36130,
  86602,
  10659,
  40859,
  964,
  71577,
  85447,
  61079,
  96910,
  72906,
  7361,
  84338,
  34114,
  52096,
  66715,
  51091,
  86219,
  81115,
  49625,
  48799,
  89485,
  24855,
  13684,
  68433,
  70595,
  70102,
  71712,
  88559,
  92476,
  32903,
  68009,
  58417,
  87962,
  11787,
  16644,
  72964,
  29776,
  63075,
  13270,
  84758,
  49560,
  10317,
  28778,
  23006,
  31036,
  84906,
  81488,
  17340,
  74154,
  42801,
  27917,
  89792,
  62604,
  62234,
  13124,
  76471,
  51667,
  37589,
  87147,
  24743,
  48023,
  6325,
  79794,
  35889,
  13255,
  4925,
  99004,
  70322,
  60832,
  76636,
  56907,
  56534,
  72615,
  46288,
  36788,
  93196,
  68656,
  66492,
  35933,
  52293,
  47953,
  95495,
  95304,
  50009,
  83464,
  28608,
  38074,
  74083,
  9337,
  7965,
  65047,
  36871,
  59015,
  21769,
  30398,
  44855,
  1020,
  80680,
  59328,
  8712,
  48190,
  45332,
  27284,
  31287,
  66011,
  9376,
  86379,
  74508,
  33579,
  77114,
  92955,
  23085,
  92824,
  3054,
  25242,
  16322,
  48498,
  9938,
  44420,
  13484,
  52319,
  58875,
  2012,
  88591,
  52500,
  95795,
  41800,
  95363,
  54142,
  17482,
  32705,
  60564,
  12505,
  40954,
  46174,
  64130,
  63026,
  96712,
  79883,
  39225,
  52653,
  69549,
  36693,
  59822,
  22684,
  31661,
  88298,
  15489,
  16030,
  42480,
  15372,
  38781,
  71995,
  77438,
  91161,
  10192,
  7839,
  62735,
  99218,
  25624,
  2547,
  27445,
  69187,
  55749,
  32322,
  15504,
  73298,
  51108,
  48717,
  92926,
  75705,
  89787,
  96114,
  99902,
  37749,
  96305,
  12829,
  70474,
  838,
  50385,
  91711,
  80370,
  56504,
  56857,
  80906,
  9018,
  76569,
  61072,
  48568,
  36491,
  22587,
  44363,
  39592,
  61546,
  90181,
  37348,
  41665,
  41339,
  62106,
  44203,
  6732,
  76111,
  79840,
  67999,
  32231,
  76869,
  58652,
  49983,
  1669,
  27464,
  79553,
  52855,
  25988,
  18087,
  38052,
  17529,
  13607,
  657,
  76173,
  43357,
  77334,
  24140,
  53860,
  2906,
  89863,
  44651,
  55715,
  26203,
  65933,
  51087,
  98234,
  40625,
  45545,
  63563,
  89148,
  82581,
  4110,
  66683,
  99001,
  9796,
  47349,
  65003,
  66524,
  81970,
  71262,
  14479,
  31300,
  8681,
  58068,
  44115,
  40064,
  77879,
  23965,
  69019,
  73985,
  19453,
  26225,
  97543,
  37044,
  7494,
  85778,
  35345,
  61115,
  92498,
  49737,
  64599,
  7158,
  82763,
  25072,
  38478,
  57782,
  75291,
  62155,
  52056,
  4786,
  11585,
  71251,
  25572,
  79771,
  93328,
  66927,
  54069,
  58752,
  26624,
  50463,
  77361,
  29991,
  96526,
  2820,
  91659,
  12818,
  96356,
  49499,
  1507,
  40223,
  9171,
  83642,
  21057,
  2677,
  9367,
  38097,
  16100,
  19355,
  6120,
  15378,
  56559,
  69167,
  30235,
  6767,
  66323,
  78294,
  14916,
  19124,
  88044,
  16673,
  66102,
  86018,
  29406,
  75415,
  22038,
  27056,
  26906,
  25867,
  14751,
  92380,
  30434,
  44114,
  6026,
  79553,
  55091,
  95385,
  41212,
  37882,
  46864,
  54717,
  97038,
  53805,
  64150,
  70915,
  63127,
  63695,
  41288,
  38192,
  72437,
  75075,
  18570,
  52065,
  8853,
  30104,
  79937,
  66913,
  53200,
  84570,
  78079,
  28970,
  53859,
  37632,
  80274,
  35240,
  32960,
  74859,
  7359,
  55176,
  3930,
  38984,
  35151,
  82576,
  82805,
  94031,
  12779,
  90879,
  24109,
  25367,
  77861,
  9541,
  85739,
  69023,
  64971,
  99321,
  7521,
  95909,
  43897,
  71724,
  92581,
  5471,
  64337,
  98949,
  3606,
  78236,
  78985,
  29212,
  57369,
  34857,
  67757,
  58019,
  58872,
  96526,
  28749,
  56592,
  37871,
  72905,
  70198,
  57319,
  54116,
  47014,
  18285,
  33692,
  72111,
  60958,
  96848,
  17893,
  40993,
  50445,
  14186,
  76877,
  87867,
  50335,
  9513,
  44346,
  26439,
  55293,
  6449,
  44301,
  63740,
  40158,
  72703,
  88321,
  85062,
  57345,
  66231,
  15409,
  3451,
  95261,
  43561,
  15673,
  28956,
  90303,
  62469,
  82517,
  43035,
  36850,
  15592,
  64098,
  59022,
  31752,
  4370,
  50486,
  11885,
  23085,
  41712,
  80692,
  48492,
  16495,
  99721,
  36912,
  28267,
  27882,
  16269,
  64483,
  11273,
  2680,
  1616,
  46138,
  54606,
  14761,
  5134,
  45144,
  63213,
  49666,
  27441,
  86989,
  29884,
  54334,
  6740,
  8368,
  80051,
  81020,
  17882,
  74973,
  74531,
  94994,
  24927,
  64894,
  22667,
  20466,
  82948,
  66831,
  47427,
  76033,
  31197,
  59817,
  20064,
  61135,
  28556,
  29695,
  80179,
  74058,
  18293,
  9963,
  35278,
  13062,
  83094,
  23373,
  90287,
  33477,
  48865,
  30348,
  70174,
  11468,
  25994,
  25343,
  22317,
  1587,
  30682,
  1,
  67814,
  59557,
  23362,
  13746,
  82244,
  42093,
  24671,
  79458,
  93730,
  45488,
  60234,
  67098,
  9899,
  25775,
  332,
  36636,
  57594,
  19958,
  85564,
  58977,
  12247,
  60774,
  66371,
  69442,
  20385,
  14486,
  91330,
  50332,
  46023,
  75768,
  59877,
  60081,
  92936,
  72302,
  75064,
  85727,
  52987,
  5750,
  19384,
  33684,
  78859,
  80458,
  69902,
  34870,
  88684,
  49762,
  40801,
  86291,
  18194,
  90366,
  82639,
  53844,
  96326,
  65728,
  48563,
  26027,
  52692,
  62406,
  76294,
  41848,
  63010,
  69841,
  29451,
  36170,
  21529,
  16525,
  64326,
  22086,
  24469,
  57407,
  96033,
  37771,
  31002,
  18311,
  93285,
  31948,
  14331,
  58335,
  15977,
  80336,
  81667,
  27286,
  24361,
  61638,
  57580,
  95270,
  46180,
  76990,
  53031,
  94366,
  2727,
  49944,
  19278,
  5756,
  51875,
  53445,
  33342,
  1965,
  7937,
  10054,
  97712,
  87693,
  58124,
  46064,
  39133,
  77385,
  9605,
  65359,
  70113,
  90563,
  86637,
  94282,
  12025,
  31926,
  24541,
  23854,
  58407,
  32131,
  92845,
  20714,
  27898,
  26917,
  50326,
  35145,
  50859,
  72119,
  95094,
  29441,
  42301,
  62460,
  75252,
  94267,
  38422,
  73047,
  24200,
  85349,
  72049,
  91723,
  97802,
  98496,
  12734,
  73432,
  10371,
  57213,
  53300,
  80847,
  46229,
  7099,
  72961,
  13767,
  65654,
  31102,
  82119,
  96946,
  65919,
  81083,
  3819,
  57888,
  57908,
  16849,
  77111,
  41429,
  92261,
  45263,
  1172,
  55926,
  78835,
  27697,
  48420,
  58865,
  41207,
  21406,
  8582,
  10785,
  36233,
  12237,
  7866,
  13706,
  92551,
  11021,
  63813,
  71512,
  65206,
  37768,
  94325,
  14721,
  20990,
  54235,
  71986,
  5345,
  56239,
  52028,
  1419,
  7215,
  55067,
  11669,
  21738,
  66605,
  69621,
  69827,
  8537,
  18638,
  60982,
  28151,
  98885,
  76431,
  25566,
  3085,
  23639,
  30849,
  63986,
  73287,
  26201,
  36174,
  14106,
  54102,
  57041,
  16141,
  64174,
  3591,
  90024,
  73332,
  31254,
  17288,
  59809,
  25061,
  51612,
  47951,
  16570,
  43330,
  79213,
  11354,
  55585,
  19646,
  99246,
  37564,
  32660,
  20632,
  21124,
  60597,
  69315,
  31312,
  57741,
  85108,
  21615,
  24365,
  27684,
  16124,
  33888,
  14966,
  35303,
  69921,
  15795,
  4020,
  67672,
  86816,
  63027,
  84470,
  45605,
  44887,
  26222,
  79888,
  58982,
  22466,
  98844,
  48353,
  60666,
  58256,
  31140,
  93507,
  69561,
  6256,
  88526,
  18655,
  865,
  75247,
  264,
  65957,
  98261,
  72706,
  36396,
  46065,
  85700,
  32121,
  99975,
  73627,
  78812,
  89638,
  86602,
  96758,
  65099,
  52777,
  46792,
  13790,
  55240,
  52002,
  10313,
  91933,
  71231,
  10053,
  78416,
  54563,
  96004,
  42215,
  30094,
  45958,
  48437,
  49591,
  50483,
  13422,
  69108,
  59952,
  27896,
  40450,
  79327,
  31962,
  46456,
  39260,
  51479,
  61882,
  48181,
  50691,
  64709,
  32902,
  10676,
  12083,
  35771,
  79656,
  56667,
  76783,
  3937,
  99859,
  10362,
  57411,
  40986,
  35045,
  2838,
  29255,
  64230,
  84418,
  34988,
  77644,
  39892,
  77327,
  74129,
  53444,
  35487,
  95803,
  38640,
  20383,
  55402,
  25793,
  14213,
  87082,
  42837,
  95030,
  97198,
  61608,
  97723,
  79390,
  35290,
  34683,
  81419,
  87133,
  70447,
  53127,
  97146,
  28299,
  56763,
  12868,
  1145,
  12147,
  58158,
  92124,
  60934,
  18414,
  97510,
  7056,
  54488,
  20719,
  53743,
  91037,
  44797,
  52110,
  8512,
  18991,
  20129,
  31441,
  51449,
  14661,
  71126,
  23180,
  68124,
  18807,
  70997,
  21913,
  19594,
  70355,
  73637,
  68266,
  60775,
  43164,
  52643,
  96363,
  77989,
  79332,
  39890,
  65379,
  20405,
  52935,
  43816,
  92740,
  95319,
  4538,
  60660,
  28982,
  15328,
  80475,
  34690,
  2293,
  19646,
  46524,
  96627,
  33159,
  42081,
  8816,
  74931,
  20674,
  8697,
  66169,
  46460,
  46326,
  39923,
  60625,
  28386,
  22919,
  19415,
  75766,
  43668,
  31626,
  70301,
  67053,
  3949,
  70082,
  2303,
  48642,
  38429,
  94053,
  38770,
  68137,
  68441,
  52928,
  70244,
  91954,
  17401,
  92693,
  98342,
  21451,
  84988,
  80487,
  33807,
  73797,
  49494,
  41878,
  76635,
  83227,
  76618,
  11946,
  13451,
  87591,
  78381,
  21407,
  90038,
  72638,
  69692,
  51599,
  86413,
  32019,
  64856,
  74730,
  41531,
  11064,
  1790,
  58817,
  86400,
  66213,
  92599,
  70905,
  78324,
  54326,
  43659,
  34206,
  63132,
  38837,
  40210,
  96346,
  16967,
  81619,
  96503,
  14881,
  89405,
  32205,
  49508,
  98425,
  2451,
  35423,
  56072,
  36810,
  30332,
  85998,
  49358,
  92748,
  84147,
  79835,
  94867,
  41224,
  61794,
  35066,
  82220,
  66684,
  20096,
  2754,
  41731,
  37068,
  32753,
  91059,
  13407,
  5607,
  69384,
  53329,
  95909,
  44968,
  11397,
  92973,
  50014,
  92997,
  80968,
  93761,
  57598,
  74703,
  7768,
  37978,
  73873,
  33475,
  9720,
  97852,
  98449,
  48722,
  84977,
  11271,
  11728,
  68318,
  22312,
  78792,
  87508,
  88466,
  72976,
  47099,
  84126,
  38595,
  85124,
  64405,
  90020,
  7492,
  52413,
  95111,
  34455,
  86311,
  68892,
  1074,
  60274,
  28136,
  19328,
  38161,
  57475,
  13771,
  63562,
  84207,
  94121,
  18901,
  52768,
  33801,
  82087,
  86091,
  59969,
  90398,
  56870,
  55756,
  78841,
  98450,
  54165,
  55106,
  50343,
  70519,
  14567,
  36780,
  55450,
  19606,
  83749,
  67562,
  64765,
  38543,
  16585,
  86841,
  73742,
  8766,
  39252,
  75678,
  75379,
  78760,
  37279,
  15280,
  13558,
  95916,
  89759,
  76686,
  76467,
  67147,
  63110,
  94008,
  8037,
  35263,
  53710,
  16667,
  79008,
  11231,
  29397,
  67136,
  18601,
  64502,
  90228,
  89109,
  72849,
  22711,
  65547,
  34542,
  26686,
  81678,
  87765,
  77654,
  23664,
  96352,
  14106,
  32938,
  28083,
  18633,
  80286,
  65507,
  46197,
  52722,
  75476,
  77816,
  47204,
  34876,
  45963,
  79262,
  90181,
  84041,
  3745,
  90041,
  30780,
  27226,
  92847,
  85572,
  15308,
  80688,
  5761,
  82638,
  13464,
  23683,
  81015,
  54214,
  64175,
  43701,
  86845,
  15569,
  50687,
  52679,
  87696,
  8285,
  97444,
  47599,
  94472,
  64150,
  87753,
  68652,
  60726,
  26213,
  17320,
  64553,
  81285,
  98126,
  12158,
  52095,
  64833,
  492,
  35817,
  55571,
  91300,
  97812,
  37507,
  4209,
  53515,
  64342,
  21223,
  16662,
  43265,
  68219,
  3529,
  43636,
  68417,
  53640,
  95326,
  93381,
  37113,
  80751,
  76469,
  96677,
  43054,
  22937,
  31954,
  13266,
  34140,
  27253,
  2734,
  99070,
  60077,
  57988,
  93211,
  92795,
  83795,
  57477,
  3941,
  39007,
  14619,
  38320,
  93449,
  31336,
  25279,
  97030,
  26245,
  47394,
  39475,
  90621,
  23820,
  29344,
  94859,
  91604,
  14033,
  41868,
  14816,
  4075,
  66644,
  87803,
  97815,
  99552,
  78666,
  3942,
  8175,
  22345,
  19983,
  76783,
  99044,
  20851,
  84981,
  59052,
  77178,
  72109,
  76475,
  21619,
  73017,
  6812,
  56633,
  50612,
  55289,
  4671,
  84419,
  94072,
  94446,
  80603,
  32188,
  93415,
  23464,
  43947,
  43728,
  74284,
  67177,
  57105,
  31059,
  10642,
  13803,
  69602,
  46961,
  66567,
  19359,
  84676,
  63918,
  40650,
  12923,
  15974,
  79732,
  20225,
  92525,
  71179,
  4859,
  91208,
  60430,
  5239,
  61458,
  24089,
  68852,
  60171,
  29603,
  42535,
  86365,
  93905,
  28237,
  45317,
  60718,
  82001,
  41679,
  20679,
  56304,
  70043,
  87568,
  21386,
  59049,
  78353,
  48696,
  77379,
  55309,
  23780,
  28391,
  5940,
  55583,
  81256,
  59418,
  97521,
  32846,
  70761,
  90115,
  45325,
  5490,
  65974,
  11186,
  15357,
  3568,
  450,
  96644,
  58976,
  36211,
  88240,
  92457,
  89200,
  94696,
  11370,
  91157,
  48487,
  59501,
  56983,
  89795,
  42789,
  69758,
  79701,
  29511,
  55968,
  41472,
  89474,
  84344,
  80517,
  7485,
  97523,
  17264,
  82840,
  59556,
  37119,
  30985,
  48866,
  60605,
  95719,
  70417,
  59083,
  95137,
  76538,
  44155,
  67286,
  57897,
  28262,
  4052,
  919,
  86207,
  79932,
  44236,
  10089,
  44373,
  65670,
  44285,
  6903,
  20834,
  49701,
  95735,
  21149,
  3425,
  17594,
  31427,
  14262,
  32252,
  68540,
  39427,
  44026,
  47257,
  45055,
  95091,
  8367,
  28381,
  57375,
  41562,
  83883,
  27715,
  10122,
  67745,
  46497,
  28626,
  87297,
  36568,
  39483,
  11385,
  63292,
  92305,
  78683,
  6146,
  81905,
  15038,
  38338,
  51206,
  65749,
  34119,
  71516,
  74068,
  51094,
  6665,
  91884,
  66762,
  11428,
  70908,
  21506,
  480,
  94183,
  78484,
  66507,
  75901,
  25728,
  52539,
  86806,
  69944,
  65036,
  27882,
  2530,
  4918,
  74351,
  65737,
  89178,
  8791,
  39342,
  94963,
  22581,
  56917,
  17541,
  83578,
  75376,
  65202,
  30935,
  79270,
  91986,
  99286,
  45236,
  44720,
  81915,
  70881,
  45886,
  43213,
  49789,
  97081,
  16075,
  20517,
  69980,
  25310,
  91953,
  1759,
  67635,
  88933,
  54558,
  18395,
  73375,
  62251,
  58871,
  9870,
  70538,
  48936,
  7757,
  90374,
  56631,
  88862,
  30487,
  38794,
  36079,
  32712,
  11130,
  55451,
  25137,
  38785,
  83558,
  31960,
  69473,
  45950,
  18225,
  9871,
  88502,
  75179,
  11551,
  75664,
  74321,
  67351,
  27703,
  83717,
  18913,
  42470,
  8816,
  37627,
  14288,
  62831,
  44047,
  67612,
  72738,
  26995,
  50933,
  63758,
  50003,
  43693,
  52661,
  55852,
  52372,
  59042,
  37595,
  4931,
  73622,
  68387,
  86478,
  40997,
  5245,
  75300,
  24902,
  59609,
  35653,
  15970,
  37681,
  69365,
  22236,
  86374,
  65550,
  343,
  98377,
  35354,
  65770,
  15365,
  41422,
  71356,
  16630,
  40044,
  19290,
  66449,
  53629,
  79452,
  71674,
  30260,
  97303,
  6487,
  62789,
  13005,
  70152,
  22501,
  49867,
  89294,
  59232,
  31776,
  54919,
  99851,
  5438,
  1096,
  72269,
  50486,
  16719,
  6144,
  82041,
  38332,
  64452,
  31840,
  99287,
  59928,
  25503,
  8407,
  46970,
  45907,
  99238,
  74547,
  19704,
  72035,
  26542,
  54600,
  79172,
  58779,
  35747,
  78956,
  11478,
  41195,
  58135,
  63856,
  33037,
  45753,
  60159,
  25193,
  71838,
  7526,
  7985,
  60714,
  88627,
  75790,
  38454,
  96110,
  39237,
  19792,
  34534,
  70169,
  24805,
  63215,
  38175,
  38784,
  38855,
  24826,
  50917,
  25147,
  17082,
  26997,
  32295,
  10894,
  21805,
  65245,
  85407,
  37926,
  69214,
  38579,
  84721,
  23544,
  88548,
  65626,
  75517,
  69737,
  55626,
  52175,
  21697,
  19453,
  16908,
  82841,
  24060,
  40285,
  19195,
  80281,
  89322,
  15232,
  70043,
  60691,
  86370,
  91949,
  19017,
  83846,
  77869,
  14321,
  95102,
  87073,
  71467,
  31305,
  64677,
  80358,
  52629,
  79419,
  22359,
  87867,
  48296,
  50141,
  46807,
  82184,
  95812,
  84665,
  74511,
  59914,
  4146,
  90417,
  58508,
  62875,
  17630,
  21868,
  9199,
  30322,
  33352,
  43374,
  25473,
  4119,
  63086,
  14147,
  14863,
  38020,
  44757,
  98628,
  57916,
  22199,
  11865,
  42911,
  62651,
  78290,
  9392,
  77294,
  63168,
  21043,
  17409,
  13786,
  27475,
  75979,
  89668,
  43596,
  74316,
  84489,
  54941,
  95992,
  45445,
  41059,
  55142,
  15214,
  42903,
  16799,
  88254,
  95984,
  48575,
  77822,
  21067,
  57238,
  35352,
  96779,
  89564,
  23797,
  99937,
  46379,
  27119,
  16060,
  30302,
  95327,
  12849,
  38111,
  97090,
  7598,
  78473,
  63079,
  18570,
  72803,
  70040,
  91385,
  96436,
  96263,
  17368,
  56188,
  85999,
  50026,
  36050,
  73736,
  13351,
  48321,
  28357,
  51718,
  65636,
  72903,
  21584,
  21060,
  39829,
  15564,
  4716,
  14594,
  22363,
  97639,
  65937,
  17802,
  31535,
  42767,
  98761,
  30987,
  57657,
  33398,
  63053,
  25926,
  20944,
  19306,
  81727,
  2695,
  97479,
  79172,
  72764,
  66446,
  78864,
  12698,
  15812,
  97209,
  38827,
  91016,
  91281,
  57875,
  45228,
  49211,
  69755,
  99224,
  43999,
  62879,
  8879,
  80015,
  74396,
  57146,
  64665,
  31159,
  6980,
  79069,
  37409,
  75037,
  69977,
  85919,
  42826,
  6974,
  61063,
  97640,
  13433,
  92528,
  91311,
  8440,
  38840,
  22362,
  93929,
  1836,
  36590,
  75052,
  89475,
  15437,
  65648,
  99012,
  70236,
  12307,
  83585,
  414,
  62851,
  48787,
  28447,
  21702,
  57033,
  29633,
  44760,
  34165,
  27548,
  37516,
  24343,
  63046,
  2081,
  20378,
  19510,
  42226,
  97134,
  68739,
  32982,
  56455,
  53129,
  77693,
  25022,
  55534,
  99375,
  30086,
  98001,
  7432,
  67126,
  76656,
  29347,
  28492,
  43108,
  64736,
  32278,
  84816,
  80440,
  30461,
  818,
  9136,
  1952,
  48442,
  91058,
  92590,
  10443,
  5195,
  34009,
  32141,
  62209,
  43740,
  54102,
  76895,
  98172,
  31583,
  4155,
  66492,
  58981,
  16591,
  11331,
  6838,
  3818,
  77063,
  12523,
  45570,
  68970,
  70055,
  77751,
  73743,
  71732,
  4704,
  61384,
  57343,
  66682,
  44500,
  89745,
  10436,
  67202,
  36455,
  42467,
  88801,
  91280,
  1056,
  27534,
  81619,
  79004,
  25824,
  66362,
  33280,
  20706,
  31929,
  57422,
  18730,
  96197,
  22101,
  47592,
  2180,
  18287,
  82310,
  60430,
  59627,
  26471,
  7794,
  60475,
  76713,
  45427,
  89654,
  14370,
  81674,
  41246,
  98416,
  8669,
  48883,
  77154,
  9806,
  94015,
  60347,
  20027,
  8405,
  33150,
  27368,
  53375,
  70171,
  59431,
  14534,
  34018,
  85665,
  77797,
  17944,
  49602,
  74391,
  48830,
  55029,
  10371,
  94261,
  16658,
  68400,
  44148,
  28150,
  40364,
  90913,
  73151,
  64463,
  50058,
  78191,
  84439,
  82478,
  62398,
  3113,
  17578,
  12830,
  6571,
  95934,
  9132,
  25287,
  78731,
  80683,
  67207,
  76597,
  42096,
  34934,
  76609,
  52553,
  47508,
  71561,
  8038,
  83011,
  72577,
  95790,
  40076,
  20292,
  32138,
  61197,
  95476,
  23123,
  26648,
  13611,
  48452,
  39963,
  85857,
  4855,
  27029,
  1542,
  72443,
  53688,
  82635,
  56264,
  7977,
  23090,
  93553,
  65434,
  12124,
  91087,
  87800,
  95675,
  99419,
  44659,
  30382,
  55263,
  82514,
  86800,
  16781,
  65977,
  65946,
  13033,
  93895,
  4056,
  75895,
  47878,
  91309,
  51233,
  81409,
  46773,
  69135,
  56906,
  84493,
  34530,
  84534,
  38312,
  54574,
  92933,
  77341,
  20839,
  36126,
  1143,
  35356,
  35459,
  7959,
  98335,
  53266,
  36146,
  78047,
  50607,
  22486,
  63308,
  8996,
  96056,
  39085,
  26567,
  6779,
  62663,
  30523,
  47881,
  41279,
  49864,
  82248,
  78333,
  29466,
  48151,
  41957,
  93235,
  53308,
  22682,
  90722,
  54478,
  7235,
  34306,
  15827,
  20121,
  96837,
  6283,
  80172,
  66109,
  92592,
  48238,
  76428,
  94546,
  45430,
  16288,
  74839,
  740,
  25553,
  83767,
  35900,
  5998,
  7493,
  46755,
  11449,
  88824,
  44906,
  33143,
  7454,
  56652,
  34755,
  63992,
  59674,
  65131,
  46358,
  12799,
  96988,
  51158,
  73176,
  1184,
  49925,
  63519,
  11785,
  29073,
  72850,
  47997,
  75172,
  55187,
  15313,
  40725,
  33225,
  56643,
  10465,
  38583,
  86440,
  97967,
  26401,
  17078,
  38765,
  33454,
  19136,
  57712,
  48446,
  98790,
  27315,
  71074,
  10157,
  57946,
  35582,
  49383,
  61324,
  26572,
  84503,
  3496,
  60449,
  17962,
  26017,
  65651,
  40400,
  83246,
  80056,
  75306,
  75147,
  41863,
  25581,
  87530,
  33193,
  43294,
  5065,
  99644,
  62771,
  75986,
  79005,
  44924,
  18703,
  40889,
  4403,
  5862,
  2571,
  82500,
  74200,
  36170,
  46836,
  74642,
  65471,
  26815,
  30937,
  64946,
  10160,
  15544,
  31962,
  54015,
  28853,
  66533,
  14573,
  79398,
  47391,
  73165,
  47805,
  77589,
  16881,
  13423,
  89452,
  76992,
  62509,
  9796,
  57540,
  13486,
  48855,
  25546,
  47589,
  21012,
  47388,
  78428,
  70196,
  84413,
  81026,
  87597,
  22445,
  83769,
  85937,
  38321,
  85485,
  87359,
  9839,
  67228,
  71179,
  94372,
  4446,
  62801,
  50775,
  96179,
  40646,
  44272,
  12417,
  47199,
  39701,
  30665,
  32775,
  66525,
  53558,
  78882,
  31939,
  67209,
  38906,
  34533,
  99914,
  27719,
  216,
  99225,
  96537,
  3843,
  90564,
  91110,
  51838,
  30300,
  9559,
  37795,
  94880,
  11325,
  44979,
  89696,
  28129,
  29931,
  89971,
  46292,
  92710,
  11036,
  74760,
  75307,
  12291,
  49618,
  16293,
  92408,
  67928,
  80823,
  32872,
  25460,
  66819,
  35374,
  4035,
  99087,
  61129,
  11341,
  39118,
  10891,
  37217,
  63638,
  75477,
  30068,
  42334,
  57570,
  6890,
  59353,
  89939,
  37692,
  15232,
  20033,
  32202,
  22348,
  2766,
  96791,
  58448,
  92248,
  5769,
  96684,
  67885,
  99295,
  47271,
  38655,
  59513,
  96960,
  31718,
  8974,
  16122,
  20535,
  52380,
  29769,
  70660,
  57425,
  50891,
  75044,
  84257,
  73315,
  38181,
  28673,
  93140,
  26307,
  82265,
  78382,
  19681,
  56585,
  8975,
  76764,
  39956,
  83450,
  84663,
  89963,
  71584,
  57696,
  30829,
  60527,
  64947,
  34899,
  28805,
  28397,
  91830,
  51842,
  99838,
  39839,
  66971,
  67177,
  74219,
  35637,
  35634,
  93581,
  81746,
  29991,
  81096,
  94279,
  2968,
  62561,
  2479,
  82126,
  25702,
  67953,
  88088,
  50293,
  83423,
  86206,
  39935,
  23253,
  43041,
  48941,
  85787,
  8388,
  6671,
  43574,
  84908,
  67295,
  33623,
  55060,
  28174,
  48415,
  2529,
  22009,
  24524,
  5283,
  30460,
  32399,
  80423,
  56929,
  40852,
  69969,
  88541,
  5979,
  91496,
  64730,
  57198,
  83145,
  39750,
  3568,
  54669,
  98679,
  4297,
  51047,
  31492,
  47734,
  31343,
  31180,
  232,
  19707,
  24823,
  75079,
  73943,
  17997,
  8446,
  91252,
  39879,
  58682,
  82972,
  18417,
  39203,
  36681,
  42895,
  8459,
  15618,
  17941,
  52594,
  43277,
  16530,
  40052,
  91100,
  87422,
  47230,
  95699,
  49794,
  50492,
  87439,
  86354,
  4546,
  65333,
  11057,
  77727,
  19748,
  38722,
  91821,
  18107,
  42125,
  89239,
  28847,
  54623,
  38783,
  47803,
  31414,
  38450,
  3697,
  89186,
  30579,
  44188,
  26532,
  8420,
  80723,
  48100,
  60748,
  76330,
  45832,
  8311,
  16051,
  4475,
  13400,
  48527,
  46073,
  17439,
  56498,
  94632,
  9021,
  16871,
  83366,
  14896,
  4219,
  38375,
  87890,
  90217,
  42370,
  61028,
  85101,
  76771,
  83715,
  94737,
  69973,
  74187,
  1958,
  59691,
  86712,
  86570,
  60984,
  76342,
  13648,
  85250,
  28323,
  48379,
  45141,
  36277,
  51845,
  29039,
  3553,
  5128,
  59866,
  51281,
  68124,
  17007,
  24729,
  29710,
  41439,
  40574,
  11774,
  86746,
  89698,
  56020,
  37810,
  88972,
  11361,
  95583,
  70786,
  589,
  74473,
  87513,
  17690,
  61427,
  72914,
  32517,
  1804,
  97910,
  6327,
  30246,
  33049,
  2622,
  41026,
  80875,
  41293,
  16752,
  84225,
  84414,
  37137,
  68956,
  8095,
  64981,
  28180,
  38629,
  76962,
  23840,
  17477,
  75268,
  48297,
  70340,
  57888,
  13938,
  38554,
  86836,
  2195,
  30270,
  55484,
  53364,
  54705,
  41380,
  56316,
  37723,
  234,
  21424,
  26664,
  63804,
  75139,
  36534,
  18579,
  9833,
  98849,
  72762,
  59767,
  52497,
  24227,
  83152,
  71794,
  21398,
  99456,
  89215,
  51632,
  54799,
  27973,
  68568,
  68465,
  98500,
  28681,
  18369,
  24279,
  96335,
  12874,
  82160,
  67202,
  85199,
  27908,
  67022,
  49810,
  77929,
  96212,
  81153,
  77884,
  7032,
  1671,
  53362,
  28119,
  56786,
  30883,
  28540,
  76029,
  3774,
  64611,
  19736,
  25589,
  46569,
  45206,
  48215,
  69523,
  17423,
  91807,
  90039,
  30393,
  58319,
  85098,
  66519,
  57571,
  24541,
  3562,
  14400,
  62731,
  82534,
  61477,
  89731,
  18421,
  29861,
  52829,
  838,
  78040,
  43350,
  74323,
  82892,
  84746,
  28302,
  13264,
  7595,
  134,
  12933,
  46831,
  24864,
  47275,
  20527,
  9110,
  28485,
  30326,
  99826,
  64005,
  99308,
  65779,
  42760,
  90066,
  3974,
  38688,
  39968,
  32604,
  11694,
  46262,
  73262,
  45405,
  43923,
  67397,
  88228,
  56405,
  17839,
  92073,
  57622,
  93328,
  15442,
  50186,
  7570,
  58001,
  31e3,
  8915,
  11467,
  14793,
  82691,
  51238,
  12485,
  51745,
  18192,
  5985,
  36826,
  89434,
  38669,
  91592,
  88799,
  65621,
  67237,
  59541,
  19657,
  93402,
  58705,
  73553,
  78280,
  69125,
  95591,
  81168,
  91927,
  25976,
  89077,
  71690,
  19404,
  64603,
  59752,
  74698,
  44233,
  67602,
  38615,
  31303,
  28650,
  53700,
  89819,
  7783,
  4351,
  77451,
  47350,
  21234,
  16016,
  41532,
  76508,
  23063,
  44993,
  43983,
  33356,
  61715,
  96485,
  22121,
  78004,
  6316,
  87896,
  99289,
  93981,
  37850,
  66128,
  92735,
  45064,
  50924,
  24204,
  58816,
  65290,
  34392,
  55567,
  66416,
  72353,
  45775,
  68590,
  85685,
  72683,
  60090,
  37149,
  85347,
  57414,
  72336,
  12979,
  5720,
  92754,
  76911,
  96883,
  74420,
  5220,
  85815,
  23557,
  80567,
  44365,
  70254,
  50864,
  36619,
  51479,
  23281,
  76428,
  18580,
  34240,
  59289,
  49076,
  18439,
  29522,
  42541,
  4024,
  84446,
  92434,
  90407,
  77241,
  19690,
  78143,
  65919,
  13699,
  91844,
  91241,
  38361,
  67171,
  90551,
  5709,
  3474,
  76025,
  97043,
  33834,
  44638,
  54040,
  82797,
  545,
  38159,
  16089,
  35870,
  89158,
  55864,
  98078,
  50563,
  36492,
  10994,
  85909,
  9018,
  19252,
  73887,
  67928,
  60045,
  70782,
  11937,
  4074,
  53814,
  46621,
  52577,
  94853,
  45968,
  73667,
  65062,
  73306,
  76045,
  78649,
  91654,
  53958,
  96537,
  95542,
  67622,
  54579,
  17279,
  67440,
  56441,
  20681,
  64011,
  52226,
  96618,
  32831,
  60664,
  67547,
  39523,
  2043,
  59748,
  1887,
  69229,
  94653,
  99271,
  98164,
  62155,
  9234,
  47367,
  13047,
  6364,
  35064,
  10073,
  6793,
  80248,
  29009,
  44969,
  11129,
  17139,
  79630,
  89772,
  26921,
  56949,
  23465,
  30036,
  17173,
  82459,
  96218,
  60768,
  76417,
  24405,
  18710,
  68887,
  82394,
  69729,
  82503,
  40873,
  41590,
  67255,
  30757,
  9657,
  91881,
  34578,
  9511,
  5417,
  58953,
  18532,
  10721,
  22029,
  48524,
  47778,
  881,
  83489,
  3464,
  57462,
  97459,
  86689,
  39755,
  39547,
  740,
  36666,
  7993,
  31671,
  86304,
  12970,
  73402,
  52849,
  31652,
  79655,
  11250,
  18463,
  57518,
  20306,
  25301,
  1374,
  51208,
  33298,
  87662,
  61849,
  60923,
  68685,
  69411,
  39266,
  80320,
  34844,
  89416,
  81569,
  83651,
  35795,
  40168,
  33501,
  1042,
  58931,
  3892,
  85188,
  74740,
  85476,
  23790,
  33842,
  89565,
  53359,
  25579,
  59049,
  62394,
  72435,
  12457,
  21904,
  18370,
  97035,
  57905,
  9581,
  91227,
  92754,
  37760,
  1411,
  7440,
  87175,
  88318,
  63242,
  85960,
  56690,
  12618,
  30493,
  11569,
  73723,
  7448,
  58830,
  157,
  65814,
  21118,
  22140,
  73793,
  57855,
  81830,
  6795,
  13183,
  12625,
  30635,
  56429,
  73216,
  12342,
  36722,
  83886,
  96828,
  82870,
  90954,
  97614,
  2370,
  42160,
  73370,
  11944,
  49067,
  59452,
  80495,
  43911,
  46712,
  17033,
  68037,
  41963,
  3874,
  44856,
  82985,
  57453,
  84358,
  16120,
  4454,
  76624,
  405,
  62369,
  55080,
  61880,
  51270,
  87807,
  10653,
  36894,
  70850,
  35660,
  234,
  14705,
  93418,
  94084,
  82856,
  25384,
  71555,
  56754,
  78315,
  18291,
  91656,
  98079,
  52384,
  43306,
  65205,
  75903,
  58701,
  99496,
  50048,
  33557,
  87793,
  90857,
  10143,
  46726,
  84284,
  43635,
  41213,
  83845,
  70986,
  91408,
  80220,
  5728,
  68890,
  46577,
  21152,
  43759,
  43301,
  93661,
  97252,
  50106,
  10099,
  13722,
  18572,
  44024,
  351,
  18173,
  23717,
  85114,
  85998,
  57782,
  63951,
  53723,
  86853,
  63851,
  79430,
  49181,
  46386,
  69666,
  55743,
  76162,
  71724,
  40028,
  94786,
  34457,
  16906,
  90040,
  30789,
  40281,
  94697,
  96584,
  81907,
  4055,
  53990,
  66397,
  80579,
  42517,
  78181,
  39251,
  9467,
  67097,
  95523,
  66568,
  63632,
  71048,
  15581,
  39904,
  75774,
  77495,
  75994,
  29911,
  65690,
  41178,
  47712,
  70355,
  16998,
  56025,
  5230,
  10093,
  71495,
  34784,
  70950,
  54680,
  57811,
  53782,
  39145,
  36829,
  85342,
  40406,
  35883,
  45668,
  3459,
  29870,
  78252,
  70088,
  70621,
  67153,
  5737,
  40933,
  91075,
  93335,
  86853,
  15860,
  81167,
  91259,
  16118,
  52401,
  83593,
  84474,
  2423,
  75608,
  39646,
  90871,
  70284,
  82100,
  96032,
  5115,
  63678,
  2225,
  88087,
  58581,
  44364,
  57468,
  21539,
  13042,
  64150,
  63754,
  5210,
  87644,
  54114,
  64013,
  63562,
  41388,
  32397,
  74152,
  23982,
  71982,
  71700,
  33026,
  66477,
  47838,
  46712,
  39848,
  35083,
  65927,
  97868,
  11067,
  76771,
  71799,
  43836,
  41014,
  97025,
  93225,
  8511,
  63096,
  26628,
  73012,
  12543,
  76269,
  99708,
  2629,
  49845,
  73677,
  19193,
  14924,
  57236,
  95564,
  15010,
  59667,
  73773,
  78515,
  2624,
  99744,
  13585,
  33746,
  58771,
  94785,
  62628,
  99585,
  11363,
  80832,
  59979,
  9444,
  78700,
  2596,
  85984,
  69438,
  16913,
  96475,
  93283,
  18625,
  77086,
  45911,
  39746,
  64722,
  39938,
  43930,
  54619,
  302,
  50384,
  2738,
  75714,
  75249,
  95439,
  80714,
  52555,
  47266,
  96190,
  78750,
  94973,
  83669,
  16479,
  53163,
  48071,
  28e3,
  45011,
  26733,
  67132,
  83362,
  84162,
  43028,
  8415,
  27236,
  52651,
  89059,
  64844,
  80910,
  1676,
  91752,
  57815,
  26264,
  3415,
  57532,
  29981,
  61200,
  96036,
  62600,
  20068,
  56530,
  38487,
  8432,
  89514,
  26883,
  69165,
  97237,
  22361,
  55276,
  39902,
  95927,
  82190,
  49269,
  27212,
  46095,
  37106,
  64254,
  27460,
  49572,
  51700,
  27679,
  12574,
  33891,
  3867,
  9925,
  6476,
  82018,
  45094,
  59014,
  67113,
  44192,
  75,
  23318,
  79895,
  70550,
  81717,
  28833,
  30271,
  15821,
  14999,
  88174,
  62617,
  57517,
  55256,
  50281,
  51583,
  96879,
  5225,
  42272,
  5339,
  20483,
  57596,
  41011,
  75937,
  22767,
  50120,
  95938,
  49753,
  63882,
  99616,
  69083,
  38721,
  73889,
  80236,
  99531,
  23053,
  71237,
  48861,
  59046,
  76283,
  60538,
  19732,
  93877,
  30345,
  64882,
  66660,
  17026,
  70364,
  45676,
  8039,
  96228,
  89936,
  59141,
  95585,
  89552,
  97247,
  59325,
  27848,
  80058,
  15950,
  61481,
  90906,
  40998,
  44137,
  16144,
  66300,
  44091,
  50018,
  81364,
  18211,
  60294,
  76559,
  20279,
  27414,
  10589,
  39860,
  23e3,
  31767,
  95618,
  56738,
  50332,
  16936,
  70342,
  92481,
  30702,
  76264,
  62619,
  68678,
  62284,
  83112,
  93032,
  55203,
  52614,
  36950,
  41796,
  45403,
  79262,
  2887,
  53596,
  61308,
  20738,
  34811,
  27099,
  90956,
  65448,
  3080,
  75795,
  29753,
  97699,
  80872,
  23830,
  85882,
  74427,
  99523,
  74904,
  28017,
  45898,
  57232,
  48525,
  7086,
  26805,
  74533,
  92470,
  18840,
  76011,
  93109,
  14344,
  55614,
  50284,
  15865,
  19458,
  35856,
  13464,
  53679,
  64603,
  51571,
  56124,
  79107,
  29596,
  89572,
  78198,
  57121,
  73649,
  8804,
  87977,
  87959,
  70859,
  40909,
  77295,
  87877,
  75158,
  62810,
  92074,
  23244,
  59516,
  50552,
  31602,
  41899,
  6347,
  27821,
  68370,
  48596,
  88577,
  30231,
  25267,
  84622,
  31449,
  12086,
  56461,
  22962,
  78213,
  62483,
  93966,
  60437,
  52239,
  58113,
  32526,
  38708,
  81607,
  57016,
  1695,
  90110,
  4649,
  59990,
  23979,
  3855,
  10297,
  46516,
  96092,
  82305,
  30760,
  78756,
  4967,
  82876,
  4773,
  86651,
  16648,
  53133,
  82439,
  78851,
  49766,
  24553,
  15273,
  36417,
  1901,
  33386,
  76979,
  25920,
  33372,
  2695,
  11982,
  40911,
  6230,
  91696,
  43907,
  17827,
  30332,
  89203,
  32215,
  91806,
  23080,
  49102,
  9174,
  11548,
  54590,
  75803,
  66108,
  73882,
  62324,
  26017,
  72716,
  33887,
  1285,
  31604,
  71039,
  24337,
  53514,
  58964,
  89901,
  22040,
  92751,
  12617,
  37007,
  5523,
  61672,
  62557,
  98540,
  26094,
  60284,
  19621,
  96230,
  38044,
  6545,
  9458,
  42988,
  2913,
  86345,
  67936,
  90174,
  40840,
  44991,
  24256,
  34989,
  74086,
  13652,
  68706,
  1363,
  4294,
  88008,
  78693,
  83068,
  94746,
  221,
  89299,
  53186,
  5930,
  61889,
  51341,
  45412,
  58860,
  72568,
  11381,
  59785,
  36887,
  10690,
  31347,
  93326,
  96267,
  86987,
  57565,
  86836,
  49071,
  90331,
  41248,
  34629,
  30240,
  27270,
  3864,
  84308,
  3035,
  61369,
  36902,
  51017,
  44409,
  17120,
  23823,
  36460,
  63359,
  8333,
  63173,
  19134,
  6493,
  303,
  18550,
  26191,
  19051,
  81502,
  66343,
  6737,
  90430,
  65478,
  58982,
  82484,
  16483,
  47704,
  44640,
  68322,
  44548,
  72787,
  2335,
  28749,
  39320,
  5436,
  98146,
  56596,
  812,
  51445,
  35533,
  35478,
  47573,
  38414,
  25542,
  38032,
  13442,
  42983,
  97207,
  77854,
  57806,
  81616,
  52828,
  79429,
  47389,
  96795,
  57764,
  19605,
  24767,
  63253,
  18809,
  65093,
  44449,
  22952,
  76872,
  30983,
  38948,
  9310,
  48336,
  87651,
  27110,
  84427,
  76209,
  56412,
  12760,
  16747,
  14551,
  82626,
  31224,
  98636,
  75100,
  84882,
  79479,
  83420,
  5347,
  6803,
  90063,
  4617,
  40257,
  79183,
  41766,
  71873,
  25242,
  12275,
  336,
  40798,
  42055,
  74066,
  69128,
  32547,
  76508,
  32530,
  42359,
  89207,
  49758,
  58984,
  92732,
  15779,
  7234,
  28884,
  28226,
  50011,
  35883,
  99606,
  45423,
  76224,
  75427,
  85747,
  33879,
  97978,
  57441,
  927,
  19164,
  74716,
  40702,
  19715,
  70917,
  60344,
  40236,
  9019,
  50577,
  15598,
  53136,
  57285,
  20536,
  7539,
  74832,
  89184,
  41501,
  39447,
  97422,
  97041,
  21913,
  40581,
  76081,
  13089,
  28776,
  54164,
  55736,
  36263,
  71841,
  34488,
  74988,
  55467,
  43322,
  9214,
  36746,
  67981,
  71877,
  81683,
  32461,
  84091,
  19422,
  88366,
  62054,
  85664,
  13409,
  8003,
  88276,
  6989,
  16607,
  33633,
  85349,
  5784,
  25950,
  97998,
  74110,
  16699,
  60184,
  92818,
  79705,
  10381,
  1474,
  18656,
  50434,
  18232,
  92132,
  66537,
  70141,
  42854,
  25120,
  39581,
  28249,
  14215,
  34810,
  19767,
  3409,
  11807,
  6566,
  66138,
  42997,
  41999,
  67504,
  87117,
  28961,
  5e3,
  29673,
  77726,
  73225,
  54753,
  69712,
  71576,
  92337,
  17713,
  63185,
  87923,
  91889,
  68351,
  17712,
  75532,
  93849,
  48280,
  62219,
  317,
  25290,
  29209,
  90927,
  92929,
  92762,
  60413,
  2018,
  31793,
  76290,
  73373,
  80777,
  60819,
  77375,
  57886,
  47291,
  99670,
  32605,
  29064,
  99476,
  80999,
  31217,
  35,
  91300,
  14892,
  73653,
  26593,
  25305,
  56797,
  12837,
  39560,
  27582,
  37253,
  38531,
  76489,
  49946,
  69108,
  58687,
  43092,
  73807,
  96282,
  6648,
  67431,
  87124,
  57694,
  21660,
  64002,
  6,
  33600,
  30245,
  60636,
  80164,
  9285,
  61426,
  4658,
  54130,
  14710,
  76553,
  1904,
  93668,
  63110,
  98618,
  5601,
  32199,
  74923,
  98049,
  49717,
  55539,
  35940,
  58545,
  43295,
  35810,
  45451,
  38735,
  42065,
  66769,
  69825,
  45461,
  83881,
  67372,
  67351,
  90612,
  79502,
  69460,
  23108,
  74421,
  82990,
  46821,
  40683,
  71603,
  55267,
  48192,
  50242,
  79738,
  96417,
  6664,
  19929,
  23644,
  41116,
  51056,
  219,
  45086,
  32747,
  49492,
  15399,
  24874,
  80825,
  95928,
  61457,
  45813,
  59037,
  16136,
  3953,
  83583,
  5910,
  12654,
  53630,
  92997,
  22168,
  93491,
  71897,
  74579,
  24022,
  6278,
  24049,
  71670,
  43044,
  8474,
  38572,
  77402,
  35800,
  7455,
  96177,
  41653,
  74493,
  20802,
  65843,
  73050,
  73349,
  2638,
  65813,
  96209,
  49196,
  45007,
  32207,
  14097,
  66059,
  46681,
  7534,
  71263,
  20582,
  10171,
  51514,
  52142,
  60961,
  57951,
  25637,
  37860,
  21683,
  86190,
  90434,
  94481,
  85697,
  95344,
  2606,
  74095,
  61133,
  7472,
  64777,
  94050,
  41482,
  975,
  23471,
  76052,
  82021,
  87676,
  91345,
  20196,
  2612,
  86299,
  44996,
  40312,
  65712,
  46079,
  88514,
  8610,
  3685,
  63197,
  9073,
  53105,
  86824,
  28112,
  99306,
  40706,
  66840,
  83003,
  51590,
  52755,
  32285,
  68454,
  85058,
  13645,
  23073,
  24724,
  52989,
  71880,
  21952,
  44144,
  74975,
  76715,
  7844,
  46447,
  86643,
  75579,
  29276,
  10864,
  83179,
  36721,
  19300,
  35066,
  29383,
  47478,
  56644,
  33354,
  31414,
  17643,
  92374,
  85085,
  88458,
  87191,
  85248,
  34963,
  76278,
  53230,
  13953,
  76985,
  70959,
  36663,
  5293,
  32658,
  56767,
  56997,
  76736,
  6558,
  64248,
  11907,
  29123,
  78458,
  17678,
  63805,
  89973,
  5076,
  39263,
  54404,
  4355,
  64957,
  74407,
  99838,
  18836,
  78098,
  6490,
  74888,
  73719,
  80675,
  86178,
  56283,
  33591,
  96957,
  38382,
  18772,
  74773,
  71229,
  2603,
  52673,
  44609,
  14843,
  58418,
  18060,
  95459,
  626,
  30914,
  13550,
  42195,
  44863,
  8871,
  89182,
  64446,
  78422,
  41140,
  15312,
  98274,
  48168,
  95651,
  35562,
  85386,
  56252,
  72136,
  85088,
  68761,
  78434,
  98143,
  61330,
  2446,
  64409,
  49406,
  99127,
  98626,
  55095,
  44808,
  13594,
  87370,
  89472,
  12833,
  98932,
  68064,
  58193,
  20225,
  5192,
  28425,
  23978,
  24542,
  80845,
  55858,
  4015,
  21454,
  37346,
  51007,
  17202,
  10242,
  12682,
  55933,
  96922,
  22280,
  75597,
  50227,
  70712,
  44236,
  20470,
  36320,
  49339,
  60536,
  80083,
  38880,
  93327,
  49522,
  93585,
  9918,
  55268,
  4671,
  57526,
  11457,
  48424,
  54610,
  7211,
  78610,
  9473,
  72923,
  27347,
  30057,
  76968,
  26177,
  59367,
  46172,
  88951,
  40229,
  34921,
  60405,
  88959,
  16779,
  29547,
  92231,
  61997,
  36002,
  21080,
  39795,
  77221,
  10012,
  49748,
  76900,
  15964,
  3803,
  40260,
  92351,
  92844,
  10288,
  57483,
  10881,
  70408,
  75688,
  16610,
  1638,
  93082,
  44282,
  66849,
  75702,
  69428,
  34047,
  84968,
  71281,
  72328,
  73143,
  88672,
  49802,
  50639,
  18129,
  93659,
  58389,
  49095,
  45971,
  34196,
  84609,
  59222,
  19332,
  17777,
  41004,
  47057,
  30688,
  16039,
  20906,
  41477,
  42915,
  60877,
  33864,
  75195,
  62294,
  3371,
  11672,
  1370,
  2486,
  35553,
  17907,
  90621,
  45136,
  9722,
  67635,
  12114,
  63055,
  16004,
  21625,
  24321,
  20491,
  26881,
  66259,
  94287,
  54751,
  36242,
  36557,
  5842,
  30687,
  65418,
  94608,
  24741,
  45887,
  78800,
  86912,
  42076,
  50287,
  9284,
  68891,
  76368,
  83094,
  96302,
  35997,
  30761,
  97081,
  9501,
  68887,
  32876,
  1705,
  34260,
  95065,
  45528,
  88241,
  30402,
  12318,
  52430,
  40139,
  96986,
  84900,
  72408,
  42027,
  31676,
  54382,
  73370,
  26184,
  14024,
  57444,
  57660,
  52173,
  30274,
  93448,
  63273,
  77681,
  74946,
  2099,
  69091,
  19372,
  66961,
  14595,
  58642,
  75760,
  52253,
  53148,
  26074,
  52293,
  65359,
  63971,
  4833,
  86492,
  1227,
  54505,
  19515,
  89889,
  46933,
  13364,
  33883,
  83389,
  36952,
  52505,
  67513,
  40071,
  31001,
  3105,
  87912,
  29610,
  75108,
  37363,
  28479,
  43546,
  89992,
  19550,
  54863,
  82633,
  19209,
  21548,
  35022,
  21960,
  57961,
  11815,
  95867,
  559,
  26428,
  69386,
  57453,
  70147,
  73538,
  49562,
  46806,
  64550,
  36653,
  25718,
  68792,
  31113,
  7607,
  48037,
  71020,
  22666,
  65957,
  11141,
  39227,
  7990,
  19849,
  65972,
  74528,
  40888,
  55386,
  95918,
  92088,
  91125,
  53648,
  66122,
  138,
  79933,
  71058,
  34826,
  97725,
  69513,
  22915,
  18246,
  52244,
  91161,
  40861,
  40374,
  13239,
  56162,
  4703,
  95851,
  22824,
  41271,
  28202,
  62852,
  84238,
  46625,
  20031,
  8524,
  20077,
  65817,
  21174,
  29279,
  57712,
  22401,
  67500,
  30980,
  74485,
  26480,
  21343,
  30031,
  61921,
  35744,
  57308,
  71196,
  1865,
  49234,
  62616,
  54021,
  29008,
  83672,
  85839,
  96836,
  45077,
  80900,
  66906,
  63526,
  93824,
  71820,
  11033,
  20183,
  85704,
  4683,
  63512,
  39144,
  56880,
  64424,
  95979,
  17709,
  94849,
  31771,
  5737,
  84286,
  16757,
  46256,
  24478,
  73180,
  59978,
  8254,
  78963,
  95437,
  86351,
  33824,
  32540,
  18357,
  2668,
  99260,
  21284,
  81351,
  70961,
  10255,
  6911,
  47394,
  72408,
  23827,
  59865,
  96395,
  30665,
  43699,
  3593,
  29165,
  23388,
  26628,
  92402,
  16731,
  86740,
  29493,
  9069,
  78653,
  90094,
  42735,
  33682,
  95041,
  89887,
  92369,
  57949,
  81585,
  50593,
  14698,
  4737,
  72551,
  57271,
  59433,
  156,
  33966,
  58773,
  59108,
  49578,
  18100,
  59836,
  73221,
  21110,
  1650,
  11058,
  47770,
  66141,
  84576,
  58388,
  40915,
  94507,
  32209,
  17272,
  65674,
  95552,
  25685,
  5345,
  36995,
  36302,
  7971,
  67001,
  62062,
  75939,
  36005,
  26739,
  56484,
  46885,
  66348,
  87666,
  78055,
  44485,
  82955,
  85936,
  9219,
  1847,
  92687,
  72579,
  45457,
  78252,
  98239,
  4e4,
  75563,
  92408,
  17175,
  78845,
  32638,
  26959,
  35406,
  59553,
  57852,
  7506,
  9,
  93172,
  77713,
  93880,
  40981,
  27924,
  9678,
  24538,
  52426,
  84852,
  83781,
  23712,
  82490,
  77890,
  22482,
  66668,
  55850,
  25644,
  44972,
  62275,
  78089,
  28894,
  98685,
  32998,
  98766,
  89119,
  34355,
  75127,
  69797,
  71419,
  62067,
  57990,
  96514,
  50603,
  79807,
  26135,
  29207,
  43632,
  32905,
  38513,
  18924,
  88872,
  20758,
  70232,
  60425,
  1116,
  24077,
  21369,
  93541,
  75329,
  78656,
  44251,
  42014,
  98154,
  42552,
  14575,
  30765,
  348,
  1134,
  71581,
  68420,
  78141,
  21105,
  63305,
  9718,
  54851,
  65867,
  8595,
  47390,
  39182,
  51174,
  41478,
  64433,
  59628,
  31945,
  87322,
  78667,
  95282,
  5622,
  26224,
  19972,
  97269,
  98376,
  14779,
  51138,
  49658,
  45345,
  4972,
  52794,
  15737,
  496,
  48939,
  63485,
  42780,
  16061,
  59631,
  37171,
  13483,
  56058,
  51093,
  62290,
  88227,
  17400,
  88433,
  67363,
  89507,
  26482,
  85964,
  71336,
  67799,
  28342,
  37747,
  61722,
  27180,
  78755,
  18603,
  42953,
  6606,
  23875,
  56766,
  1932,
  36113,
  62807,
  84012,
  21103,
  9685,
  69662,
  76755,
  13701,
  95168,
  13169,
  44726,
  15284,
  16702,
  89617,
  54397,
  52052,
  12835,
  37741,
  86434,
  22400,
  37947,
  95763,
  86337,
  35189,
  22756,
  47473,
  16618,
  42479,
  47405,
  14055,
  64262,
  66670,
  89692,
  54032,
  94591,
  44149,
  29854,
  76691,
  33263,
  62048,
  25116,
  88598,
  16119,
  62116,
  54517,
  31883,
  86707,
  18895,
  81790,
  71294,
  2684,
  15292,
  48107,
  14341,
  91416,
  75609,
  92564,
  39987,
  2283,
  89970,
  95855,
  80970,
  5432,
  89860,
  90293,
  99851,
  94648,
  5598,
  32171,
  28793,
  92305,
  64244,
  8277,
  93391,
  96717,
  34464,
  29838,
  10664,
  28050,
  60122,
  77934,
  10758,
  84922,
  92220,
  45071,
  97697,
  36368,
  17792,
  84792,
  76594,
  67319,
  51886,
  5665,
  45201,
  11348,
  9254,
  7510,
  51039,
  91683,
  84500,
  85338,
  5555,
  19633,
  3870,
  39576,
  41486,
  58524,
  54508,
  20707,
  58504,
  39642,
  22454,
  80069,
  83455,
  31043,
  90794,
  51934,
  3295,
  26582,
  16300,
  74990,
  22197,
  83310,
  69642,
  81113,
  58558,
  84833,
  17105,
  46659,
  25003,
  85749,
  44829,
  4103,
  67516,
  76458,
  52392,
  53546,
  70291,
  98846,
  67315,
  30686,
  18555,
  29755,
  5923,
  22732,
  19501,
  56181,
  85351,
  5023,
  4808,
  56911,
  16793,
  75336,
  49712,
  27723,
  96974,
  34321,
  5454,
  12862,
  71924,
  45928,
  95697,
  68664,
  58183,
  78104,
  42483,
  71204,
  99628,
  40642,
  56410,
  17350,
  13396,
  76724,
  87509,
  9158,
  83708,
  27298,
  92651,
  95086,
  38851,
  63558,
  89810,
  1580,
  32518,
  35795,
  26514,
  56322,
  78635,
  63731,
  91428,
  7247,
  66460,
  38671,
  26799,
  22549,
  47991,
  46064,
  80467,
  40083,
  17141,
  39152,
  99872,
  27561,
  75389,
  74778,
  94893,
  82935,
  99076,
  93419,
  10474,
  84436,
  47536,
  16719,
  60136,
  80566,
  28404,
  74525,
  74212,
  3704,
  65516,
  98197,
  34210,
  64140,
  22238,
  49939,
  99542,
  27481,
  21992,
  78181,
  90060,
  71365,
  66935,
  29578,
  14961,
  8569,
  9454,
  43308,
  66753,
  45972,
  93572,
  16382,
  87320,
  37183,
  25478,
  38164,
  31997,
  69856,
  60898,
  63968,
  62264,
  4799,
  17591,
  89937,
  73905,
  55890,
  88285,
  2448,
  40398,
  54180,
  65869,
  45155,
  43407,
  39105,
  339,
  51619,
  20203,
  21189,
  68245,
  76912,
  1222,
  76411,
  82679,
  7,
  66047,
  32043,
  42627,
  16638,
  27019,
  15248,
  66444,
  8249,
  18790,
  82150,
  54084,
  84469,
  3426,
  50226,
  99868,
  88894,
  43769,
  66384,
  8593,
  41414,
  2976,
  60053,
  51866,
  87904,
  74135,
  53842,
  59520,
  67482,
  16995,
  32328,
  29555,
  49067,
  2799,
  68851,
  41049,
  97190,
  53984,
  99755,
  46412,
  45885,
  64e3,
  21962,
  36438,
  71742,
  57223,
  66599,
  86071,
  31436,
  32667,
  98099,
  38399,
  47377,
  5171,
  2742,
  48803,
  17823,
  22093,
  9866,
  691,
  5514,
  25546,
  2114,
  5919,
  56181,
  96052,
  67211,
  61712,
  25995,
  3188,
  23833,
  38549,
  44775,
  55355,
  61548,
  55988,
  47309,
  23749,
  30667,
  70732,
  33299,
  16127,
  30842,
  78961,
  41072,
  9876,
  18903,
  30292,
  25275,
  61881,
  15939,
  72573,
  84502,
  92654,
  97226,
  53434,
  77025,
  63892,
  12421,
  33644,
  39445,
  30933,
  84218,
  13757,
  37719,
  84450,
  2697,
  60309,
  22402,
  80310,
  92771,
  45205,
  72792,
  95776,
  85945,
  74651,
  216,
  50842,
  47854,
  21916,
  61588,
  75405,
  10495,
  83083,
  60427,
  78495,
  99809,
  47890,
  22993,
  21508,
  9459,
  26845,
  98130,
  1184,
  46438,
  27698,
  40652,
  65654,
  98517,
  1096,
  6998,
  49133,
  57041,
  77983,
  58708,
  42176,
  67356,
  324,
  70063,
  10597,
  65205,
  25622,
  34336,
  16640,
  27896,
  26907,
  86760,
  48244,
  89650,
  44997,
  51609,
  28934,
  9171,
  97859,
  97213,
  19859,
  41037,
  64081,
  94781,
  27683,
  41521,
  52871,
  86935,
  26486,
  38744,
  25943,
  60617,
  6414,
  42292,
  46204,
  53262,
  30201,
  38776,
  88831,
  97253,
  67282,
  72860,
  18452,
  60927,
  81504,
  57713,
  30296,
  10896,
  39900,
  67135,
  42772,
  4631,
  55283,
  39253,
  25264,
  1809,
  12874,
  88035,
  88421,
  90491,
  83290,
  6884,
  15444,
  90113,
  20406,
  20796,
  40239,
  34431,
  15018,
  45600,
  17241,
  26611,
  9551,
  89126,
  65673,
  31708,
  91252,
  39647,
  63011,
  24193,
  58932,
  89326,
  33491,
  53217,
  27976,
  70151,
  37531,
  53576,
  23931,
  11789,
  73073,
  52171,
  89301,
  51718,
  15385,
  79487,
  66436,
  35771,
  34163,
  86540,
  42665,
  80748,
  77622,
  14679,
  40185,
  25030,
  42622,
  13162,
  17048,
  24243,
  59985,
  59807,
  60562,
  3595,
  10135,
  29199,
  69784,
  59796,
  38194,
  58432,
  50943,
  40422,
  63035,
  3208,
  81440,
  90749,
  88046,
  32218,
  88092,
  22224,
  2627,
  91576,
  16781,
  43948,
  57795,
  71073,
  27817,
  87077,
  82717,
  24473,
  42096,
  76920,
  88864,
  90537,
  14715,
  42551,
  45066,
  24316,
  37361,
  38582,
  21871,
  14672,
  93362,
  21727,
  57021,
  94313,
  39562,
  64985,
  94028,
  46094,
  43845,
  91838,
  79574,
  7597,
  3153,
  56783,
  18817,
  74711,
  6883,
  91061,
  31674,
  73729,
  99315,
  66183,
  57647,
  74484,
  68077,
  33224,
  397,
  56753,
  53158,
  71872,
  68153,
  9298,
  20961,
  49656,
  33407,
  95683,
  14328,
  44708,
  72952,
  27048,
  67887,
  28741,
  46752,
  88177,
  95894,
  40086,
  88534,
  87112,
  68614,
  83073,
  88794,
  96799,
  67588,
  75049,
  84603,
  83140,
  97347,
  87316,
  73087,
  77135,
  71883,
  98643,
  3808,
  8848,
  14133,
  60447,
  1366,
  72976,
  1868,
  51667,
  63279,
  60040,
  88264,
  79152,
  3474,
  61366,
  20523,
  21584,
  93712,
  83654,
  89761,
  90154,
  96345,
  37539,
  32556,
  74254,
  70603,
  97122,
  44978,
  78028,
  8943,
  13778,
  11080,
  34271,
  68276,
  85372,
  48410,
  94516,
  15427,
  75323,
  71685,
  70774,
  50342,
  33771,
  3678,
  42321,
  69788,
  41758,
  55004,
  30992,
  17402,
  63523,
  42328,
  87171,
  24751,
  15084,
  33884,
  83655,
  88345,
  69602,
  52606,
  57886,
  18034,
  3381,
  75796,
  35901,
  77480,
  28683,
  68324,
  66035,
  7223,
  14926,
  16128,
  13645,
  90370,
  31949,
  11057,
  98849,
  29499,
  21565,
  30786,
  83292,
  92392,
  37104,
  36899,
  49906,
  79368,
  43710,
  80365,
  88735,
  75275,
  21664,
  57965,
  19002,
  301,
  12658,
  94385,
  1717,
  96191,
  50404,
  80166,
  93965,
  24688,
  27839,
  10812,
  31715,
  92127,
  42588,
  93307,
  80834,
  11317,
  26583,
  25769,
  98227,
  14884,
  58462,
  29148,
  68662,
  26872,
  72927,
  79021,
  51622,
  29521,
  33355,
  45701,
  45996,
  33782,
  93424,
  16530,
  96086,
  17329,
  74020,
  11501,
  46660,
  5583,
  22277,
  77653,
  55430,
  84644,
  448,
  86828,
  58855,
  67451,
  95264,
  67386,
  82424,
  52611,
  60012,
  88620,
  72894,
  94716,
  22262,
  99813,
  69592,
  63464,
  33163,
  91857,
  47904,
  22209,
  78590,
  68615,
  52952,
  31441,
  41313,
  18550,
  72685,
  68825,
  4795,
  53971,
  14592,
  39634,
  23682,
  76630,
  2731,
  81481,
  86542,
  23727,
  54291,
  56045,
  61635,
  32186,
  9355,
  73416,
  63532,
  24340,
  18886,
  84832,
  30654,
  48543,
  18339,
  65024,
  91197,
  64624,
  74648,
  9660,
  27897,
  49771,
  11123,
  8732,
  49393,
  12911,
  72416,
  17834,
  18878,
  62754,
  85072,
  23727,
  56577,
  51257,
  83291,
  12329,
  16203,
  91681,
  68137,
  79959,
  43609,
  58987,
  2026,
  42969,
  59144,
  84349,
  75214,
  76972,
  22633,
  64104,
  53799,
  16851,
  99197,
  70476,
  77113,
  46320,
  88693,
  37711,
  96536,
  68156,
  7119,
  2104,
  49435,
  77706,
  18924,
  24957,
  92406,
  87148,
  70482,
  36491,
  42605,
  54440,
  7893,
  31618,
  35707,
  65130,
  30007,
  75706,
  77266,
  37100,
  9601,
  87681,
  42543,
  69847,
  81848,
  32034,
  49429,
  99434,
  62209,
  17125,
  55227,
  61634,
  52574,
  83649,
  28725,
  70119,
  62467,
  80676,
  21192,
  99584,
  21310,
  25292,
  72781,
  17186,
  10393,
  98390,
  19789,
  92931,
  36234,
  62627,
  23437,
  3885,
  58822,
  82941,
  43806,
  8172,
  23790,
  72295,
  36196,
  98200,
  2889,
  87619,
  13846,
  56197,
  27151,
  21238,
  48794,
  81100,
  62643,
  40001,
  39243,
  33213,
  78416,
  194,
  91369,
  79342,
  36404,
  52308,
  13741,
  24442,
  88610,
  12659,
  11574,
  70052,
  93039,
  79367,
  41792,
  61816,
  35435,
  47192,
  97596,
  28330,
  41145,
  16918,
  62865,
  9576,
  45857,
  68737,
  90124,
  16703,
  7071,
  48433,
  57222,
  34435,
  800,
  72496,
  16449,
  68187,
  28739,
  97672,
  86818,
  50768,
  40807,
  88681,
  64340,
  2224,
  19703,
  59245,
  90905,
  31239,
  84216,
  93942,
  97371,
  16842,
  92168,
  52692,
  16064,
  84686,
  89444,
  27938,
  98406,
  41365,
  4515,
  20494,
  18813,
  16242,
  10634,
  61566,
  18592,
  78057,
  8720,
  33739,
  78345,
  87693,
  30242,
  70545,
  55521,
  23687,
  9160,
  8655,
  38811,
  61768,
  7228,
  5567,
  5561,
  82071,
  85,
  50145,
  23113,
  97761,
  88441,
  14891,
  72188,
  85166,
  37189,
  75671,
  81377,
  92470,
  73645,
  93258,
  6610,
  12185,
  43065,
  26704,
  47922,
  56650,
  7527,
  18006,
  56948,
  51675,
  16658,
  66402,
  1047,
  81624,
  77395,
  62310,
  73262,
  66050,
  57275,
  32936,
  87641,
  51528,
  58183,
  21952,
  84098,
  28913,
  28622,
  18140,
  89796,
  41317,
  93954,
  67690,
  64667,
  57092,
  21315,
  4731,
  76115,
  77291,
  11204,
  8634,
  93034,
  27411,
  27149,
  13843,
  9817,
  9407,
  84492,
  28444,
  59901,
  14592,
  89654,
  66207,
  66232,
  80293,
  74502,
  36925,
  55515,
  10121,
  16768,
  4720,
  71502,
  40500,
  21406,
  571,
  87320,
  81683,
  42788,
  86367,
  44686,
  22159,
  67015,
  35892,
  49668,
  83991,
  72088,
  30210,
  74009,
  86370,
  97956,
  2132,
  93512,
  54819,
  26094,
  51409,
  21485,
  94764,
  85806,
  13393,
  48543,
  7042,
  76538,
  64224,
  47909,
  9994,
  23750,
  17351,
  52141,
  30486,
  60380,
  86546,
  66606,
  36913,
  58173,
  45709,
  83679,
  82617,
  23381,
  9603,
  61107,
  566,
  6572,
  64745,
  10614,
  86371,
  43244,
  97154,
  10397,
  50975,
  68006,
  20045,
  16942,
  25536,
  74031,
  31807,
  70133,
  78790,
  40341,
  68730,
  39635,
  39013,
  66841,
  44043,
  96215,
  21270,
  59427,
  25034,
  40645,
  84741,
  52083,
  54503,
  36861,
  27659,
  95463,
  53847,
  40921,
  70116,
  61536,
  56756,
  8967,
  31079,
  20097,
  76014,
  99818,
  16606,
  19713,
  66904,
  27106,
  24874,
  96701,
  73287,
  76772,
  6073,
  57343,
  51428,
  91171,
  28299,
  17520,
  64903,
  4177,
  36071,
  94952,
  59008,
  28543,
  11576,
  74547,
  13260,
  20688,
  41261,
  2780,
  6633,
  37536,
  8844,
  95774,
  49323,
  30448,
  14154,
  83379,
  71259,
  23302,
  68402,
  43750,
  88505,
  15575,
  44927,
  6584,
  29867,
  21541,
  65763,
  12154,
  86616,
  79877,
  73259,
  68626,
  98962,
  68548,
  86576,
  48046,
  51755,
  64995,
  3661,
  64585,
  81550,
  46798,
  49319,
  50206,
  22024,
  5175,
  12923,
  23427,
  55915,
  91723,
  55831,
  83784,
  81034,
  86779,
  34622,
  84570,
  18960,
  48798,
  42970,
  95789,
  39465,
  82353,
  68905,
  44234,
  18244,
  54345,
  5592,
  89361,
  14644,
  67924,
  66415,
  89349,
  88530,
  72096,
  44459,
  5258,
  48317,
  48866,
  56886,
  90458,
  75889,
  4514,
  37227,
  11302,
  4667,
  2129,
  80414,
  86289,
  15887,
  87380,
  50749,
  83220,
  50529,
  20619,
  11606,
  36531,
  23409,
  78122,
  19566,
  76564,
  33045,
  66703,
  30017,
  35347,
  35038,
  12952,
  13971,
  3922,
  98702,
  11786,
  38388,
  69556,
  76728,
  60535,
  59961,
  23634,
  42211,
  98387,
  34880,
  27755,
  93182,
  99040,
  96390,
  65989,
  38375,
  3652,
  59657,
  57431,
  24666,
  11061,
  64713,
  85185,
  72849,
  58611,
  31220,
  26657,
  77056,
  24553,
  24993,
  5210,
  89024,
  32054,
  46997,
  92652,
  28363,
  98992,
  22593,
  97710,
  47766,
  37646,
  93573,
  95502,
  33790,
  92973,
  27766,
  62671,
  89698,
  10877,
  73893,
  41004,
  96035,
  18795,
  48080,
  59666,
  30241,
  35233,
  87353,
  43647,
  13404,
  41982,
  19264,
  29229,
  61369,
  8309,
  39383,
  42305,
  25944,
  13577,
  51545,
  68990,
  69801,
  37145,
  79189,
  55897,
  57793,
  66816,
  21930,
  56771,
  79296,
  73793,
  21632,
  42301,
  23696,
  72641,
  56310,
  85576,
  3004,
  25669,
  69221,
  32996,
  23040,
  65782,
  23712,
  13414,
  10758,
  15590,
  97298,
  74246,
  51511,
  46900,
  36795,
  38292,
  3852,
  6384,
  84421,
  3446,
  91670,
  45312,
  27609,
  87034,
  6683,
  83891,
  88991,
  16533,
  9197,
  34427,
  60384,
  48525,
  90978,
  46107,
  21693,
  12956,
  21804,
  46558,
  37682,
  81207,
  85840,
  53238,
  35026,
  4835,
  53264,
  41376,
  17783,
  64756,
  39278,
  25403,
  33042,
  20954,
  31193,
  24247,
  45911,
  92453,
  25370,
  86602,
  48574,
  57865,
  26436,
  16122,
  76614,
  17028,
  21262,
  59718,
  77821,
  14036,
  31033,
  90563,
  45410,
  15158,
  90209,
  84089,
  38053,
  60780,
  54166,
  14255,
  33120,
  27171,
  71798,
  91214,
  80040,
  56699,
  12475,
  40193,
  59415,
  4769,
  75920,
  1036,
  2692,
  75862,
  16612,
  73670,
  61182,
  3305,
  90334,
  187,
  91659,
  28063,
  75684,
  50017,
  82643,
  9282,
  77376,
  85469,
  8164,
  5584,
  36623,
  82597,
  83859,
  3435,
  98460,
  70095,
  80257,
  4381,
  6501,
  8924,
  35514,
  14297,
  54373,
  71369,
  5172,
  15955,
  82441,
  4636,
  48215,
  6821,
  3385,
  17663,
  40107,
  55679,
  30366,
  42390,
  95895,
  16083,
  58499,
  17176,
  55993,
  51034,
  49296,
  4010,
  78974,
  35930,
  2019,
  96226,
  27167,
  68245,
  53109,
  59037,
  37843,
  79243,
  10262,
  58797,
  61490,
  82590,
  52411,
  54783,
  29447,
  94551,
  30026,
  97959,
  93939,
  73217,
  82573,
  62154,
  78291,
  33728,
  39102,
  11484,
  86210,
  43794,
  73553,
  87435,
  1110,
  77108,
  56521,
  78610,
  8254,
  1842,
  43068,
  70415,
  79195,
  26136,
  49786,
  47279,
  38471,
  20379,
  54704,
  86614,
  91138,
  51595,
  50818,
  80186,
  73087,
  17262,
  94735,
  4952,
  27935,
  4928,
  74862,
  51392,
  62388,
  9570,
  38485,
  30594,
  56278,
  47395,
  72762,
  94597,
  72279,
  16010,
  34697,
  54475,
  67874,
  78014,
  88381,
  4045,
  41494,
  55178,
  46054,
  24373,
  1824,
  55333,
  7525,
  97908,
  61178,
  84635,
  2199,
  35361,
  4803,
  21907,
  79414,
  66083,
  54782,
  58692,
  28332,
  41851,
  28198,
  55819,
  37313,
  67046,
  16147,
  90478,
  71230,
  34141,
  85002,
  44332,
  35906,
  429,
  39744,
  773,
  22909,
  19536,
  98986,
  90945,
  45209,
  85439,
  92265,
  25291,
  22775,
  60611,
  49159,
  95701,
  36113,
  53923,
  60824,
  84935,
  29656,
  50007,
  86624,
  61691,
  76150,
  32187,
  42765,
  60660,
  13859,
  10792,
  88210,
  29374,
  29563,
  45188,
  28811,
  19739,
  67649,
  73775,
  99247,
  48414,
  91067,
  68253,
  9452,
  90116,
  91737,
  73979,
  62370,
  69112,
  58791,
  20349,
  71480,
  56852,
  36919,
  87977,
  77609,
  68738,
  85159,
  4918,
  70076,
  46473,
  4122,
  57713,
  1426,
  50987,
  77910,
  66211,
  62546,
  77749,
  96462,
  34304,
  77441,
  12104,
  91805,
  10287,
  60943,
  49632,
  83116,
  25716,
  23113,
  22707,
  77770,
  31176,
  6759,
  46130,
  4739,
  55554,
  3843,
  31653,
  70834,
  72877,
  41561,
  36903,
  23010,
  6663,
  2266,
  16360,
  70118,
  91936,
  17098,
  77278,
  4880,
  23484,
  94970,
  41826,
  46733,
  93484,
  68350,
  38861,
  18134,
  32936,
  241,
  24803,
  13876,
  93278,
  5039,
  35873,
  44418,
  5305,
  28510,
  36115,
  46717,
  15238,
  78607,
  23464,
  68635,
  55712,
  55007,
  92411,
  65739,
  4858,
  67537,
  37041,
  67453,
  89801,
  45963,
  14800,
  14225,
  65655,
  80463,
  9716,
  77255,
  65136,
  11230,
  76323,
  81433,
  36445,
  86523,
  61058,
  59560,
  19380,
  40791,
  48073,
  29626,
  36661,
  87907,
  57369,
  41623,
  13705,
  3880,
  45088,
  55444,
  41003,
  27754,
  1450,
  75312,
  71801,
  99600,
  60719,
  54182,
  29245,
  63315,
  73758,
  42973,
  32702,
  10855,
  56363,
  14638,
  84424,
  27178,
  78195,
  3133,
  70865,
  48019,
  26117,
  7151,
  52107,
  85562,
  41347,
  50486,
  69457,
  86961,
  95482,
  11857,
  93587,
  45680,
  42145,
  13029,
  10043,
  5142,
  49213,
  54525,
  85761,
  42707,
  70754,
  33768,
  87671,
  85038,
  58900,
  88438,
  20004,
  63390,
  14815,
  38875,
  73417,
  82875,
  89481,
  55517,
  944,
  15773,
  61814,
  32915,
  27868,
  5510,
  21916,
  28426,
  89881,
  16680,
  88850,
  11056,
  51991,
  4230,
  39107,
  49216,
  40065,
  4523,
  75848,
  95349,
  56034,
  10724,
  9885,
  88232,
  42478,
  65702,
  95696,
  39746,
  66032,
  88082,
  86905,
  30007,
  75068,
  66629,
  7358,
  26706,
  90511,
  72843,
  67857,
  20061,
  98581,
  69682,
  38e3,
  14186,
  70,
  2290,
  17269,
  30909,
  69449,
  19997,
  13275,
  2444,
  84985,
  51290,
  97641,
  15092,
  69650,
  21920,
  19617,
  7418,
  49725,
  91090,
  20805,
  28627,
  80665,
  67192,
  34697,
  57667,
  99323,
  50101,
  40587,
  35081,
  14037,
  34414,
  19898,
  60779,
  83267,
  87499,
  29596,
  41852,
  15813,
  32419,
  72232,
  8322,
  39184,
  46525,
  13833,
  65743,
  94595,
  37363,
  4711,
  35386,
  96413,
  10627,
  62625,
  56555,
  12919,
  93218,
  25191,
  98380,
  51923,
  66181,
  5788,
  73491,
  1452,
  487,
  12277,
  45415,
  11884,
  61300,
  94528,
  9181,
  26616,
  11455,
  31514,
  63290,
  45035,
  42759,
  33804,
  85721,
  80979,
  46010,
  50975,
  72482,
  31231,
  3086,
  58941,
  46102,
  25773,
  89742,
  29788,
  96741,
  88523,
  14922,
  88262,
  76305,
  57676,
  93259,
  2396,
  69145,
  26074,
  30056,
  3853,
  75317,
  56639,
  66203,
  38923,
  48939,
  22813,
  91864,
  10934,
  6714,
  84099,
  25631,
  73223,
  95630,
  97552,
  45950,
  22197,
  42886,
  33764,
  1263,
  41856,
  82057,
  62349,
  94091,
  78028,
  62651,
  18911,
  5693,
  92561,
  97821,
  41994,
  92343,
  76785,
  22216,
  4203,
  5038,
  86151,
  23596,
  24338,
  77181,
  51761,
  97693,
  10955,
  98159,
  37568,
  58932,
  72128,
  27303,
  99608,
  31688,
  57557,
  91022,
  43036,
  93927,
  32869,
  53653,
  55205,
  33139,
  47271,
  31224,
  51650,
  36422,
  86857,
  73799,
  22068,
  43376,
  84760,
  44898,
  65776,
  42451,
  71480,
  38509,
  41673,
  44141,
  75918,
  95652,
  68981,
  83001,
  48815,
  98086,
  67950,
  27986,
  33175,
  43624,
  55274,
  71051,
  61124,
  51550,
  64967,
  31570,
  15748,
  19159,
  38174,
  51078,
  79811,
  39183,
  57527,
  96550,
  85168,
  28824,
  47466,
  56993,
  13151,
  96664,
  29735,
  70251,
  1079,
  4314,
  77714,
  11507,
  1440,
  48415,
  31984,
  99915,
  20282,
  26524,
  18057,
  4992,
  40521,
  98108,
  84045,
  91961,
  79256,
  72244,
  25788,
  5487,
  23595,
  73302,
  14205,
  8925,
  27625,
  64343,
  28821,
  37992,
  67156,
  83320,
  31106,
  10884,
  30735,
  15067,
  51091,
  15668,
  48777,
  50770,
  19169,
  76504,
  41165,
  29749,
  92812,
  8065,
  66782,
  26841,
  1411,
  95461,
  61134,
  18699,
  52261,
  60469,
  81373,
  44825,
  11448,
  73320,
  30151,
  56991,
  31372,
  6655,
  36472,
  86292,
  30247,
  30931,
  21029,
  53410,
  9859,
  37267,
  47514,
  3492,
  49008,
  94727,
  25234,
  40546,
  53417,
  36492,
  25723,
  76227,
  58456,
  15979,
  34876,
  9574,
  34392,
  3751,
  36933,
  83921,
  65108,
  63135,
  67572,
  40184,
  21098
];
var SBOX2 = new Array(16);
var shiftTable = [16, 8, 16, 24];
var sboxSize = 16;
var count5 = 4;
var randomIndex = 0;
function getRandomDigit() {
  if (count5 < 0) {
    count5 = 4;
    randomIndex++;
  }
  return randTable[randomIndex] % Math.pow(10, count5 + 1) / Math.pow(10, count5--) | 0;
}
function getRandomNumber(low, high) {
  let range = high - low + 1;
  let rand = 0;
  let max = 1;
  do {
    for (rand = 0, max = 1; max < range; max *= 10) {
      rand = rand * 10 + getRandomDigit();
    }
  } while (rand >= (max / range | 0) * range);
  return low + rand % range | 0;
}
function generateSbox(size) {
  for (let i = 0; i < size; i++) {
    SBOX2[i] = new Array(256);
    for (let row = 0; row < 256; row++) {
      SBOX2[i][row] = row | row << 8 | row << 16 | row << 24 | 0;
    }
    for (let col = 3; col >= 0; col--) {
      for (let row = 0; row < 255; row++) {
        let mask = 255 << (col << 3);
        let temp = SBOX2[i][row] | 0;
        let row2 = getRandomNumber(row, 255);
        SBOX2[i][row] = SBOX2[i][row] & ~mask | SBOX2[i][row2] & mask | 0;
        SBOX2[i][row2] = SBOX2[i][row2] & ~mask | temp & mask | 0;
      }
    }
  }
}
generateSbox(sboxSize);
var Snefru = class extends hasher32be_default {
  /**
     * @param {Object} [options]
  
     * | Hash type   | Length | Rounds |
     * |-------------|--------|--------|
     * | snefru128/2 | 128    | 2      |
     * | snefru256/4 | 256    | 4      |
     * | snefru128/8 | 128    | 8      |
     * | snefru256/8 | 256    | 8      |
     *
     * @param {number} [options.rounds=8] - Number of rounds (Can be from 2 to 8)
     * @param {number} [options.length=128] - Length of hash result (Can be from 32 to 480 with step 32).
     * Be careful, increasing of length will cause a reduction of the block size
     */
  constructor(options) {
    options = options || {};
    options.length = options.length || 128;
    options.rounds = options.rounds || 8;
    super(options);
    this.blockSize = 16 - this.state.hash.length;
    this.blockSizeInBytes = this.blockSize * this.unitSize;
    this.W = new Array(16);
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = new Array(this.options.length / 32 | 0);
    for (let i = 0; i < this.state.hash.length; i++) {
      this.state.hash[i] = 0 | 0;
    }
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    for (let i = 0; i < this.state.hash.length; i++) {
      this.W[i] = this.state.hash[i] | 0;
    }
    for (let i = this.state.hash.length; i < 16; i++) {
      this.W[i] = block[i - this.state.hash.length] | 0;
    }
    for (let i = 0; i < this.options.rounds << 1; i += 2) {
      for (let byteInWord = 0; byteInWord < 4; byteInWord++) {
        for (let n = 0; n < 16; n++) {
          let sbe = SBOX2[i + (n / 2 | 0) % 2][this.W[n] & 255] | 0;
          this.W[n - 1 >>> 0 & 15] ^= sbe;
          this.W[n + 1 & 15] ^= sbe;
        }
        for (let n = 0; n < 16; n++) {
          this.W[n] = rotateRight(this.W[n], shiftTable[byteInWord]);
        }
      }
    }
    for (let i = 0; i < this.state.hash.length; i++) {
      this.state.hash[i] = this.state.hash[i] ^ this.W[15 - i] | 0;
    }
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    if (this.state.message.length > 0) {
      this.addPaddingZero(this.blockSizeInBytes - this.state.message.length | 0);
    }
    this.addPaddingZero(this.blockSizeInBytes - 8 | 0);
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var snefru_default = Snefru;

// node_modules/crypto-api/src/hasher/whirlpool.mjs
var SBOX3 = new Array(256);
var SBOX0 = [
  104,
  208,
  235,
  43,
  72,
  157,
  106,
  228,
  227,
  163,
  86,
  129,
  125,
  241,
  133,
  158,
  44,
  142,
  120,
  202,
  23,
  169,
  97,
  213,
  93,
  11,
  140,
  60,
  119,
  81,
  34,
  66,
  63,
  84,
  65,
  128,
  204,
  134,
  179,
  24,
  46,
  87,
  6,
  98,
  244,
  54,
  209,
  107,
  27,
  101,
  117,
  16,
  218,
  73,
  38,
  249,
  203,
  102,
  231,
  186,
  174,
  80,
  82,
  171,
  5,
  240,
  13,
  115,
  59,
  4,
  32,
  254,
  221,
  245,
  180,
  95,
  10,
  181,
  192,
  160,
  113,
  165,
  45,
  96,
  114,
  147,
  57,
  8,
  131,
  33,
  92,
  135,
  177,
  224,
  0,
  195,
  18,
  145,
  138,
  2,
  28,
  230,
  69,
  194,
  196,
  253,
  191,
  68,
  161,
  76,
  51,
  197,
  132,
  35,
  124,
  176,
  37,
  21,
  53,
  105,
  255,
  148,
  77,
  112,
  162,
  175,
  205,
  214,
  108,
  183,
  248,
  9,
  243,
  103,
  164,
  234,
  236,
  182,
  212,
  210,
  20,
  30,
  225,
  36,
  56,
  198,
  219,
  75,
  122,
  58,
  222,
  94,
  223,
  149,
  252,
  170,
  215,
  206,
  7,
  15,
  61,
  88,
  154,
  152,
  156,
  242,
  167,
  17,
  126,
  139,
  67,
  3,
  226,
  220,
  229,
  178,
  78,
  199,
  109,
  233,
  39,
  64,
  216,
  55,
  146,
  143,
  1,
  29,
  83,
  62,
  89,
  193,
  79,
  50,
  22,
  250,
  116,
  251,
  99,
  159,
  52,
  26,
  42,
  90,
  141,
  201,
  207,
  246,
  144,
  40,
  136,
  155,
  49,
  14,
  189,
  74,
  232,
  150,
  166,
  12,
  200,
  121,
  188,
  190,
  239,
  110,
  70,
  151,
  91,
  237,
  25,
  217,
  172,
  153,
  168,
  41,
  100,
  31,
  173,
  85,
  19,
  187,
  247,
  111,
  185,
  71,
  47,
  238,
  184,
  123,
  137,
  48,
  211,
  127,
  118,
  130
];
var eBOX = [
  1,
  11,
  9,
  12,
  13,
  6,
  15,
  3,
  14,
  8,
  7,
  4,
  10,
  2,
  5,
  0
];
var rBOX = [
  7,
  12,
  11,
  13,
  14,
  4,
  9,
  15,
  6,
  3,
  8,
  10,
  2,
  5,
  1,
  0
];
var iBOX = new Array(16);
var theta = [1, 1, 4, 1, 8, 5, 2, 9];
var theta0 = [1, 1, 3, 1, 5, 8, 9, 5];
var C = new Array(512);
var RC = new Array(22);
var C0 = new Array(512);
var RC0 = new Array(22);
var CT = new Array(512);
var RCT = new Array(22);
function calculateSBOX() {
  for (let i = 0; i < 16; i++) {
    iBOX[eBOX[i]] = i | 0;
  }
  for (let i = 0; i < 256; i++) {
    let left = eBOX[i >> 4];
    let right = iBOX[i & 15];
    let temp = rBOX[left ^ right];
    SBOX3[i] = eBOX[left ^ temp] << 4 | iBOX[right ^ temp];
  }
}
function calculateRC(SBOX4, theta2) {
  const C3 = new Array(512);
  const RC2 = new Array(22);
  for (let t = 0; t < 8; t++) {
    C3[t] = [];
  }
  for (let i = 0; i < 256; i++) {
    let V = new Array(10);
    V[1] = SBOX4[i];
    V[2] = V[1] << 1;
    if (V[2] >= 256) {
      V[2] ^= 285;
    }
    V[3] = V[2] ^ V[1];
    V[4] = V[2] << 1;
    if (V[4] >= 256) {
      V[4] ^= 285;
    }
    V[5] = V[4] ^ V[1];
    V[8] = V[4] << 1;
    if (V[8] >= 256) {
      V[8] ^= 285;
    }
    V[9] = V[8] ^ V[1];
    C3[0][i * 2] = V[theta2[0]] << 24 | V[theta2[1]] << 16 | V[theta2[2]] << 8 | V[theta2[3]];
    C3[0][i * 2 + 1] = V[theta2[4]] << 24 | V[theta2[5]] << 16 | V[theta2[6]] << 8 | V[theta2[7]];
    for (let t = 1; t < 8; t++) {
      C3[t][i * 2] = rotateRight64lo(C3[0][i * 2 + 1], C3[0][i * 2], t << 3);
      C3[t][i * 2 + 1] = rotateRight64hi(C3[0][i * 2 + 1], C3[0][i * 2], t << 3);
    }
  }
  RC2[0] = 0;
  RC2[1] = 0;
  for (let i = 1; i <= 10; i++) {
    RC2[i * 2] = C3[0][16 * i - 16] & 4278190080 ^ C3[1][16 * i - 14] & 16711680 ^ C3[2][16 * i - 12] & 65280 ^ C3[3][16 * i - 10] & 255;
    RC2[i * 2 + 1] = C3[4][16 * i - 7] & 4278190080 ^ C3[5][16 * i - 5] & 16711680 ^ C3[6][16 * i - 3] & 65280 ^ C3[7][16 * i - 1] & 255;
  }
  return [C3, RC2];
}
(function() {
  calculateSBOX();
  let x = calculateRC(SBOX0, theta0);
  C0 = x[0];
  RC0 = x[1];
  x = calculateRC(SBOX3, theta0);
  CT = x[0];
  RCT = x[1];
  x = calculateRC(SBOX3, theta);
  C = x[0];
  RC = x[1];
})();
var Whirlpool = class extends hasher32be_default {
  /**
   * @param {Object} [options]
   * @param {number} [options.rounds=10] - Number of rounds (Can be from 1 to 10)
   * @param {string} [options.type] - Algorithm type
   *
   * | Hash type   | Type      |
   * |-------------|-----------|
   * | whirlpool-0 | '0'       |
   * | whirlpool-t | 't'       |
   * | whirlpool   | undefined |
   */
  constructor(options) {
    options = options || {};
    options.type = options.type || "";
    options.rounds = options.rounds || 10;
    super(options);
    switch (this.options.type) {
      case "0":
      case 0:
        this.C = C0;
        this.RC = RC0;
        break;
      case "t":
        this.C = CT;
        this.RC = RCT;
        break;
      default:
        this.C = C;
        this.RC = RC;
    }
  }
  /**
   * Reset hasher to initial state
   */
  reset() {
    super.reset();
    this.state.hash = new Array(16);
    for (let i = 0; i < 16; i++) {
      this.state.hash[i] = 0 | 0;
    }
  }
  /**
   * Process ready blocks
   *
   * @protected
   * @ignore
   * @param {number[]} block - Block
   */
  processBlock(block) {
    let K6 = new Array(16);
    let state = [];
    for (let i = 0; i < 16; i++) {
      state[i] = block[i] ^ (K6[i] = this.state.hash[i]) | 0;
    }
    let L = [];
    for (let r = 1; r <= this.options.rounds; r++) {
      for (let i = 0; i < 8; i++) {
        L[i * 2] = 0;
        L[i * 2 + 1] = 0;
        for (let t = 0, s = 56, j = 0; t < 8; t++, s -= 8, j = s < 32 ? 1 : 0) {
          L[i * 2] ^= this.C[t][(K6[(i - t & 7) * 2 + j] >>> s % 32 & 255) * 2];
          L[i * 2 + 1] ^= this.C[t][(K6[(i - t & 7) * 2 + j] >>> s % 32 & 255) * 2 + 1];
        }
      }
      for (let i = 0; i < 16; i++) {
        K6[i] = L[i];
      }
      K6[0] ^= this.RC[r * 2];
      K6[1] ^= this.RC[r * 2 + 1];
      for (let i = 0; i < 8; i++) {
        L[i * 2] = K6[i * 2];
        L[i * 2 + 1] = K6[i * 2 + 1];
        for (let t = 0, s = 56, j = 0; t < 8; t++, s -= 8, j = s < 32 ? 1 : 0) {
          L[i * 2] ^= this.C[t][(state[(i - t & 7) * 2 + j] >>> s % 32 & 255) * 2];
          L[i * 2 + 1] ^= this.C[t][(state[(i - t & 7) * 2 + j] >>> s % 32 & 255) * 2 + 1];
        }
      }
      for (let i = 0; i < 16; i++) {
        state[i] = L[i];
      }
    }
    for (let i = 0; i < 16; i++) {
      this.state.hash[i] ^= state[i] ^ block[i];
    }
  }
  /**
   * Finalize hash and return result
   *
   * @returns {string}
   */
  finalize() {
    this.addPaddingISO7816(
      this.state.message.length < 32 ? 56 - this.state.message.length | 0 : 120 - this.state.message.length | 0
    );
    this.addLengthBits();
    this.process();
    return this.getStateHash();
  }
};
var whirlpool_default = Whirlpool;

// node_modules/crypto-api/src/encoder/utf.mjs
function fromUtf(message) {
  let raw = "";
  for (let i = 0, msgLen = message.length; i < msgLen; i++) {
    let charCode = message.charCodeAt(i);
    if (charCode < 128) {
      raw += String.fromCharCode(charCode);
    } else if (charCode < 2048) {
      raw += String.fromCharCode(192 | charCode >> 6);
      raw += String.fromCharCode(128 | charCode & 63);
    } else if (charCode < 55296 || charCode >= 57344) {
      raw += String.fromCharCode(224 | charCode >> 12);
      raw += String.fromCharCode(128 | charCode >> 6 & 63);
      raw += String.fromCharCode(128 | charCode & 63);
    } else {
      i++;
      charCode = 65536 + ((charCode & 1023) << 10 | message.charCodeAt(i) & 1023);
      raw += String.fromCharCode(240 | charCode >> 18);
      raw += String.fromCharCode(128 | charCode >> 12 & 63);
      raw += String.fromCharCode(128 | charCode >> 6 & 63);
      raw += String.fromCharCode(128 | charCode & 63);
    }
  }
  return raw;
}

// node_modules/crypto-api/src/encoder/array-buffer.mjs
function fromArrayBuffer(buffer3) {
  let s = "";
  const bytes = new Uint8Array(buffer3);
  for (var i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

// node_modules/crypto-api/src/encoder/hex.mjs
function toHex(raw) {
  let str = "";
  for (let i = 0, l = raw.length; i < l; i++) {
    str += (raw.charCodeAt(i) < 16 ? "0" : "") + raw.charCodeAt(i).toString(16);
  }
  return str;
}

// node_modules/crypto-api/src/encoder/base64.mjs
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(raw) {
  let str = "";
  let size = raw.length - raw.length % 3 | 0;
  let n = 0;
  for (let i = 0; i < size; i += 3) {
    n = raw.charCodeAt(i) << 16 | raw.charCodeAt(i + 1) << 8 | raw.charCodeAt(i + 2);
    str += chars.charAt(n >> 18) + chars.charAt(n >> 12 & 63) + chars.charAt(n >> 6 & 63) + chars.charAt(n & 63);
  }
  if (raw.length - size === 2) {
    n = raw.charCodeAt(size) << 16 | raw.charCodeAt(size + 1) << 8;
    str += chars.charAt(n >> 18) + chars.charAt(n >> 12 & 63) + chars.charAt(n >> 6 & 63) + "=";
  } else if (raw.length - size === 1) {
    n = raw.charCodeAt(size) << 16;
    str += chars.charAt(n >> 18) + chars.charAt(n >> 12 & 63) + "==";
  }
  return str;
}

// node_modules/crypto-api/src/mac/hmac.mjs
var Hmac = class {
  /**
   *
   * @param {string} key
   * @param {Hasher} hasher
   */
  constructor(key, hasher) {
    if (key.length > hasher.blockSizeInBytes) {
      hasher.update(key);
      key = hasher.finalize();
      hasher.reset();
    }
    for (let i = key.length; i < hasher.blockSizeInBytes; i++) {
      key += "\0";
    }
    this.oPad = "";
    for (let i = 0; i < key.length; i++) {
      hasher.update(String.fromCharCode(54 ^ key.charCodeAt(i)));
      this.oPad += String.fromCharCode(92 ^ key.charCodeAt(i));
    }
    this.hasher = hasher;
  }
  /**
   * Update message from binary string
   *
   * @param {string} message
   */
  update(message) {
    this.hasher.update(message);
  }
  /**
   * Finalize hmac and return result
   *
   * @returns {string}
   */
  finalize() {
    let hash = this.hasher.finalize();
    this.hasher.reset();
    this.hasher.update(this.oPad);
    this.hasher.update(hash);
    return this.hasher.finalize();
  }
};
var hmac_default = Hmac;

// node_modules/crypto-api/src/crypto-api.mjs
var CryptoApi = class {
  /**
   * @ignore
   */
  constructor() {
    this.encoder = {};
    this.encoder.fromUtf = fromUtf;
    this.encoder.fromArrayBuffer = fromArrayBuffer;
    this.encoder.toHex = toHex;
    this.encoder.toBase64 = toBase64;
  }
  /**
   * Get hasher by alias
   *
   * @param {string} name
   * @param {Object} options
   * @returns {Hasher}
   */
  getHasher(name, options) {
    options = options || {};
    switch (name) {
      case "has160":
        return new has160_default(options);
      case "md2":
        return new md2_default(options);
      case "md4":
        return new md4_default(options);
      case "md5":
        return new md5_default(options);
      case "ripemd128":
        options = Object.assign({}, { length: 128 }, options);
        return new ripemd_default(options);
      case "ripemd":
      case "ripemd160":
        options = Object.assign({}, { length: 160 }, options);
        return new ripemd_default(options);
      case "ripemd256":
        options = Object.assign({}, { length: 256 }, options);
        return new ripemd_default(options);
      case "ripemd320":
        options = Object.assign({}, { length: 320 }, options);
        return new ripemd_default(options);
      case "sha0":
        return new sha0_default(options);
      case "sha1":
        return new sha1_default(options);
      case "sha224":
        options = Object.assign({}, { length: 224 }, options);
        return new sha256_default(options);
      case "sha256":
        options = Object.assign({}, { length: 256 }, options);
        return new sha256_default(options);
      case "sha384":
        options = Object.assign({}, { length: 384 }, options);
        return new sha512_default(options);
      case "sha512":
        options = Object.assign({}, { length: 512 }, options);
        return new sha512_default(options);
      case "sha512/224":
        options = Object.assign({}, { length: 224 }, options);
        return new sha512_default(options);
      case "sha512/256":
        options = Object.assign({}, { length: 256 }, options);
        return new sha512_default(options);
      case "snefru":
      case "snefru128":
      case "snefru128/8":
        options = Object.assign({}, { length: 128 }, options);
        return new snefru_default(options);
      case "snefru256":
      case "snefru256/8":
        options = Object.assign({}, { length: 256 }, options);
        return new snefru_default(options);
      case "snefru128/2":
        options = Object.assign({}, { length: 128, rounds: 2 }, options);
        return new snefru_default(options);
      case "snefru256/4":
        options = Object.assign({}, { length: 256, rounds: 4 }, options);
        return new snefru_default(options);
      case "whirlpool":
        return new whirlpool_default(options);
      case "whirlpool-0":
        options = Object.assign({}, { type: "0" }, options);
        return new whirlpool_default(options);
      case "whirlpool-t":
        options = Object.assign({}, { type: "t" }, options);
        return new whirlpool_default(options);
    }
  }
  /**
   * Hash UTF message and return result in hex
   *
   * @param {string} name
   * @param {string} message
   * @param {Object} options
   * @returns {string}
   */
  hash(name, message, options) {
    options = options || {};
    let hasher = this.getHasher(name, options);
    hasher.update(fromUtf(message));
    return toHex(hasher.finalize());
  }
  /**
   * Get HMAC instance
   *
   * @param {string} key
   * @param {Hasher} hasher
   * @returns {Hmac}
   */
  getHmac(key, hasher) {
    return new hmac_default(key, hasher);
  }
  /**
   * HMAC with UTF key from UTF message and return result in hex
   *
   * @param {string} key
   * @param {string} message
   * @param {Hasher} hasher
   * @returns {string}
   */
  hmac(key, message, hasher) {
    let mac = this.getHmac(fromUtf(key), hasher);
    mac.update(fromUtf(message));
    return toHex(mac.finalize());
  }
};
CryptoApi = new CryptoApi();
var crypto_api_default = CryptoApi;

// crypto_shim.mjs
var crypto_shim_default = globalThis.crypto;

// gost/gostRandom.mjs
var rootCrypto = crypto_shim_default;
var TypeMismatchError = Error;
var QuotaExceededError = Error;
var randomRing = {
  seed: new Uint8Array(1024),
  getIndex: 0,
  setIndex: 0,
  set: function(x) {
    if (this.setIndex >= 1024)
      this.setIndex = 0;
    this.seed[this.setIndex++] = x;
  },
  get: function() {
    if (this.getIndex >= 1024)
      this.getIndex = 0;
    return this.seed[this.getIndex++];
  }
};
if (typeof document !== "undefined") {
  try {
    document.addEventListener("mousemove", function(e) {
      randomRing.set(Date.now() & 255 ^ (e.clientX || e.pageX) & 255 ^ (e.clientY || e.pageY) & 255);
    }, false);
  } catch (e) {
  }
  try {
    document.addEventListener("keydown", function(e) {
      randomRing.set(Date.now() & 255 ^ e.keyCode & 255);
    }, false);
  } catch (e) {
  }
}
function GostRandom() {
}
GostRandom.prototype.getRandomValues = function(array) {
  if (!array.byteLength)
    throw new TypeMismatchError("Array is not of an integer type (Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, or Uint32Array)");
  if (array.byteLength > 65536)
    throw new QuotaExceededError("Byte length of array can't be greate then 65536");
  var u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  if (rootCrypto && rootCrypto.getRandomValues) {
    rootCrypto.getRandomValues(u8);
  } else {
    for (var i = 0, n = u8.length; i < n; i++)
      u8[i] = Math.floor(256 * Math.random()) & 255;
  }
  for (var i = 0, n = u8.length; i < n; i++)
    u8[i] = u8[i] ^ randomRing.get();
  return array;
};
var gostRandom_default = GostRandom;

// gost/gostCipher.mjs
var root = {};
var rootCrypto2 = crypto_shim_default;
var CryptoOperationData = ArrayBuffer;
var SyntaxError = Error;
var DataError = Error;
var NotSupportedError = Error;
var littleEndian = (function() {
  var buffer3 = new CryptoOperationData(2);
  new DataView(buffer3).setInt16(0, 256, true);
  return new Int16Array(buffer3)[0] === 256;
})();
var defaultIV = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
var sBoxes = {
  "E-TEST": [
    4,
    2,
    15,
    5,
    9,
    1,
    0,
    8,
    14,
    3,
    11,
    12,
    13,
    7,
    10,
    6,
    12,
    9,
    15,
    14,
    8,
    1,
    3,
    10,
    2,
    7,
    4,
    13,
    6,
    0,
    11,
    5,
    13,
    8,
    14,
    12,
    7,
    3,
    9,
    10,
    1,
    5,
    2,
    4,
    6,
    15,
    0,
    11,
    14,
    9,
    11,
    2,
    5,
    15,
    7,
    1,
    0,
    13,
    12,
    6,
    10,
    4,
    3,
    8,
    3,
    14,
    5,
    9,
    6,
    8,
    0,
    13,
    10,
    11,
    7,
    12,
    2,
    1,
    15,
    4,
    8,
    15,
    6,
    11,
    1,
    9,
    12,
    5,
    13,
    3,
    7,
    10,
    0,
    14,
    2,
    4,
    9,
    11,
    12,
    0,
    3,
    6,
    7,
    5,
    4,
    8,
    14,
    15,
    1,
    10,
    2,
    13,
    12,
    6,
    5,
    2,
    11,
    0,
    9,
    13,
    3,
    14,
    7,
    10,
    15,
    4,
    1,
    8
  ],
  "E-A": [
    9,
    6,
    3,
    2,
    8,
    11,
    1,
    7,
    10,
    4,
    14,
    15,
    12,
    0,
    13,
    5,
    3,
    7,
    14,
    9,
    8,
    10,
    15,
    0,
    5,
    2,
    6,
    12,
    11,
    4,
    13,
    1,
    14,
    4,
    6,
    2,
    11,
    3,
    13,
    8,
    12,
    15,
    5,
    10,
    0,
    7,
    1,
    9,
    14,
    7,
    10,
    12,
    13,
    1,
    3,
    9,
    0,
    2,
    11,
    4,
    15,
    8,
    5,
    6,
    11,
    5,
    1,
    9,
    8,
    13,
    15,
    0,
    14,
    4,
    2,
    3,
    12,
    7,
    10,
    6,
    3,
    10,
    13,
    12,
    1,
    2,
    0,
    11,
    7,
    5,
    9,
    4,
    8,
    15,
    14,
    6,
    1,
    13,
    2,
    9,
    7,
    10,
    6,
    0,
    8,
    12,
    4,
    5,
    15,
    3,
    11,
    14,
    11,
    10,
    15,
    5,
    0,
    12,
    14,
    8,
    6,
    2,
    3,
    9,
    1,
    7,
    13,
    4
  ],
  "E-B": [
    8,
    4,
    11,
    1,
    3,
    5,
    0,
    9,
    2,
    14,
    10,
    12,
    13,
    6,
    7,
    15,
    0,
    1,
    2,
    10,
    4,
    13,
    5,
    12,
    9,
    7,
    3,
    15,
    11,
    8,
    6,
    14,
    14,
    12,
    0,
    10,
    9,
    2,
    13,
    11,
    7,
    5,
    8,
    15,
    3,
    6,
    1,
    4,
    7,
    5,
    0,
    13,
    11,
    6,
    1,
    2,
    3,
    10,
    12,
    15,
    4,
    14,
    9,
    8,
    2,
    7,
    12,
    15,
    9,
    5,
    10,
    11,
    1,
    4,
    0,
    13,
    6,
    8,
    14,
    3,
    8,
    3,
    2,
    6,
    4,
    13,
    14,
    11,
    12,
    1,
    7,
    15,
    10,
    0,
    9,
    5,
    5,
    2,
    10,
    11,
    9,
    1,
    12,
    3,
    7,
    4,
    13,
    0,
    6,
    15,
    8,
    14,
    0,
    4,
    11,
    14,
    8,
    3,
    7,
    1,
    10,
    2,
    9,
    6,
    15,
    13,
    5,
    12
  ],
  "E-C": [
    1,
    11,
    12,
    2,
    9,
    13,
    0,
    15,
    4,
    5,
    8,
    14,
    10,
    7,
    6,
    3,
    0,
    1,
    7,
    13,
    11,
    4,
    5,
    2,
    8,
    14,
    15,
    12,
    9,
    10,
    6,
    3,
    8,
    2,
    5,
    0,
    4,
    9,
    15,
    10,
    3,
    7,
    12,
    13,
    6,
    14,
    1,
    11,
    3,
    6,
    0,
    1,
    5,
    13,
    10,
    8,
    11,
    2,
    9,
    7,
    14,
    15,
    12,
    4,
    8,
    13,
    11,
    0,
    4,
    5,
    1,
    2,
    9,
    3,
    12,
    14,
    6,
    15,
    10,
    7,
    12,
    9,
    11,
    1,
    8,
    14,
    2,
    4,
    7,
    3,
    6,
    5,
    10,
    0,
    15,
    13,
    10,
    9,
    6,
    8,
    13,
    14,
    2,
    0,
    15,
    3,
    5,
    11,
    4,
    1,
    12,
    7,
    7,
    4,
    0,
    5,
    10,
    2,
    15,
    14,
    12,
    6,
    1,
    11,
    13,
    9,
    3,
    8
  ],
  "E-D": [
    15,
    12,
    2,
    10,
    6,
    4,
    5,
    0,
    7,
    9,
    14,
    13,
    1,
    11,
    8,
    3,
    11,
    6,
    3,
    4,
    12,
    15,
    14,
    2,
    7,
    13,
    8,
    0,
    5,
    10,
    9,
    1,
    1,
    12,
    11,
    0,
    15,
    14,
    6,
    5,
    10,
    13,
    4,
    8,
    9,
    3,
    7,
    2,
    1,
    5,
    14,
    12,
    10,
    7,
    0,
    13,
    6,
    2,
    11,
    4,
    9,
    3,
    15,
    8,
    0,
    12,
    8,
    9,
    13,
    2,
    10,
    11,
    7,
    3,
    6,
    5,
    4,
    14,
    15,
    1,
    8,
    0,
    15,
    3,
    2,
    5,
    14,
    11,
    1,
    10,
    4,
    7,
    12,
    9,
    13,
    6,
    3,
    0,
    6,
    15,
    1,
    14,
    9,
    2,
    13,
    8,
    12,
    4,
    11,
    10,
    5,
    7,
    1,
    10,
    6,
    8,
    15,
    11,
    0,
    4,
    12,
    3,
    5,
    9,
    7,
    13,
    2,
    14
  ],
  "E-SC": [
    3,
    6,
    1,
    0,
    5,
    7,
    13,
    9,
    4,
    11,
    8,
    12,
    14,
    15,
    2,
    10,
    7,
    1,
    5,
    2,
    8,
    11,
    9,
    12,
    13,
    0,
    3,
    10,
    15,
    14,
    4,
    6,
    15,
    1,
    4,
    6,
    12,
    8,
    9,
    2,
    14,
    3,
    7,
    10,
    11,
    13,
    5,
    0,
    3,
    4,
    15,
    12,
    5,
    9,
    14,
    0,
    6,
    8,
    7,
    10,
    1,
    11,
    13,
    2,
    6,
    9,
    0,
    7,
    11,
    8,
    4,
    12,
    2,
    14,
    10,
    15,
    1,
    13,
    5,
    3,
    6,
    1,
    2,
    15,
    0,
    11,
    9,
    12,
    7,
    13,
    10,
    5,
    8,
    4,
    14,
    3,
    0,
    2,
    14,
    12,
    9,
    1,
    4,
    7,
    3,
    15,
    6,
    8,
    10,
    13,
    11,
    5,
    5,
    2,
    11,
    8,
    4,
    12,
    7,
    1,
    10,
    6,
    14,
    0,
    9,
    3,
    13,
    15
  ],
  "E-Z": [
    // This is default S-box in according to draft of new standard
    12,
    4,
    6,
    2,
    10,
    5,
    11,
    9,
    14,
    8,
    13,
    7,
    0,
    3,
    15,
    1,
    6,
    8,
    2,
    3,
    9,
    10,
    5,
    12,
    1,
    14,
    4,
    7,
    11,
    13,
    0,
    15,
    11,
    3,
    5,
    8,
    2,
    15,
    10,
    13,
    14,
    1,
    7,
    4,
    12,
    9,
    6,
    0,
    12,
    8,
    2,
    1,
    13,
    4,
    15,
    6,
    7,
    0,
    10,
    5,
    3,
    14,
    9,
    11,
    7,
    15,
    5,
    10,
    8,
    1,
    6,
    13,
    0,
    9,
    3,
    14,
    11,
    4,
    2,
    12,
    5,
    13,
    15,
    6,
    9,
    2,
    12,
    10,
    11,
    7,
    8,
    1,
    4,
    3,
    14,
    0,
    8,
    14,
    2,
    5,
    6,
    9,
    1,
    12,
    15,
    4,
    11,
    0,
    13,
    10,
    3,
    7,
    1,
    7,
    14,
    13,
    0,
    5,
    8,
    3,
    4,
    15,
    10,
    6,
    9,
    12,
    11,
    2
  ],
  //S-box for digest
  "D-TEST": [
    4,
    10,
    9,
    2,
    13,
    8,
    0,
    14,
    6,
    11,
    1,
    12,
    7,
    15,
    5,
    3,
    14,
    11,
    4,
    12,
    6,
    13,
    15,
    10,
    2,
    3,
    8,
    1,
    0,
    7,
    5,
    9,
    5,
    8,
    1,
    13,
    10,
    3,
    4,
    2,
    14,
    15,
    12,
    7,
    6,
    0,
    9,
    11,
    7,
    13,
    10,
    1,
    0,
    8,
    9,
    15,
    14,
    4,
    6,
    12,
    11,
    2,
    5,
    3,
    6,
    12,
    7,
    1,
    5,
    15,
    13,
    8,
    4,
    10,
    9,
    14,
    0,
    3,
    11,
    2,
    4,
    11,
    10,
    0,
    7,
    2,
    1,
    13,
    3,
    6,
    8,
    5,
    9,
    12,
    15,
    14,
    13,
    11,
    4,
    1,
    3,
    15,
    5,
    9,
    0,
    10,
    14,
    7,
    6,
    8,
    2,
    12,
    1,
    15,
    13,
    0,
    5,
    7,
    10,
    4,
    9,
    2,
    3,
    14,
    6,
    11,
    8,
    12
  ],
  "D-A": [
    10,
    4,
    5,
    6,
    8,
    1,
    3,
    7,
    13,
    12,
    14,
    0,
    9,
    2,
    11,
    15,
    5,
    15,
    4,
    0,
    2,
    13,
    11,
    9,
    1,
    7,
    6,
    3,
    12,
    14,
    10,
    8,
    7,
    15,
    12,
    14,
    9,
    4,
    1,
    0,
    3,
    11,
    5,
    2,
    6,
    10,
    8,
    13,
    4,
    10,
    7,
    12,
    0,
    15,
    2,
    8,
    14,
    1,
    6,
    5,
    13,
    11,
    9,
    3,
    7,
    6,
    4,
    11,
    9,
    12,
    2,
    10,
    1,
    8,
    0,
    14,
    15,
    13,
    3,
    5,
    7,
    6,
    2,
    4,
    13,
    9,
    15,
    0,
    10,
    1,
    5,
    11,
    8,
    14,
    12,
    3,
    13,
    14,
    4,
    1,
    7,
    0,
    5,
    10,
    3,
    12,
    8,
    15,
    6,
    2,
    9,
    11,
    1,
    3,
    10,
    9,
    5,
    11,
    4,
    15,
    8,
    6,
    7,
    14,
    13,
    0,
    2,
    12
  ],
  "D-SC": [
    11,
    13,
    7,
    0,
    5,
    4,
    1,
    15,
    9,
    14,
    6,
    10,
    3,
    12,
    8,
    2,
    1,
    2,
    7,
    9,
    13,
    11,
    15,
    8,
    14,
    12,
    4,
    0,
    5,
    6,
    10,
    3,
    5,
    1,
    13,
    3,
    15,
    6,
    12,
    7,
    9,
    8,
    11,
    2,
    4,
    14,
    0,
    10,
    13,
    1,
    11,
    4,
    9,
    12,
    14,
    0,
    7,
    5,
    8,
    15,
    6,
    2,
    10,
    3,
    2,
    13,
    10,
    15,
    9,
    11,
    3,
    7,
    8,
    12,
    5,
    14,
    6,
    0,
    1,
    4,
    0,
    4,
    6,
    12,
    5,
    3,
    8,
    13,
    10,
    11,
    15,
    2,
    1,
    9,
    7,
    14,
    1,
    3,
    12,
    8,
    10,
    6,
    11,
    0,
    2,
    14,
    7,
    9,
    15,
    4,
    5,
    13,
    10,
    11,
    6,
    0,
    1,
    3,
    4,
    7,
    14,
    13,
    5,
    15,
    8,
    2,
    9,
    12
  ]
};
var C2 = new Uint8Array([
  105,
  0,
  114,
  34,
  100,
  201,
  4,
  35,
  141,
  58,
  219,
  150,
  70,
  233,
  42,
  196,
  24,
  254,
  172,
  148,
  0,
  237,
  7,
  18,
  192,
  134,
  220,
  194,
  239,
  76,
  169,
  43
]);
function signed(x) {
  return x >= 2147483648 ? x - 4294967296 : x;
}
function unsigned(x) {
  return x < 0 ? x + 4294967296 : x;
}
function randomSeed(e) {
  var randomSource = gostRandom_default ? new (gostRandom_default || root.GostRandom)() : rootCrypto2;
  if (randomSource.getRandomValues)
    randomSource.getRandomValues(e);
  else
    throw new NotSupportedError("Random generator not found");
}
function buffer(d) {
  if (d instanceof CryptoOperationData)
    return d;
  else if (d && d?.buffer instanceof CryptoOperationData)
    return d.byteOffset === 0 && d.byteLength === d.buffer.byteLength ? d.buffer : new Uint8Array(new Uint8Array(d, d.byteOffset, d.byteLength)).buffer;
  else
    throw new DataError("CryptoOperationData required");
}
function byteArray(d) {
  return new Uint8Array(buffer(d));
}
function cloneArray(d) {
  return new Uint8Array(byteArray(d));
}
function intArray(d) {
  return new Int32Array(buffer(d));
}
function swap32(b) {
  return (b & 255) << 24 | (b & 65280) << 8 | b >> 8 & 65280 | b >> 24 & 255;
}
var defaultIV128 = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
var multTable = (function() {
  function gmul(a, b) {
    var p = 0, counter, carry;
    for (counter = 0; counter < 8; counter++) {
      if (b & 1)
        p ^= a;
      carry = a & 128;
      a = a << 1 & 255;
      if (carry)
        a ^= 195;
      b >>= 1;
    }
    return p & 255;
  }
  var x = [1, 16, 32, 133, 148, 192, 194, 251];
  var m = [];
  for (var i = 0; i < 8; i++) {
    m[i] = [];
    for (var j = 0; j < 256; j++)
      m[i][j] = gmul(x[i], j);
  }
  return m;
})();
var kB = [4, 2, 3, 1, 6, 5, 0, 7, 0, 5, 6, 1, 3, 2, 4, 0];
function funcR(d) {
  var sum = 0;
  for (var i = 0; i < 16; i++)
    sum ^= multTable[kB[i]][d[i]];
  for (var i = 16; i > 0; --i)
    d[i] = d[i - 1];
  d[0] = sum;
}
function funcReverseR(d) {
  var tmp = d[0];
  for (var i = 0; i < 15; i++)
    d[i] = d[i + 1];
  d[15] = tmp;
  var sum = 0;
  for (i = 0; i < 16; i++)
    sum ^= multTable[kB[i]][d[i]];
  d[15] = sum;
}
var kPi = [
  252,
  238,
  221,
  17,
  207,
  110,
  49,
  22,
  251,
  196,
  250,
  218,
  35,
  197,
  4,
  77,
  233,
  119,
  240,
  219,
  147,
  46,
  153,
  186,
  23,
  54,
  241,
  187,
  20,
  205,
  95,
  193,
  249,
  24,
  101,
  90,
  226,
  92,
  239,
  33,
  129,
  28,
  60,
  66,
  139,
  1,
  142,
  79,
  5,
  132,
  2,
  174,
  227,
  106,
  143,
  160,
  6,
  11,
  237,
  152,
  127,
  212,
  211,
  31,
  235,
  52,
  44,
  81,
  234,
  200,
  72,
  171,
  242,
  42,
  104,
  162,
  253,
  58,
  206,
  204,
  181,
  112,
  14,
  86,
  8,
  12,
  118,
  18,
  191,
  114,
  19,
  71,
  156,
  183,
  93,
  135,
  21,
  161,
  150,
  41,
  16,
  123,
  154,
  199,
  243,
  145,
  120,
  111,
  157,
  158,
  178,
  177,
  50,
  117,
  25,
  61,
  255,
  53,
  138,
  126,
  109,
  84,
  198,
  128,
  195,
  189,
  13,
  87,
  223,
  245,
  36,
  169,
  62,
  168,
  67,
  201,
  215,
  121,
  214,
  246,
  124,
  34,
  185,
  3,
  224,
  15,
  236,
  222,
  122,
  148,
  176,
  188,
  220,
  232,
  40,
  80,
  78,
  51,
  10,
  74,
  167,
  151,
  96,
  115,
  30,
  0,
  98,
  68,
  26,
  184,
  56,
  130,
  100,
  159,
  38,
  65,
  173,
  69,
  70,
  146,
  39,
  94,
  85,
  47,
  140,
  163,
  165,
  125,
  105,
  213,
  149,
  59,
  7,
  88,
  179,
  64,
  134,
  172,
  29,
  247,
  48,
  55,
  107,
  228,
  136,
  217,
  231,
  137,
  225,
  27,
  131,
  73,
  76,
  63,
  248,
  254,
  141,
  83,
  170,
  144,
  202,
  216,
  133,
  97,
  32,
  113,
  103,
  164,
  45,
  43,
  9,
  91,
  203,
  155,
  37,
  208,
  190,
  229,
  108,
  82,
  89,
  166,
  116,
  210,
  230,
  244,
  180,
  192,
  209,
  102,
  175,
  194,
  57,
  75,
  99,
  182
];
var kReversePi = (function() {
  var m = [];
  for (var i = 0, n = kPi.length; i < n; i++)
    m[kPi[i]] = i;
  return m;
})();
function funcS(d) {
  for (var i = 0; i < 16; ++i)
    d[i] = kPi[d[i]];
}
function funcReverseS(d) {
  for (var i = 0; i < 16; ++i)
    d[i] = kReversePi[d[i]];
}
function funcX(a, b) {
  for (var i = 0; i < 16; ++i)
    a[i] ^= b[i];
}
function funcL(d) {
  for (var i = 0; i < 16; ++i)
    funcR(d);
}
function funcReverseL(d) {
  for (var i = 0; i < 16; ++i)
    funcReverseR(d);
}
function funcLSX(a, b) {
  funcX(a, b);
  funcS(a);
  funcL(a);
}
function funcReverseLSX(a, b) {
  funcX(a, b);
  funcReverseL(a);
  funcReverseS(a);
}
function funcF(inputKey, inputKeySecond, iterationConst) {
  var tmp = new Uint8Array(inputKey);
  funcLSX(inputKey, iterationConst);
  funcX(inputKey, inputKeySecond);
  inputKeySecond.set(tmp);
}
function funcC(number, d) {
  for (var i = 0; i < 15; i++)
    d[i] = 0;
  d[15] = number;
  funcL(d);
}
function keySchedule128(k) {
  var keys = new Uint8Array(160), c = new Uint8Array(16);
  keys.set(byteArray(k));
  for (var j = 0; j < 4; j++) {
    var j0 = 32 * j, j1 = 32 * (j + 1);
    keys.set(new Uint8Array(keys.buffer, j0, 32), j1);
    for (var i = 1; i < 9; i++) {
      funcC(j * 8 + i, c);
      funcF(
        new Uint8Array(keys.buffer, j1, 16),
        new Uint8Array(keys.buffer, j1 + 16, 16),
        c
      );
    }
  }
  return keys;
}
function process128(k, d, ofs, e) {
  ofs = ofs || d.byteOffset;
  var r = new Uint8Array(d.buffer, ofs, 16);
  if (e) {
    for (var i = 0; i < 9; i++)
      funcReverseLSX(r, new Uint8Array(k.buffer, (9 - i) * 16, 16));
    funcX(r, new Uint8Array(k.buffer, 0, 16));
  } else {
    for (var i = 0; i < 9; i++)
      funcLSX(r, new Uint8Array(k.buffer, 16 * i, 16));
    funcX(r, new Uint8Array(k.buffer, 16 * 9, 16));
  }
}
function round(S3, m, k) {
  var cm = m[0] + k & 4294967295;
  var om = S3[0 + (cm >> 0 * 4 & 15)] << 0 * 4;
  om |= S3[16 + (cm >> 1 * 4 & 15)] << 1 * 4;
  om |= S3[32 + (cm >> 2 * 4 & 15)] << 2 * 4;
  om |= S3[48 + (cm >> 3 * 4 & 15)] << 3 * 4;
  om |= S3[64 + (cm >> 4 * 4 & 15)] << 4 * 4;
  om |= S3[80 + (cm >> 5 * 4 & 15)] << 5 * 4;
  om |= S3[96 + (cm >> 6 * 4 & 15)] << 6 * 4;
  om |= S3[112 + (cm >> 7 * 4 & 15)] << 7 * 4;
  cm = om << 11 | om >>> 32 - 11;
  cm ^= m[1];
  m[1] = m[0];
  m[0] = cm;
}
function process89(k, d, ofs) {
  ofs = ofs || d.byteOffset;
  var s = this.sBox, m = new Int32Array(d.buffer, ofs, 2);
  for (var i = 0; i < 32; i++)
    round(s, m, k[i]);
  var r = m[0];
  m[0] = m[1];
  m[1] = r;
}
function process15(k, d, ofs) {
  ofs = ofs || d.byteOffset;
  var s = this.sBox, m = new Int32Array(d.buffer, ofs, 2), r = swap32(m[0]);
  m[0] = swap32(m[1]);
  m[1] = r;
  for (var i = 0; i < 32; i++)
    round(s, m, k[i]);
  m[0] = swap32(m[0]);
  m[1] = swap32(m[1]);
}
function keySchedule89(k, e) {
  var sch = new Int32Array(32), key = new Int32Array(buffer(k));
  for (var i = 0; i < 8; i++)
    sch[i] = key[i];
  if (e) {
    for (var i = 0; i < 8; i++)
      sch[i + 8] = sch[7 - i];
    for (var i = 0; i < 8; i++)
      sch[i + 16] = sch[7 - i];
  } else {
    for (var i = 0; i < 8; i++)
      sch[i + 8] = sch[i];
    for (var i = 0; i < 8; i++)
      sch[i + 16] = sch[i];
  }
  for (var i = 0; i < 8; i++)
    sch[i + 24] = sch[7 - i];
  return sch;
}
function keySchedule15(k, e) {
  var sch = new Int32Array(32), key = new Int32Array(buffer(k));
  for (var i = 0; i < 8; i++)
    sch[i] = swap32(key[i]);
  if (e) {
    for (var i = 0; i < 8; i++)
      sch[i + 8] = sch[7 - i];
    for (var i = 0; i < 8; i++)
      sch[i + 16] = sch[7 - i];
  } else {
    for (var i = 0; i < 8; i++)
      sch[i + 8] = sch[i];
    for (var i = 0; i < 8; i++)
      sch[i + 16] = sch[i];
  }
  for (var i = 0; i < 8; i++)
    sch[i + 24] = sch[7 - i];
  return sch;
}
var keyScheduleRC2 = (function() {
  var PITABLE = new Uint8Array([
    217,
    120,
    249,
    196,
    25,
    221,
    181,
    237,
    40,
    233,
    253,
    121,
    74,
    160,
    216,
    157,
    198,
    126,
    55,
    131,
    43,
    118,
    83,
    142,
    98,
    76,
    100,
    136,
    68,
    139,
    251,
    162,
    23,
    154,
    89,
    245,
    135,
    179,
    79,
    19,
    97,
    69,
    109,
    141,
    9,
    129,
    125,
    50,
    189,
    143,
    64,
    235,
    134,
    183,
    123,
    11,
    240,
    149,
    33,
    34,
    92,
    107,
    78,
    130,
    84,
    214,
    101,
    147,
    206,
    96,
    178,
    28,
    115,
    86,
    192,
    20,
    167,
    140,
    241,
    220,
    18,
    117,
    202,
    31,
    59,
    190,
    228,
    209,
    66,
    61,
    212,
    48,
    163,
    60,
    182,
    38,
    111,
    191,
    14,
    218,
    70,
    105,
    7,
    87,
    39,
    242,
    29,
    155,
    188,
    148,
    67,
    3,
    248,
    17,
    199,
    246,
    144,
    239,
    62,
    231,
    6,
    195,
    213,
    47,
    200,
    102,
    30,
    215,
    8,
    232,
    234,
    222,
    128,
    82,
    238,
    247,
    132,
    170,
    114,
    172,
    53,
    77,
    106,
    42,
    150,
    26,
    210,
    113,
    90,
    21,
    73,
    116,
    75,
    159,
    208,
    94,
    4,
    24,
    164,
    236,
    194,
    224,
    65,
    110,
    15,
    81,
    203,
    204,
    36,
    145,
    175,
    80,
    161,
    244,
    112,
    57,
    153,
    124,
    58,
    133,
    35,
    184,
    180,
    122,
    252,
    2,
    54,
    91,
    37,
    85,
    151,
    49,
    45,
    93,
    250,
    152,
    227,
    138,
    146,
    174,
    5,
    223,
    41,
    16,
    103,
    108,
    186,
    201,
    211,
    0,
    230,
    207,
    225,
    158,
    168,
    44,
    99,
    22,
    1,
    63,
    88,
    226,
    137,
    169,
    13,
    56,
    52,
    27,
    171,
    51,
    255,
    176,
    187,
    72,
    12,
    95,
    185,
    177,
    205,
    46,
    197,
    243,
    219,
    71,
    229,
    165,
    156,
    119,
    10,
    166,
    32,
    104,
    254,
    127,
    193,
    173
  ]);
  return function(k) {
    var key = new Uint8Array(buffer(k)), T2 = Math.min(key.length, 128), T1 = this.effectiveLength, T8 = Math.floor((T1 + 7) / 8), TM = 255 % Math.pow(2, 8 + T1 - 8 * T8);
    var L = new Uint8Array(128), K6 = new Uint16Array(L.buffer);
    for (var i = 0; i < T2; i++)
      L[i] = key[i];
    for (var i = T2; i < 128; i++)
      L[i] = PITABLE[(L[i - 1] + L[i - T2]) % 256];
    L[128 - T8] = PITABLE[L[128 - T8] & TM];
    for (var i = 127 - T8; i >= 0; --i)
      L[i] = PITABLE[L[i + 1] ^ L[i + T8]];
    return K6;
  };
})();
var processRC2 = (function() {
  var K6, j, R = new Uint16Array(4), s = new Uint16Array([1, 2, 3, 5]), reverse;
  function rol(R2, s2) {
    return (R2 << s2 | R2 >>> 16 - s2) & 65535;
  }
  function ror(R2, s2) {
    return (R2 >>> s2 | R2 << 16 - s2) & 65535;
  }
  function mix(i) {
    if (reverse) {
      R[i] = ror(R[i], s[i]);
      R[i] = R[i] - K6[j] - (R[(i + 3) % 4] & R[(i + 2) % 4]) - (~R[(i + 3) % 4] & R[(i + 1) % 4]);
      j = j - 1;
    } else {
      R[i] = R[i] + K6[j] + (R[(i + 3) % 4] & R[(i + 2) % 4]) + (~R[(i + 3) % 4] & R[(i + 1) % 4]);
      j = j + 1;
      R[i] = rol(R[i], s[i]);
    }
  }
  function mash(i) {
    if (reverse) {
      R[i] = R[i] - K6[R[(i + 3) % 4] & 63];
    } else {
      R[i] = R[i] + K6[R[(i + 3) % 4] & 63];
    }
  }
  function perform(method, count) {
    count = count || 1;
    for (var j2 = 0; j2 < count; j2++) {
      if (reverse) {
        for (var i = 3; i >= 0; --i)
          method(i);
      } else {
        for (var i = 0; i < 4; i++)
          method(i);
      }
    }
  }
  return function(k, d, ofs, e) {
    reverse = e;
    R = new Uint16Array(d.buffer, ofs || d.byteOffset, 4);
    K6 = k;
    j = e ? 63 : 0;
    perform(mix, 5);
    perform(mash);
    perform(mix, 6);
    perform(mash);
    perform(mix, 5);
  };
})();
function encryptECB(k, d) {
  var p = this.pad(byteArray(d)), n = this.blockSize, b = p.byteLength / n, key = this.keySchedule(k);
  for (var i = 0; i < b; i++)
    this.process(key, p, n * i);
  return p.buffer;
}
function decryptECB(k, d) {
  var p = cloneArray(d), n = this.blockSize, b = p.byteLength / n, key = this.keySchedule(k, 1);
  for (var i = 0; i < b; i++)
    this.process(key, p, n * i, 1);
  return this.unpad(p).buffer;
}
function encryptCFB(k, d, iv) {
  var s = new Uint8Array(iv || this.iv), c = cloneArray(d), m = s.length, t = new Uint8Array(m), b = this.shiftBits >> 3, cb = c.length, r = cb % b, q = (cb - r) / b, key = this.keySchedule(k);
  for (var i = 0; i < q; i++) {
    for (var j = 0; j < m; j++)
      t[j] = s[j];
    this.process(key, s);
    for (var j = 0; j < b; j++)
      c[i * b + j] ^= s[j];
    for (var j = 0; j < m - b; j++)
      s[j] = t[b + j];
    for (var j = 0; j < b; j++)
      s[m - b + j] = c[i * b + j];
    k = this.keyMeshing(k, s, i, key);
  }
  if (r > 0) {
    this.process(key, s);
    for (var i = 0; i < r; i++)
      c[q * b + i] ^= s[i];
  }
  return c.buffer;
}
function decryptCFB(k, d, iv) {
  var s = new Uint8Array(iv || this.iv), c = cloneArray(d), m = s.length, t = new Uint8Array(m), b = this.shiftBits >> 3, cb = c.length, r = cb % b, q = (cb - r) / b, key = this.keySchedule(k);
  for (var i = 0; i < q; i++) {
    for (var j = 0; j < m; j++)
      t[j] = s[j];
    this.process(key, s);
    for (var j = 0; j < b; j++) {
      t[j] = c[i * b + j];
      c[i * b + j] ^= s[j];
    }
    for (var j = 0; j < m - b; j++)
      s[j] = t[b + j];
    for (var j = 0; j < b; j++)
      s[m - b + j] = t[j];
    k = this.keyMeshing(k, s, i, key);
  }
  if (r > 0) {
    this.process(key, s);
    for (var i = 0; i < r; i++)
      c[q * b + i] ^= s[i];
  }
  return c.buffer;
}
function processOFB(k, d, iv) {
  var s = new Uint8Array(iv || this.iv), c = cloneArray(d), m = s.length, t = new Uint8Array(m), b = this.shiftBits >> 3, p = new Uint8Array(b), cb = c.length, r = cb % b, q = (cb - r) / b, key = this.keySchedule(k);
  for (var i = 0; i < q; i++) {
    for (var j = 0; j < m; j++)
      t[j] = s[j];
    this.process(key, s);
    for (var j = 0; j < b; j++)
      p[j] = s[j];
    for (var j = 0; j < b; j++)
      c[i * b + j] ^= s[j];
    for (var j = 0; j < m - b; j++)
      s[j] = t[b + j];
    for (var j = 0; j < b; j++)
      s[m - b + j] = p[j];
    k = this.keyMeshing(k, s, i, key);
  }
  if (r > 0) {
    this.process(key, s);
    for (var i = 0; i < r; i++)
      c[q * b + i] ^= s[i];
  }
  return c.buffer;
}
function processCTR89(k, d, iv) {
  var s = new Uint8Array(iv || this.iv), c = cloneArray(d), b = this.blockSize, t = new Int8Array(b), cb = c.length, r = cb % b, q = (cb - r) / b, key = this.keySchedule(k), syn = new Int32Array(s.buffer);
  this.process(key, s);
  for (var i = 0; i < q; i++) {
    syn[0] = syn[0] + 16843009 & 4294967295;
    var tmp = unsigned(syn[1]) + 16843012;
    syn[1] = signed(tmp < 4294967296 ? tmp : tmp - 4294967295);
    for (var j = 0; j < b; j++)
      t[j] = s[j];
    this.process(key, syn);
    for (var j = 0; j < b; j++)
      c[i * b + j] ^= s[j];
    for (var j = 0; j < b; j++)
      s[j] = t[j];
    k = this.keyMeshing(k, s, i, key);
  }
  if (r > 0) {
    syn[0] = syn[0] + 16843009 & 4294967295;
    var tmp = unsigned(syn[1]) + 16843012;
    syn[1] = signed(tmp < 4294967296 ? tmp : tmp - 4294967295);
    this.process(key, syn);
    for (var i = 0; i < r; i++)
      c[q * b + i] ^= s[i];
  }
  return c.buffer;
}
function processCTR15(k, d, iv) {
  var c = cloneArray(d), n = this.blockSize, b = this.shiftBits >> 3, cb = c.length, r = cb % b, q = (cb - r) / b, s = new Uint8Array(n), t = new Int32Array(n), key = this.keySchedule(k);
  s.set(iv || this.iv);
  for (var i = 0; i < q; i++) {
    for (var j = 0; j < n; j++)
      t[j] = s[j];
    this.process(key, s);
    for (var j = 0; j < b; j++)
      c[b * i + j] ^= s[j];
    for (var j = 0; j < n; j++)
      s[j] = t[j];
    for (var j = n - 1; i >= 0; --i) {
      if (s[j] > 254) {
        s[j] -= 254;
      } else {
        s[j]++;
        break;
      }
    }
  }
  if (r > 0) {
    this.process(key, s);
    for (var j = 0; j < r; j++)
      c[b * q + j] ^= s[j];
  }
  return c.buffer;
}
function encryptCBC(k, d, iv) {
  var s = new Uint8Array(iv || this.iv), n = this.blockSize, m = s.length, c = this.pad(byteArray(d)), key = this.keySchedule(k);
  for (var i = 0, b = c.length / n; i < b; i++) {
    for (var j = 0; j < n; j++)
      s[j] ^= c[i * n + j];
    this.process(key, s);
    for (var j = 0; j < n; j++)
      c[i * n + j] = s[j];
    if (m !== n) {
      for (var j = 0; j < m - n; j++)
        s[j] = s[n + j];
      for (var j = 0; j < n; j++)
        s[j + m - n] = c[i * n + j];
    }
    k = this.keyMeshing(k, s, i, key);
  }
  return c.buffer;
}
function decryptCBC(k, d, iv) {
  var s = new Uint8Array(iv || this.iv), n = this.blockSize, m = s.length, c = cloneArray(d), next = new Uint8Array(n), key = this.keySchedule(k, 1);
  for (var i = 0, b = c.length / n; i < b; i++) {
    for (var j = 0; j < n; j++)
      next[j] = c[i * n + j];
    this.process(key, c, i * n, 1);
    for (var j = 0; j < n; j++)
      c[i * n + j] ^= s[j];
    if (m !== n) {
      for (var j = 0; j < m - n; j++)
        s[j] = s[n + j];
    }
    for (var j = 0; j < n; j++)
      s[j + m - n] = next[j];
    k = this.keyMeshing(k, s, i, key, 1);
  }
  return this.unpad(c).buffer;
}
function generateKey() {
  var k = new Uint8Array(this.keySize);
  randomSeed(k);
  return k.buffer;
}
function processMAC89(key, s, d) {
  var c = zeroPad.call(this, byteArray(d)), n = this.blockSize, q = c.length / n, sBox = this.sBox, sum = new Int32Array(s.buffer);
  for (var i = 0; i < q; i++) {
    for (var j = 0; j < n; j++)
      s[j] ^= c[i * n + j];
    for (var j = 0; j < 16; j++)
      round(sBox, sum, key[j]);
  }
}
function processKeyMAC15(s) {
  var t = 0, n = s.length;
  for (var i = n - 1; i >= 0; --i) {
    var t1 = s[i] >>> 7;
    s[i] = s[i] << 1 & 255 | t;
    t = t1;
  }
  if (t !== 0) {
    if (n === 16)
      s[15] ^= 135;
    else
      s[7] ^= 27;
  }
}
function processMAC15(key, s, d) {
  var n = this.blockSize, sBox = this.sBox, c = byteArray(d), r = new Uint8Array(n);
  this.process(key, r);
  processKeyMAC15(r);
  if (d.byteLength % n !== 0) {
    c = bitPad.call(this, byteArray(d));
    processKeyMAC15(r);
  }
  for (var i = 0, q = c.length / n; i < q; i++) {
    for (var j = 0; j < n; j++)
      s[j] ^= c[i * n + j];
    if (i === q - 1) {
      for (var j = 0; j < n; j++)
        s[j] ^= r[j];
    }
    this.process(key, s);
  }
}
function signMAC(k, d, iv) {
  var key = this.keySchedule(k), s = new Uint8Array(iv || this.iv), m = Math.ceil(this.macLength >> 3) || this.blockSize >> 1;
  this.processMAC(key, s, d);
  var mac = new Uint8Array(m);
  mac.set(new Uint8Array(s.buffer, 0, m));
  return mac.buffer;
}
function verifyMAC(k, m, d, iv) {
  var mac = new Uint8Array(signMAC.call(this, k, d, iv)), test = byteArray(m);
  if (mac.length !== test.length)
    return false;
  for (var i = 0, n = mac.length; i < n; i++)
    if (mac[i] !== test[i])
      return false;
  return true;
}
function wrapKeyGOST(kek, cek) {
  var n = this.blockSize, k = this.keySize, len = k + (n >> 1);
  if (!this.ukm)
    throw new DataError("UKM must be defined");
  var ukm = new Uint8Array(this.ukm);
  var mac = signMAC.call(this, kek, cek, ukm);
  var enc = encryptECB.call(this, kek, cek);
  var r = new Uint8Array(len);
  r.set(new Uint8Array(enc), 0);
  r.set(new Uint8Array(mac), k);
  return r.buffer;
}
function unwrapKeyGOST(kek, data) {
  var n = this.blockSize, k = this.keySize, len = k + (n >> 1);
  var d = buffer(data);
  if (d.byteLength !== len)
    throw new DataError("Wrapping key size must be " + len + " bytes");
  if (!this.ukm)
    throw new DataError("UKM must be defined");
  var ukm = new Uint8Array(this.ukm), enc = new Uint8Array(d, 0, k), mac = new Uint8Array(d, k, n >> 1);
  var cek = decryptECB.call(this, kek, enc);
  var check = verifyMAC.call(this, kek, mac, cek, ukm);
  if (!check)
    throw new DataError("Error verify MAC of wrapping key");
  return cek;
}
function diversifyKEK(kek, ukm) {
  var n = this.blockSize;
  var k = intArray(kek);
  var a = [];
  for (var i = 0; i < n; i++) {
    a[i] = [];
    for (var j = 0; j < 8; j++) {
      a[i][j] = ukm[i] >>> j & 1;
    }
  }
  for (var i = 0; i < n; i++) {
    var s = new Int32Array(2);
    for (var j = 0; j < 8; j++) {
      if (a[i][j])
        s[0] = s[0] + k[j] & 4294967295;
      else
        s[1] = s[1] + k[j] & 4294967295;
    }
    var iv = new Uint8Array(s.buffer);
    k = new Int32Array(encryptCFB.call(this, k, k, iv));
  }
  return k;
}
function wrapKeyCP(kek, cek) {
  var n = this.blockSize, k = this.keySize, len = k + (n >> 1);
  if (!this.ukm)
    throw new DataError("UKM must be defined");
  var ukm = new Uint8Array(this.ukm);
  var dek = diversifyKEK.call(this, kek, ukm);
  var mac = signMAC.call(this, dek, cek, ukm);
  var enc = encryptECB.call(this, dek, cek);
  var r = new Uint8Array(len);
  r.set(new Uint8Array(enc), 0);
  r.set(new Uint8Array(mac), k);
  return r.buffer;
}
function unwrapKeyCP(kek, data) {
  var n = this.blockSize, k = this.keySize, len = k + (n >> 1);
  var d = buffer(data);
  if (d.byteLength !== len)
    throw new DataError("Wrapping key size must be " + len + " bytes");
  if (!this.ukm)
    throw new DataError("UKM must be defined");
  var ukm = new Uint8Array(this.ukm), enc = new Uint8Array(d, 0, k), mac = new Uint8Array(d, k, n >> 1);
  var dek = diversifyKEK.call(this, kek, ukm);
  var cek = decryptECB.call(this, dek, enc);
  var check = verifyMAC.call(this, dek, mac, cek, ukm);
  if (!check)
    throw new DataError("Error verify MAC of wrapping key");
  return cek;
}
function packKeySC(unpacked, ukm) {
  var m = this.blockSize >> 1, k = this.keySize;
  var mcount = 8;
  var key = new Uint8Array(buffer(unpacked));
  if (key.byteLength !== k)
    throw new DataError("Wrong cleartext size " + key.byteLength + " bytes");
  ukm = ukm || this.ukm;
  if (ukm) {
    ukm = new Uint8Array(buffer(ukm));
    if (ukm.byteLength > 0 && ukm.byteLength % k === 0)
      mcount = ukm.byteLength / k + 1;
    else
      throw new DataError("Wrong rand size " + ukm.byteLength + " bytes");
  } else
    randomSeed(ukm = new Uint8Array((mcount - 1) * k));
  var d = new Uint8Array(mcount * k + m + 2), b = d.buffer;
  var zero32 = new Uint8Array(k);
  var mac = signMAC.call(this, key, zero32);
  d[0] = 34;
  d[1] = mcount;
  d.set(new Uint8Array(mac), 2);
  d.set(ukm, k + m + 2);
  for (var i = 1; i < mcount; i++) {
    var mask = new Uint8Array(b, 2 + m + k * i);
    for (var j = 0; j < k; j++)
      key[j] ^= mask[j];
  }
  d.set(key, m + 2);
  return d.buffer;
}
function unpackKeySC(packed) {
  var m = this.blockSize >> 1, k = this.keySize;
  var b = buffer(packed);
  var magic = new Uint8Array(b, 0, 1)[0];
  if (magic !== 34)
    throw new DataError("Invalid magic number");
  var mcount = new Uint8Array(b, 1, 1)[0];
  var mac = new Uint8Array(b, 2, m);
  var key = new Uint8Array(k);
  for (var i = 0; i < mcount; i++) {
    var mask = new Uint8Array(b, 2 + m + k * i, k);
    for (var j = 0; j < k; j++)
      key[j] ^= mask[j];
  }
  var zero32 = new Uint8Array(k);
  var test = verifyMAC.call(this, key, mac, zero32);
  if (!test) {
    var names = ["E-A", "E-B", "E-C", "E-D", "E-SC"];
    for (var i = 0, n = names.length; i < n; i++) {
      this.sBox = sBoxes[names[i]];
      test = verifyMAC.call(this, key, mac, zero32);
      if (test)
        break;
    }
  }
  if (!test)
    throw new DataError("Invalid main key MAC");
  return key.buffer;
}
function wrapKeySC(kek, cek) {
  var m = this.blockSize >> 1, n = this.keySize;
  var k = buffer(kek);
  var c = buffer(cek);
  if (k.byteLength !== n)
    k = unpackKeySC.call(this, k);
  var enc = encryptECB.call(this, k, c);
  var mac = signMAC.call(this, k, c);
  var d = new Uint8Array(m + n);
  d.set(new Uint8Array(enc), 0);
  d.set(new Uint8Array(mac), n);
  return d.buffer;
}
function unwrapKeySC(kek, cek) {
  var m = this.blockSize >> 1, n = this.keySize;
  var k = buffer(kek);
  var c = buffer(cek);
  if (k.byteLength !== n)
    k = unpackKeySC.call(this, k);
  var enc = new Uint8Array(c, 0, n);
  var mac = new Uint8Array(c, n, m);
  var d = decryptECB.call(this, k, enc);
  if (!verifyMAC.call(this, k, mac, d))
    throw new DataError("Invalid key MAC");
  return d;
}
function generateWrappingKeySC() {
  return packKeySC.call(this, generateKey.call(this));
}
function maskKey(mask, key, inverse, keySize) {
  var k = keySize / 4, m32 = new Int32Array(buffer(mask)), k32 = new Int32Array(buffer(key)), r32 = new Int32Array(k);
  if (inverse)
    for (var i = 0; i < k; i++)
      r32[i] = k32[i] + m32[i] & 4294967295;
  else
    for (var i = 0; i < k; i++)
      r32[i] = k32[i] - m32[i] & 4294967295;
  return r32.buffer;
}
function wrapKeyMask(mask, key) {
  return maskKey(mask, key, this.procreator === "VN", this.keySize);
}
function unwrapKeyMask(mask, key) {
  return maskKey(mask, key, this.procreator !== "VN", this.keySize);
}
function keyMeshingCP(k, s, i, key, e) {
  if ((i + 1) * this.blockSize % 1024 === 0) {
    k = decryptECB.call(this, k, C2);
    s.set(new Uint8Array(encryptECB.call(this, k, s)));
    key.set(this.keySchedule(k, e));
  }
  return k;
}
function noKeyMeshing(k) {
  return k;
}
function noPad(d) {
  return new Uint8Array(d);
}
function pkcs5Pad(d) {
  var n = d.byteLength, nb = this.blockSize, q = nb - n % nb, m = Math.ceil((n + 1) / nb) * nb, r = new Uint8Array(m);
  r.set(d);
  for (var i = n; i < m; i++)
    r[i] = q;
  return r;
}
function pkcs5Unpad(d) {
  var m = d.byteLength, nb = this.blockSize, q = d[m - 1], n = m - q;
  if (q > nb)
    throw DataError("Invalid padding");
  var r = new Uint8Array(n);
  if (n > 0)
    r.set(new Uint8Array(d.buffer, 0, n));
  return r;
}
function zeroPad(d) {
  var n = d.byteLength, nb = this.blockSize, m = Math.ceil(n / nb) * nb, r = new Uint8Array(m);
  r.set(d);
  for (var i = n; i < m; i++)
    r[i] = 0;
  return r;
}
function bitPad(d) {
  var n = d.byteLength, nb = this.blockSize, m = Math.ceil((n + 1) / nb) * nb, r = new Uint8Array(m);
  r.set(d);
  r[n] = 1;
  for (var i = n + 1; i < m; i++)
    r[i] = 0;
  return r;
}
function bitUnpad(d) {
  var m = d.byteLength, n = m;
  while (n > 1 && d[n - 1] === 0)
    n--;
  if (d[n - 1] !== 1)
    throw DataError("Invalid padding");
  n--;
  var r = new Uint8Array(n);
  if (n > 0)
    r.set(new Uint8Array(d.buffer, 0, n));
  return r;
}
function randomPad(d) {
  var n = d.byteLength, nb = this.blockSize, q = nb - n % nb, m = Math.ceil(n / nb) * nb, r = new Uint8Array(m), e = new Uint8Array(r.buffer, n, q);
  r.set(d);
  randomSeed(e);
  return r;
}
function GostCipher(algorithm) {
  if (!littleEndian)
    throw new NotSupportedError("Big endian platform not supported");
  algorithm = algorithm || {};
  this.keySize = 32;
  this.blockLength = algorithm.length || 64;
  this.blockSize = this.blockLength >> 3;
  this.name = (algorithm.name || (algorithm.version === 1 ? "RC2" : algorithm.version === 1989 ? "GOST 28147" : "GOST R 34.12")) + (algorithm.version > 4 ? "-" + (algorithm.version || 1989) % 100 : "") + "-" + (this.blockLength === 64 ? "" : this.blockLength + "-") + (algorithm.mode === "MAC" ? "MAC-" + (algorithm.macLength || this.blockLength >> 1) : algorithm.mode === "KW" || algorithm.keyWrapping ? ((algorithm.keyWrapping || "NO") !== "NO" ? algorithm.keyWrapping : "") + "KW" : (algorithm.block || "ECB") + ((algorithm.block === "CFB" || algorithm.block === "OFB" || algorithm.block === "CTR" && algorithm.version === 2015) && algorithm?.shiftBits !== this.blockLength ? "-" + algorithm.shiftBits : "") + (algorithm.padding ? "-" + (algorithm.padding || (algorithm.block === "CTR" || algorithm.block === "CFB" || algorithm.block === "OFB" ? "NO" : "ZERO")) + "PADDING" : "") + ((algorithm.keyMeshing || "NO") !== "NO" ? "-CPKEYMESHING" : "")) + (algorithm.procreator ? "/" + algorithm.procreator : "") + (typeof algorithm.sBox === "string" ? "/" + algorithm.sBox : "");
  this.procreator = algorithm.procreator;
  switch (algorithm.version || 1989) {
    case 1:
      this.process = processRC2;
      this.keySchedule = keyScheduleRC2;
      this.blockLength = 64;
      this.effectiveLength = algorithm.length || 32;
      this.keySize = 8 * Math.ceil(this.effectiveLength / 8);
      this.blockSize = this.blockLength >> 3;
      break;
    case 2015:
      this.version = 2015;
      if (this.blockLength === 64) {
        this.process = process15;
        this.keySchedule = keySchedule15;
      } else if (this.blockLength === 128) {
        this.process = process128;
        this.keySchedule = keySchedule128;
      } else
        throw new DataError("Invalid block length");
      this.processMAC = processMAC15;
      break;
    case 1989:
      this.version = 1989;
      this.process = process89;
      this.processMAC = processMAC89;
      this.keySchedule = keySchedule89;
      if (this.blockLength !== 64)
        throw new DataError("Invalid block length");
      break;
    default:
      throw new NotSupportedError("Algorithm version " + algorithm.version + " not supported");
  }
  switch (algorithm.mode || algorithm.keyWrapping && "KW" || "ES") {
    case "ES":
      switch (algorithm.block || "ECB") {
        case "ECB":
          this.encrypt = encryptECB;
          this.decrypt = decryptECB;
          break;
        case "CTR":
          if (this.version === 1989) {
            this.encrypt = processCTR89;
            this.decrypt = processCTR89;
          } else {
            this.encrypt = processCTR15;
            this.decrypt = processCTR15;
            this.shiftBits = algorithm.shiftBits || this.blockLength;
          }
          break;
        case "CBC":
          this.encrypt = encryptCBC;
          this.decrypt = decryptCBC;
          break;
        case "CFB":
          this.encrypt = encryptCFB;
          this.decrypt = decryptCFB;
          this.shiftBits = algorithm.shiftBits || this.blockLength;
          break;
        case "OFB":
          this.encrypt = processOFB;
          this.decrypt = processOFB;
          this.shiftBits = algorithm.shiftBits || this.blockLength;
          break;
        default:
          throw new NotSupportedError("Block mode " + algorithm.block + " not supported");
      }
      switch (algorithm.keyMeshing) {
        case "CP":
          this.keyMeshing = keyMeshingCP;
          break;
        default:
          this.keyMeshing = noKeyMeshing;
      }
      if (this.encrypt === encryptECB || this.encrypt === encryptCBC) {
        switch (algorithm.padding) {
          case "PKCS5P":
            this.pad = pkcs5Pad;
            this.unpad = pkcs5Unpad;
            break;
          case "RANDOM":
            this.pad = randomPad;
            this.unpad = noPad;
            break;
          case "BIT":
            this.pad = bitPad;
            this.unpad = bitUnpad;
            break;
          default:
            this.pad = zeroPad;
            this.unpad = noPad;
        }
      } else {
        this.pad = noPad;
        this.unpad = noPad;
      }
      this.generateKey = generateKey;
      break;
    case "MAC":
      this.sign = signMAC;
      this.verify = verifyMAC;
      this.generateKey = generateKey;
      this.macLength = algorithm.macLength || this.blockLength >> 1;
      this.pad = noPad;
      this.unpad = noPad;
      this.keyMeshing = noKeyMeshing;
      break;
    case "KW":
      this.pad = noPad;
      this.unpad = noPad;
      this.keyMeshing = noKeyMeshing;
      switch (algorithm.keyWrapping) {
        case "CP":
          this.wrapKey = wrapKeyCP;
          this.unwrapKey = unwrapKeyCP;
          this.generateKey = generateKey;
          this.shiftBits = algorithm.shiftBits || this.blockLength;
          break;
        case "SC":
          this.wrapKey = wrapKeySC;
          this.unwrapKey = unwrapKeySC;
          this.generateKey = generateWrappingKeySC;
          break;
        default:
          this.wrapKey = wrapKeyGOST;
          this.unwrapKey = unwrapKeyGOST;
          this.generateKey = generateKey;
      }
      break;
    case "MASK":
      this.wrapKey = wrapKeyMask;
      this.unwrapKey = unwrapKeyMask;
      this.generateKey = generateKey;
      break;
    default:
      throw new NotSupportedError("Mode " + algorithm.mode + " not supported");
  }
  var sBox = algorithm.sBox, sBoxName;
  if (!sBox)
    sBox = this.version === 2015 ? sBoxes["E-Z"] : this.procreator === "SC" ? sBoxes["E-SC"] : sBoxes["E-A"];
  else if (typeof sBox === "string") {
    sBoxName = sBox.toUpperCase();
    sBox = sBoxes[sBoxName];
    if (!sBox)
      throw new SyntaxError("Unknown sBox name: " + algorithm.sBox);
  } else if (!sBox.length || sBox.length !== sBoxes["E-Z"].length)
    throw new SyntaxError("Length of sBox must be " + sBoxes["E-Z"].length);
  this.sBox = sBox;
  if (algorithm.iv) {
    this.iv = new Uint8Array(algorithm.iv);
    if (this.iv.byteLength !== this.blockSize && this.version === 1989)
      throw new SyntaxError("Length of iv must be " + this.blockLength + " bits");
    else if (this.iv.byteLength !== this.blockSize >> 1 && this.encrypt === processCTR15)
      throw new SyntaxError("Length of iv must be " + this.blockLength >> "1 bits");
    else if (this.iv.byteLength % this.blockSize !== 0 && this.encrypt !== processCTR15)
      throw new SyntaxError("Length of iv must be a multiple of " + this.blockLength + " bits");
  } else
    this.iv = this.blockLength === 128 ? defaultIV128 : defaultIV;
  if (algorithm.ukm) {
    this.ukm = new Uint8Array(algorithm.ukm);
    if (this.ukm.byteLength * 8 !== this.blockLength)
      throw new SyntaxError("Length of ukm must be " + this.blockLength + " bits");
  }
}
var gostCipher_default = GostCipher;

// gost/gostDigest.mjs
var root2 = {};
var rootCrypto3 = crypto_shim_default;
var DataError2 = Error;
var NotSupportedError2 = Error;
function arraycopy(s, sOfs, d, dOfs, len) {
  for (var i = 0; i < len; i++)
    d[dOfs + i] = s[sOfs + i];
}
function swap(s) {
  var src = new Uint8Array(s), dst = new Uint8Array(src.length);
  for (var i = 0, n = src.length; i < n; i++)
    dst[n - i - 1] = src[i];
  return dst.buffer;
}
function b64decode(s) {
  var n = s.length, k = n * 3 + 1 >> 2, r = new Uint8Array(k);
  for (var m3, m4, u24 = 0, j = 0, i = 0; i < n; i++) {
    m4 = i & 3;
    var c = s.charCodeAt(i);
    c = c > 64 && c < 91 ? c - 65 : c > 96 && c < 123 ? c - 71 : c > 47 && c < 58 ? c + 4 : c === 43 ? 62 : c === 47 ? 63 : 0;
    u24 |= c << 18 - 6 * m4;
    if (m4 === 3 || n - i === 1) {
      for (m3 = 0; m3 < 3 && j < k; m3++, j++) {
        r[j] = u24 >>> (16 >>> m3 & 24) & 255;
      }
      u24 = 0;
    }
  }
  return r.buffer;
}
function getSeed(length) {
  var randomSource = gostRandom_default ? new (gostRandom_default || root2.GostRandom)() : rootCrypto3;
  if (randomSource.getRandomValues) {
    var d = new Uint8Array(Math.ceil(length / 8));
    randomSource.getRandomValues(d);
    return d;
  } else
    throw new NotSupportedError2("Random generator not found");
}
function buffer2(d) {
  if (d instanceof ArrayBuffer)
    return d;
  else if (d && d?.buffer instanceof ArrayBuffer)
    return d.byteOffset === 0 && d.byteLength === d.buffer.byteLength ? d.buffer : new Uint8Array(new Uint8Array(d, d.byteOffset, d.byteLength)).buffer;
  else
    throw new DataError2("ArrayBuffer or ArrayBufferView required");
}
var digest2012 = (function() {
  var buffer0 = new Int32Array(16);
  var buffer512 = new Int32Array(16);
  buffer512[0] = 512;
  var C3 = (function(s) {
    var h2 = new Int32Array(b64decode(s)), r2 = new Array(12);
    for (var i = 0; i < 12; i++)
      r2[i] = new Int32Array(h2.buffer, i * 64, 16);
    return r2;
  })(
    "B0Wm8lllgN0jTXTMNnR2BRXTYKQIKkKiAWlnkpHgfEv8xIV1jbhOcRbQRS5DdmovH3xlwIEvy+vp2soe2lsIsbebsSFwBHnmVs3L1xui3VXKpwrbwmG1XFiZ1hJrF7WaMQG1Fg9e1WGYKyMKcur+89e1cA9GneNPGi+dqYq1o2+yCroK9ZYemTHbeoZD9LbCCdtiYDc6ycGxnjWQ5A/i03t7KbEUderyix+cUl9e8QY1hD1qKPw5Cscvzius3HT1LtHjhLy+DCLxN+iToepTNL4DUpMzE7fYddYD7YIs16k/NV5orRxynX08XDN+hY5I3eRxXaDhSPnSZhXos98f71f+bHz9WBdg9WPqqX6iVnoWGicjtwD/36P1OiVHF82/vf8PgNc1njVKEIYWHxwVf2MjqWwMQT+amUdHraxr6ktufWRGekBo+jVPkDZyxXG/tsa+wmYf8gq0t5oct6b6z8aO8Jq0mn8YbKRCUfnEZi3AOTB6O8Okb9nTOh2urk+uk9QUOk1WhojzSjyiTEUXNQQFSiiDaUcGNyyCLcWrkgnJk3oZMz5H08mHv+bHxp45VAkkv/6GrFHsxaruFg7H9B7nAr/UDX+k2ahRWTXCrDYvxKXRK43RaZAGm5LLK4n0msTbTTtEtIke3jaccfi3TkFBbgwCqucDp8mTTUJbH5vbWiODUURhcmAqH8uS3DgOVJwHppqKK3uxzrLbC0QKgIQJDeC3Vdk8JEKJJRs6fTreXxbs2JpMlJsiMRZUWo837ZxFmPvHtHTDtjsV0fqYNvRSdjswbB56SzNprwJn558DYTMbiuH/H9t4iv8c50GJ8/PkskjlKjhSbwWApt6+qxst84HNpMprXdhvwEpZot6Ybkd9Hc2678q5SOrvcR2KeWaEFCGAASBhB6vru2v62JT+WmPNxgIw+4nI79CezXsg1xvxSpK8SJkbstnVF/T6UijhiKqkHeeGzJEYne+AXZufITDUEiD4dx3fvDI8pM16sUkEsIAT0roxFvFn5443"
  );
  var Ax = (function(s) {
    return new Int32Array(b64decode(s));
  })(
    "5vh+XFtxH9Alg3eACST6FshJ4H6FLqSoW0aGoY8GwWoLMumi13tBbqvaN6RngVxm9heWqBpoZnb13AtwY5GVS0hi84235kvx/1ximmi9hcXLgn2m/NdXlWbTba9pufCJNWyfdEg9g7B8vOyxI4yZoTanAqwxxHCNnrao0C+839aLGfpR5bOuN5zPtUCKEn0LvAx4tQggj1rlM+OEIojs7c7Cx9N3wV/S7HgXtlBdD165TMLAgzaHHYwgXbTLCwStdjyFWyigiS9YjRt59v8yVz/s9p5DEZM+D8DTn4A6GMnuAQom9fOtgxDv6PRBGXmmXc2hDH3pOhBKG+4dEkjpLFO/8tshhHM5tPUMz6aiPQlftLyc2EeYzeiKLYsHHFb5f3dxaVp1apzF8C5xoLoevKZj+atCFeZyLrGeIt5fu3gNuc4PJZS6FIJSDmOXZk2ELwMeagII6phcfyFEob5r8Ho3yxzRY2Lbg+COK0sxHGTPcEebq5YOMoVrqYa53ucetUeMh3r1bOm4/kKIX2HW/RvdAVaWYjjIYiFXkj74qS78l/9CEUR2+J19NQhWRSzrTJDJsOCnElYjCFAt+8sBbC16A/qnpkhF9G6LOL/GxKu9vvj91HfeujqsTOvIB5t58JyxBeiHnQwn+moQrIpYy4lg58FAHQzqGm+BHko1aSiQxPsHc9GW/0NQGi9gnQqf96UW4MY/N5Yc5KazuNqSUhMkdSw44IqbpahkczvsFU8r8SRXVUmzP9dm2xVEDcXHp9F5455Ct5La3xUaYZl/04agNF7AJxQjONVRe22pOaRlGPB3EEADtAJ5HZClrqLdiNJniZxKXQqTD2bfCihlwk7p1CBFCbCLMlU4kWaFKSpBKQe/xTOoQrJ+K2JUTcZzbFMERWKV4Ada9AbpU1GQih8vO2vBI2Fvw3sJ3FJV5cY5Z9Ezsf5oRCmIOcfw5xHiQJuH9xlk+aLpOK3D20sHGQwLTkf5w+v0VTTVdtNriENGEKBa64sC2CDDzfWCMvJRbeGEDb7Cseeg6N4GsPodCHuFS1QNNDM7QuKaZ7zKW3/YpgiKxDfdDsY7s6nZQ+2BIXFNvV5lo7FnYe3nte6haSQx98jVc6v21R/GheGjZxpeBjzUBBDJLSg6uY8ssEACj+vAbLLy95AX1k8Rb6HTPOBzWfGpnuSqeE7WjHTNwAZuKhnVxztC2ocStBYccEXDNxWC5O2TIW2s45BBSTn2/H7F8SGGIjt8wLCUBCusFvv510U3mlJ+v3N8Py6jtoFoM+e42brSeMqpoyo0wi/+u+SBY8z+370NjllAJG6lpnBRxu9LhCrR5CK60GUnnFCM2RSIwhhgjO4xnqVJH3zaF9OU4SgTTJxgCUv0MnLV47Ob9hKlpKrXkcy72kPSb/0PNN4fPJRq0lBPW1RomV7ha9+fr2/qj3eUJkjqWHDdCSu/x+Vtcdl8Z93msv9PIdVJPCdrRjroYAORdntPr4bHH2ihPng11LmgtowRXwMMn9QUHdLJFlggAZg9j33dUySsZKpwP8wXUlTCyYmUjgK0Jj5edtafRsLeUHRvA1h9gARF2z2CknLx5WBYSgKbVgvz+65Ypz/83GKhWl5ObK1M6EupblXOH7jMCPl0eq6CslPBAhRM9/tHG58EKJjz6442BosnrfLv+3rtypf+jApevneOBRP099jPMCwlAcMri/eNkt38F1xVTfhlxX9GBS9f6vMwG6Ky9CSqaLfsu9YNhpmPDzUBBHVMAAAAAAAAAADxLjFNNNDM7HEFIr4GGCO1rygNmTDABcGX/VziXWk8ZRmkHMYzzJoVlYRBcvjHnrjcVDK3k3aEqZQ2wTokkM9YgCsT8zLI71nEQq45fO1PXPoc2O/jq42C8uWslU0pP9Fq2CPokHobfU0iSfg88EO2A8ud2Hn58z3eLS8nNtgmdCpDpB+JHuLfb5iZnRtsEzrUrUbNPfQ2+rs131AmmCXAlk/cqoE+bYXrQbBTfuWlxAVAunWLFghHpBrkO+e7RK/juMQp0GcXl4GZk7vun765rpqN0eyXVCHzVyzdkX5uMWOT19rir/jOR6IgEjfcUzijI0PeyQPuNXn8VsSompHmAbKASNxXUeASlvVk5Lfbe3X3GINRWXoS222VUr3OLjMenbsjHXQwj1INcpP90yLZ4gpEYQwwRnf+7uLStOrUJcow/e4ggAZ1YerKSkcBWhPnSv4UhyZOMCzIg7J78RmlFmTPWbP2gtyoEap8HnivWx1WJvtkjcOytz6RF99bzjTQX3zwarVvXf0lfwrNEycYV03I5nbFKp4HOaflLriqmlSGVT4PPNmjVv9IrqqSe36+dWUlrY4th30ObPn/28hBOx7MoxRQyplpE74w6YPoQK1REAmVbqccsbW2ui20NU5Eab3KTiWgBRWvUoHKD3HhdEWYy40OK/JZP5sxKqhjt++zim4ppPxja2qjoEwtSp09lesO5r8x46KRw5YVVL/VGBacju+by/URXWi8nU4oRrqHXxj6z3Qg0e38uLbiPr2wBzby8eNkroTZKc5libb+cLei9tpPclUOclPXXG1JKQTyOj1XQVmnCoBp6gssEI5J0HPFa7EaEYqrehk55P/XzQlaCw44rO/J+2A2WXn1SJK95pfWfzQix4kz4QUUvGHhwdm5dcm1StImYWDPG82AmkSS7Xj9hnGzzKsqiBqXk3LOv2Z/4dCI1tRbXZhalCfIEagFjD9V3mX1tDGWtQYZ90+WsdZwbkOFnR6Ly0PTNlqrioXM+j2E+ce/mcKV/P2iH9Wh3ktjD82z73Y7i0VtgD9Z+Hz3w4WyfHO+XzGRPJjjrGYzsEghv2FnTCa4+BgP+8mVxMEwyKqghiAQdhqYYFfzQiEBFqr2PHYMBlTMNS3bRcxmfZBCvPRalkvUA4Jo6KDD7zxvPae9ktJp/3O8KQriAgHtIoe33jTN6IWBj9kB7qfdYQWb1vonMhmgNVPVbxrodMzOyeoxJFwug/VUcDRVXaB75JnOJtKsVue+9/0WGFelBU44ag59pFJ0NtFb2Go4HN6f8sr3dWIxdwwysJqu2eJ5yNBd7xCRxgZ02xEQRqJRXlBFI1Ns5HKYAvzFDLz39bY8+nOhaIfNFx8DfSlBr9nyjb0/Xj60Wk87nYTu/jYbZ3FAPbjj0+cHYnEaOij58g/SSH68fHW0nnYndOXyk8frVlwY3PWeT0eLpAxu9E+prctSxpmBLZjax2B4iwbcbkadDvxl+Op1IexOMKX3IZ6OC1Ur7D9lvKV7a93QSWm68bdemZBM2+OU6lcUsgHR5upA9ruwwIJBKErdUPIEY7+PHf/o1/k7k8usuE2Mto5HfIbowd0bOZImjj98WqESCdYvyy89mKvbNcmuZxNpViv9X/UVweFsNs7igB1+su3485sX2pTTfbAN/gGHe8PsdguK2suEld/hU65EBaJHc7e0ELMShXt4PDKr3463cNBoElE7U2c5udLj5mVYTVficbJkaNeJx4/JhJclqTW7+n0a4QKLFTej36ZBiNDNXZvDeN56Ssgsmk2Az7dCd38bg722IHLSiDodM711XnotS6tqj0H02qtruxyV2ZBc/+f9jTG2g6pkIhGbOB/ArvuEQgIsSaD5CMZjAzrjpCivCASTiCat5Bw0GopTx65xIe535qhdxH9cSiWSnoy1OOmqVc3YYwY3eqna2OspoYroe7MnmJVu39pqNeSEFGt9nRmCUJSn1Bz6VaTobL/lyu3J6kLFnKNsNRwOb8F5UYHk3m+rv4n/8MUwGE0X1J1B6xWEBFiSHA1SUCjXOWHxeOwYDKiFapoFcQGO+BHNQJGifD7178wZrxUjn2Mp0jR0UO/5HrmQ4RtKB43Sd1m5Vh3l/GATMZEvH1otqZPAFlTctluiGRo+Ld4JimuZ64pm1x4PguP+jFGtt9VaCNdFM+UPiUH/fwLm3We9SFns4Giqul321S/CSCbj/0p1pWw5Bw2IrN34ZIZUjEaRpG/Rvr0mE1x8DLMPkwOPFTNKgtmEn8G/mmmcMguoVCD65PpSgkOv+QdnntTWz+loowi4Jf1YLESxR5t2kbxe3LO7x+phkEj+ZRYQY6YfgXryM0fVOGg0CaaTY8LOmExt7TAqn9/YbIHZHXseOwYDKmaUZmCJ6/vZ/YMKWY7mc3UgewdEmhQK/ElfLKilcbZZMjQfmG+KRbvC+zgapKBQs3LCVCOjrdgfrzoXJzwLi4a7bP6DJY3IabWiKHkCv9HJgPH1qUvWazg3r4iACnmyyroSVVBDEAg7DUzfNpQOB7nusgTRp85nkLLFYSQT//EltNwm8SuXxSwST4YII1GmLyis75NjL5k35ec1B7BSKTob5ucsMK5XCpxw01hgQa4UJeDeRXSz151MxJK6IoBAxWha8AsMpdyMJxy+Eofx9pxabvOeMX+x4NyGSV0RQCDsNC1pm0B+PxjNS9yjqdRq1RUoDR0U8nmJaSQAAAAAAAAAAFk+t1+hlsYeLk54FgsRa9htSuewWIh/juZf0BOHLj4Gem3bu9MOxOKsl/yJyq7xsQnMszweGdvhifPqxGLuGGR3cM9JqoetxlbFfsplV/bWA5U92m1s+5o2ko2IRFbgfB7rjzeVn2CNMdYXnE6qqSNvrDrX5cAmYkMEn6ZTmRRWq9NmncBSuO6vAsFTp8IKKzzLA243I8AHk8nCPZDhyizDO8ZeL27X00z/VjOXWCSeselOZDJdaqY34W01lHJCCnn45mG+Yj94UhTZBALHRBNILvH98MiWWxP2m8XsFgmpDogpKBTlkr5OGYtUKhB9cszAD8vrr+cbG0nIRCIrcD4lZBZNqEDp1SDGUT4f9PlmusMgP5EM6Kvy7dHCYcR+8IFMuUWs02Hzlf64lEo5IQVcnPAsFiLWrZcYZfP3cXjpvYe6K5vwofREQAWyWWVdCe11vkgkf7wLdZYSLhfP9Cq0SwkXhel6FZZrhU4nVdqf7uCDkkkTR5EyQypGI8ZSuahGW0etPkN0+LRfJBKxXoskF/bweGRLo/shYv5/3aURS7vMJ52kbcEBc+C90CSidiIgjFmivKCKj8SQbbg2803kuQ10OmZn6nFHteBwX0bvJ4LLKhUIsDnsBl719FsefSG1sYPP0FsQ2+czwGApXHefpzZyOUwBfs9VMhGGwxyB2HIOGg1Fp+07j5l6Pd+JWDr8ecft+ysu6aQZhkPvDs5fCc32e04tN09qa+n6NN8Etq3UcDihI/mNIk0KBX6qocliSLhcG/eo4/2XYDCaLrULKm5bo1GCDetCxOH+p1cilI1YKZodg3N/z5zIZLrUUaVbT7XUtypQCL9Tgc49eZdGptjV5C0E5dIrgPx+MIeWV7aed7VzVKA5aUQdgJfQtDMwyvvz4vDP4o533eC+jMNisS4lnElPRqbOcm+529HKQeJCwe7RTbp2Ay/0eqMPsEWyaKk6zeTMr38L6IRUnQgEg1SzwUaCY5JUNcLIDv7S7k438n/f+6cWejOSDGDxTfsSO1LqA+WESgyrU/27kAed6vY4D3iKGctI7FWPDLMqtZ3Estb+9+Dc28oi9PPsthHfWBNUmpxA4z/e31aKztOgwcgSQyLpwwela4FY+m0NdyeVebHh893ZsYt0QirABLjsLZ//q8KU9Kz4qC11kU97v2mx7ytoeMT2L69Iesfhds6AnMZ+XQxnEdiPkuTBTGJ7mdkkPe3+I0qlw9+2i1GQmx8VJi2/bU9m6gVLYry1GuLPWlKqaui+oFP70M4BSO1oCMDmYxTJQ/4WzRWoJxDNBJIxoGlw9ue8imyXzEywM3zoNfyzucBl3vJYfMeA81IhTt5BMrtQlfFeQ5D0k9+HCDliXdLg8UExPBr7i2avkXIK8FGyEbxHfUJ+1O6lcy47TO72474lgmJ4NOsLzEOcA+PdeOckyCh3MorZhn35FLUZReJDsPJXSw+I9+uX4oi2+piapJQ6GcTwaMsWhYZQ7mQJrxH6733zF9XATqukelZ8VJi0xqm2u/uAT0IYjjzCK887xc0L0EM26qo5dxPwL6wb7DMTLCUG26fw00iN1+Zda/LDGh5eubIWH/gg9YQuBlDEbg+fcWvrHZ6EMAGpM3WMqzFe1D/kFP2ieSJlJ8nxcB7wCTJzpMHKcKdxvpQYS6bnaz0OQNgp/4wUyH4PvsP6x3Z0yzYWqWNKapVyjxORGcJe+Tf1Re1NWuo/nugCSZZQujh7ZDfnvQtYLiLmVZ+J4FPiYYCtUuMFKI38bcVaI+NLmTXeFOD1GtCtCcY5BXimWYZeltdhcQlIfLHi1ss6IRVgAgHpFeV3n67RrbAhP2p33LeYgLduuaGmq12fjSSGRM+b/V5FNsVmJljxxrn+m6y9/erNY0G+mXnE76ciFwhAVXZRB3Hs2I5UPsK6UctnHwQ9CtSCrHGvWHn+eHoEXNrJNrI4rzOOBJrtvYZsyUly7iZhXabrvYECkDKV/dCLLBcR+DQEYHO/CurzCZMpdY/8QhyusT59z6k0uiMHSBGIgysk785Ch0zmXA5X1h+w6doas9G61vmbNDzAdXsciTxFgitRDbhAOpKXXHaYwfHbYUo+DQEY1eaMtNYPSI6FXLTPrpYeDfPLM9k6jlWrFKAO10IXAyhiN4nBg4tt0ZyUYpKJX+997Ts668/LuOZOSjFJBkx+ZC9lw9w9Kz4qTFpj2lvT80CpIQxHtHTRV6FhWTGsWTTaHehyZm7jZRF693ZbyG7TZxawXESbpohcIB1JxbkFOHqINGxFExByxLq53f+/SUYep1GvmdUpd7wc4FuhsPeF5GAn21JUbTC6bld4jDBa1wdlD1auyYfGgmEv8pWlq4lE9fvFcX7VKOdZ8kTKjdy7zix9uIiqFUq+Mo2xuh5hm+mT7OiLCfK9nugTtxd0AapLKF0csyGFjxQxlcruSMOBhBOY0bj8t1DTsvmIiTmoapmNHOG5H4iODORzRlp4mVaDdpeHFgLPKtfuI0G/hccTtbPxoU7/kW/hK0Vn53waAjC30QV1DJj8yF7Km6Wj5/cg2p4GrWpgMaK7sfQ4lz50lH7X0mAs9GY5GMD/ml9Qp/NoZ44kNNmDtKRJ1M1orxt1VZK1h388PQIubeobq/xfW0USH2sNcektKVU1dN/99RBtTwPYCBuoe5+MGcbbfqGjrAmBu7vKEq1mFy36eXBDZgEIKccXkyZ3e/9fnAAAAAAAAAAA6yR2pMkG1xVyTdQvBzjfb7dS7mU43bZfN/+8hj31O6OO+oT8tcFX5unrXHMnJZaqGwvavyU1xDmG4SyHKk1OIJlpoovOPgh6+vsut52cS1UFakFWttksslo65qXevqKWIqOwJqgpJYBTyFs7Nq0VgbEekAEXuHWDxR86Sj/laTDgGeHtzzYhveyBHSWR/LoYRFt9TE1SSh2o2mBp3K7wBVj1zHIwneMp1MBiWWt/9XDOIq0DOdWfmFkc2ZdHAk34i5DFqgMYe1T2Y9J/w1bQ8NhYnpE1tW7VNTCWUdPWehwS+WchzSZzLtKMHD1EGjasSSqUYWQHf2ktHXPcb19RS28KcPQNaNiKYLSzDsoerEHTZQnYM4WYfQs9l0kGMPaonszJCpbEZXeiDuLFrQGofOSatV4OcKPepEKcoYJka6Dal7RG25Yvaszth9TX9t4nKrgYXTelPEafJdzv4VvLpsGcbvn+o+tTp2SjkxvYhM4v0lkLgXwQ9FaiGm2AdDkz5XOgu3nvDQ8VXAygldweI2wsT8aU1DfkEDZN9iMFMpHdMt/Hg2xCZwMmPzKZvO9uZvjNauV7b52MNa4rW+IWWTGzwuISkPh/k70gJ7+RUANpRg6QIg0bVimeJ2+uGdMoY5KMPFOiQy9wgv746Rue0LxveSw+7UD3TEDVN9LeU9t16L+uX8KyYk2pwNKlQf0KTo//4Dz9EmQmIOSVaW+n4+Hw9Ai4qY9s0aojD92m2cLH0BCd0cYoj4p50E90h9WFRpRXm6NxC6I4QX98+oNPaB1HpNsKUAflIGya8UYKZD+hKN33NL1HEoFERwZytyMt8uCGzAIQUpMYLeWNvIkrV8qh+bD4kx37a4kkR8wuWun53RGFBCCkO0vlvraKJD7WVYQlXxnI1l07Z0BOYz+gBqaNtnZsRyof94rHmrTJfiHDU0QuEICq7JpPnblXgucUBbp7yCybMiAxpUZl+LZeT7G2Ufd1R/TUi/oNhXukZoKFqWxaoWqYu5kPrvkI63nJoV43okf0pi12hX3NXSd0HvjFC4AKGCC8vmXcsgH3orRmbRuYb5Qm50zJIb9TxOZIlUEKD5PZykIgzcyqZHuk70KaQGCJChhxDE6k9psys4vM2jYt3jVM05bcI7x8Wy+pwwm7aKqFGrPSYTGnNkjgEwIdxSlB/E2yzVrat3BL5IqneWXZhO1x5jI4b9YXNLuk6C1t1TirckVcIUfqYXe0sV2hq3DPCRzorJB/znK4vf9XyF39lyJ4qKTkTGprb5QNOFGZW08f3+RiV4zK7XG8ntmIK7DAHSwKkXudXRE8UDuiwx4RqHZDxuRjySOjmcHO9xaGxX6odtyHtKlz4JbVCa8NVn2dOlgUtAwqP1ncxvQ2AviEldEh3dPh3T2YNkhK+UXnGqRmiOV1GFR+sqWR9ZNmWHRQwB2JnqgQGGWMBltPVAgMvEYDoy0DhMZRN7893DJQeOyGHirqMKj8eVc/9yFNIDDKBQy2ZfAyK4AWwwxpvpbdGyRwh9uV7pmB4WG40fwYFNnKBfiCDtK7zA3nKWPXYFBDDxTHO8yw6KCdOg+OQHZNVz9UojnRdcHhYXe9EvWjfHNPH0urN8EvH9/CbVZIsWc5XNDxbATtFTe/QqftlxYdFDBAZX1sZ9qrcrgH7Bf6h7pO6Dzfr3nLAwT7wXM/BgVxvEY+eNYcEofpiifQfPSOd7StobnCYlNskN0m4kSbWGCAFgWPwJrX+UH8+/rYzqlL5G0Oo0PyiwYI65+bEmvQSRc0e5qSh0rnaZwiGwF8QsTmnuA6TFxyDuOSVktun14+o5naa6NT9FrYPTXn/uCQTBskJSLQCYMlh+ldhCmAwA8UMOLGs8Cghh4okwh0M6QZ1ynyNB89rdQtbG/uCj+u+7Kljkruc8SQ3TGDqrcttbGhajSpKgQGXiOP33tLNaFoa2/MaiO/bvSmlWwZHLlrhRrTUlXVmNTW3jUayWBN5fKufvMcpsKjqYHhct4vlVGtelOYMCWq/1bI9hYVUh2dHihg2VBv4xz6RQc6GJxV8StkewsBgOyarn6oWXzsi0AFDBBeI1DlGYv5QQTvitM0VcwN1wenvuFtZ3+S5eMluQ3naZdaBhWRom5jerYR7xYYIItGCfTfPrepgaseuweK6H2swLeRA4y2XiMfD9ONRXSwVmBn7fcCweqOvrpfS+CDEjjN48R3ws7+vlwNzkhsNUwb0oxds2QWwxkQJuqe0adicyQDnSmz74Ll658o/ILL8q4CqKronPBdJ4ZDGqz6J3SwKM9HH54xt6k4WBvQuOOSLsi8eBmbQAvvBpD7cce/QvhiHzvrEEYDBJloPnpHtVrY3piPQmOmldGQ2AjHKm5jhFMGJ1J7wxnXy+uwRGbXKZeu5n4MCuJljHwU0vEHsFbIgHEiwywwQAuMinrhH9Xaztug3ts46YoOdK0Qk1TcxhWmC+kaF/ZVzBmN3V/+uL2xSb/lMCiviQrt1lum9bStemp5VvCIKZcifhDoZlUys1L5DlNh39rO/jnOx/MEn8kBYf9itWFnf18ul1zPJtIlh/BR7w+GVDuvYy8eQe8Qy/KPUnImNbu5SoiujbrnM0TwTUEHadNmiP2as6uU3jS7uWaAExeSjfGqm6VkoPDFETxU8THUvr2xoRd/caLz6o71tUCHhUnI9lXDfvFOaUTwXezURmPc9VE32PKs/Q1SM0T8AAAAAAAAAABfvG5ZjvVRWhbPNC7xqoUysDa9bds5XI0TdU/m3TG3Ervfp3otbJCUiefIrDpYKzA8aw4JzfpFncSuBYnH4mUhSXNad39f1GjK/WRWHSybGNoVAgMvn8nhiGckNpQmg2k3ghQeO6+JhJy11TEkcEvp19tKbxrT0jOm+YlDKpPZv501OauKDuOwU/LKrxXH4tFuGSg8dkMPFT3r4pNjhO3EXjyCwyCL+QMzuINMuUoT/WRw3rEuaGtVNZ/RN3pTxDZhyqV5AvNZdQQ6l1KC5Zp5/X9wSCaDEpzFLukTaZzNeCi5/w59rI0dVFV0TnignUPLfYjMs1IzQUS9EhtKE8+6TUnNJf26ThE+dssgjAYILz/2J7oieKB2wolX8gT7supFPf6B5G1n45TB5pU9p2IbLINoXP9JF2TzLBGX/E3spSsk1r2SLmj2sit4RJrFET9I87bt0SF8MS6erXW+tVrWF0/YtF/ULWtO1OSWEjir+pLmtO7+vrXQRqDXMgvvgghHIDuopZEqUST3W/jmnj6W8LE4JBPPCU7+4ln7yQH3dydqcksJHNt9vfj1Ae51R19ZmzwiTeyGkW2EAY+Zwer+dJi45BzbOazgWV5xIXxbtyqkOic8UMCv9QtD7D9UO26Djj4hYnNPcMCUkttFB/9Ycr/qn9/C7mcRaIrPnM36oBqBkNhqmDa5esvZO8YVx5XHMyw6KGCAyoY0RelO6H1Q9pZqX9DW3oXprYFPltXaHHCiL7aePqPVCmn2jVgrZEC4Qo7Jwu51f2BKSeOsjfEsW4b5CwwQyyPh2bLrjwLz7ik5E5TT0iVEyOChf1zQ1qq1jMal96JurYGT+wgjjwLC1caPRlsvn4H8/5zSiP26xXcFkVfzWdxHHSYuOQf/SSv7WCIz5ZrFV92yvOJC+LZzJXe3Ykjgls9vmcSm2D2nTMEUfkHreVcB9IuvdpEqkzc+8p0kmywKGenhYyK2+GIvVTaZQEd1f3qfTVbVpHsLM4IlZ0ZqoRdMuPUFfesIL7LMSMEL9EdfUzcwiNQnXew6lo9DJRgK7RAXPSMs9wFhUa5O0J+Ub8wT/UtHQcRTmHMbWz8N2ZM3ZS/8sJZ7ZEBS4CN20gqJhAyjrjpwMpsY10GcvSM13oUm+v6/EVt8MZkDlwdPhaqbDcWK1PtINrlwvsYL4/xBBKge/zbcS3CHchMf3DPthFO2CETjPjQXZNMP8RtuqzjNOWQ1Hwp3YbhaO1aU9QnPug4whXCEuHJF0Eevs70il6488rpcL29rVUp0vcR2H09w4c/fxkRx7cRe5hB4TB3ArxZ6yinWPBE/KC3tQRd2qFmvrF8hHpmj1e7UhPlJqH7zOzzjbKWW4BPk0SDwmDqdQyxrxARk3Fl1Y2nV9eXRlWyemulfBDaYuyTJ7MjaZqTvRNaVCMilsurGxAwiNcBQO4A4wZO6jGUhAxzux11GvJ6P0zEBGTdRWtHY4uVohuylD7E3EI1XecmRcJ87aQXKQgZP61CDFoDK7+xFavMkG9I4WNZzr+GBq74kL1Tnytm/jAIR8YENzBn9kLxNuw9DxgqVGERqnaB2HaG/y/E/VwEqK95PiWHhcrUnuFOoT3MkgbCx5kPfH0thGMw4Qlw5rGjSt/fXvzfYITEDhkowFMcgFKokY3Kr+lxuYA21TrrFdDlHZXQEA6PzCcIV8Lxx5iMqWLlH6YfwRXtM3xi0d73Ylwm165Bsb+BzCDwmgGDZC/7cQA5B+QN+KElIxuRL6bhyjsroCAZb+wYzDp4XSSsaWVCFYWnnKU665PT85sQ2T8p7z5XjDnRJfX/RhqM+lsJSg2EQ2FrWkE36oQIbTNMSkTq7dYclRPrdRuy5FA8VGD1lmmsehpEUwj8sq9cZEJrXE/4GLdRoNtCmBlay+8HcIhxaed2QlJbv0m28obFJNQ537aAjXk/Jy/05W2to9rkN4OrvpvTUxAQi/x8ahTLn+Wm4Xt7WqpR/biAHrvKPPzrQYjuBqTj+ZiTui3qtoae2gujdyFZge6eMxW8oHiowx5slekX6oI1bQXTgZCsws19ji/9+rgJUS8mvnAwF+AjOWTCK+YtGro/FjanMVcOIgDSWx2dtDrHzPKrh5w3XurtiAjJuorS/1QIPhyAYccudXKdUqbcSzoQWadh96DxWimGEeF62c59CC7pssHQeK/EtW2Dqwc5Hdqw19xKDaRwsa7fZ/s7bX/zNsY9MNRqDH3nAEsMWBYLwq62uYqdMt+GlgByC7wb8Z6IYRfLLI1dRFGZfXfBNnb9A/S10J4ZYoDk9P7cxg9oFpAnRkuOwF6n7KM8LQGX5JamiKUK/PXzbdeInA0Y+ArMm4QxatdBs55aOgpWmLea5c/OzY26tQt9XHTgZwwzl7lSbcinXy8USmSr9ZeLRRvjvTpBWsChktwQeE0Aw4ovALt0q2tUJZ5MrSvSK6V0Hb+b7e8bcR4Qjmqy3VfYWZkAaS+29uAfWSF6o04mvYwWkG8IgrbSxPXU7MriXKfIRmX5YS7MyICkdaDGTztocf/9atsDJn4GOFrvV4n9n46GlnTTuJdIzzZj4roU7VKLZbfcK+ssQXnl5XS6ZubukJY5De2dEM0F4AYb2zohmgvDr8JKjuzR70rzX+mLxjR1VrdnX0BHFVx4L0+Rxsb3/3qpsL4CO6v70XuV9MfbIgKT1D6R/8ET8oBrdycNR9bWV6nZkbTNS+SIAAAAAAAAAAIWQnxb1jr6mRilFc6rxLMwKVRK/Odt9Lnjb2Fcx3SbVKc++CGwta0ghi102WDoPmxUs0q36zXisg6ORiOLHlbzDudplX3+Sap7LoBssHYnDB7X4UJ8vqep+6NbJJpQNzza2fhqvO27KhgeYWXAkJav7eEnf0xqzaUx8V8yTKlHi2WQTpg6KJ/8mPqVmxxWmcWxx/DRDdtyJSk9ZUoRjevja8xTpiyC88lcnaMFKuWaHEIjbfGguyLuIcHX5U3pqYi56RljzAsKiYZEW2+WCCE2ofd4BgybnCdzAGnecaZfo7cOcPax9UMimCjOhoHiowMGoK+RSs4uXP3Rr6hNKiOmiKMy+uv2aJ6vq2U4GjHwE9IlSsXgiflBc9Iyw+wSZWWAX4BVt5Iq9RDi08qc9NTGMUormSf9YhbUV75JN/Pt2DGYcIS6SVjS0kxlcxZp5hpzaUZoh0ZA+MpSBBbW+XC0ZSs6M1F8umEONTKI4Epzbm2+pyr7+OdSBsmAJ7wuMQd7R6/aRpY4VTm2mTZ7mSB9UsG+OzxP9iknYXh0ByeH1r8gmURwJTuP2mKMwde5nrVrHgi7sTbJDjdR8KMGZ2nWJ9oM32xzoks3ON8V8Id2jUwWX3lA8VGBqQvKqVD/3k11yen5zYhup4jKHUwdFnfFWoZ4Pwt/kd8Yd07TNnCJ95Yd/A5hqNBuUnrKkFcb07WIGEZRgKJNAY4DnWuhOEbCL53K21tDxb1CSkJHVls9t6GeV7D6e4N98+SdIK1gUMshqPhTuwm20cRnNp42swPbkAYnNEAy265KtvDoCj9/3sqAXwtLTUpwgDav40FyNazSnj5ui93c347RxnY8jHwFFvkI8L1u3wfceVf79iOVdaFMDK1nz7m5ls+nE/wc6qncqwzma5evsh4Ful/hCp1sRDi2y4EhKSzMSd8s92N7dvVEMrHnrn6U1IXlVKpH1x4qwqWhG4GptQ8foC0vwszoIybNUaxYe5TnxwjXrqZC+wb7yN2YGx7IsIJIzYUVpqusBUjtvwyialGlTq5Nazt0nKDj2PhM0DosEVeyhK6BSd6GyxJeP+KKlUSLKE+VAhiJ2E1hi0/HN243f3gi3bP5dHhLInkoXig5WgWsDlphn7l95lTMD7Vmv7XSLq3jXHW2Sny35PlPu9dio+Lp5jCr2GbFpjjnPa5Xdry90kQTi7CqcgOCIZCfOXI/YgluV6sTg2Zk6xgJxRpnDpRcwdvk9GxUfUKKfQp7VBeorx1lGNGZaz9x/S5hhsftTKSNC98chwAgOhkEwhpPNFpb9e3SHJzGScTaxS9NEbIpjoXIbZpo16KZoDkrKtljyOVCaFqTl3k70Loq5N6dDXug/CNkTTmI54mx/loJ5Gjwt9nSIP27wCoMpFjyOWn5C/etlkVyq7kx5gd21GfI0eFrx6A0lXd3j7Zi9cFCJijKpnMysKMpFGdpOZlauWYgPTLMdIg2XmPo31tsmMvlo8LT/zRqgDwlkTyWFRfo61RdeJN5y9GxUfF2yRhVxPoD7/w9+IHhDzytz0qr6vRfqNq7fYrT9ERus0W+Sz0q6p9vHLWfgs0FrXa1J+tO8oxaySRSoixXRUAaK7PkU4nwd6+Me/EBP5Ix1m+2iI37c/RQbUix4TlBw8XwmaBzmlsrBWBXzvDXSpks7tIGngAz/Kf59/fYe2frD1bqksGwmY6ke9ZnRA8EZkTRAQ0H3rU3tafIFVM2dlkm2G9aryMO95+rbE2jRMYmfsCr7ZR0Y41Lh+ufx2jkjWu98psGhu/XgqO5PepE3eAXPmgseMThxYYC/jlvZ+DrL2zzlgAJ15RXTi4l+Ry0/IfD7vMYtlG63ho6jlbo8JI0hlC4J5yI2Rb/eOYP/ZP65AuQbscl3QWMNENlXw8sXIrWNTsyieuxxnK4MO5n+y1GkjBX7FGWsgm0nMyvhvQR6116/AXn3M6+UGWDFZy7JbEGjxHXCf+umUkaE82Tv0P1144c07Z5gBAdDrhj7jimTue8UTThFPrEMYlqBaXhIB0I1XBJIz0LOFKbunhysH9YGMS3Oe4LWukeS6budFBx7H4caB1YWuA3BHEouuEnBmPIfp3d8qRgByNmlBrE0jkh+wnOtQbINHph7OkR0YKtVo8+744TmKANFdvIKG4fRbYl6YXMP4n3v5F1SWIPN5rjKPb63DCNkftAdERl6Nio+oFkjhLYfQPPxiT8QddRX0UQEcdxFWNo0I3A1uNymEWWH/CBDjZtn08mrJtArC1yI7g4lF2/nejgqtdqQJpzEctnY/jFjxB5G+qjLibervHcWQvUvfR3khS8SbzmoxrowJDOboGAFB9fO6IjIj+6Cxhogr65XokSJJteAEfyl5yg2pFjwByvOu49LTL1Je75K820koTyv6Zu3aVV9EvqevQWntanowEuqW4Nr20JzFI+sO3kFkIOEgShRwSHlV9NQbFWw/XL/mWrLTz1hPtoMjmTi3APwhoNW5rlJ6QTq1yq7Cw/8F6S1E1lncGrjyOFvBNU2f/hPMAKNr1cMGEbI/L06IjJbgSD39sqRCNRvojHs6j6mM02UdFM0ByVYQDlmworSSb7W86eanyH1aMy0g6X+li3QhXUbV+ExWv7QAj3lL9GOSw5bXyDmrd8aMy3pbrGrTKPOEPV7ZcYEEI97qNYsPNerB6OhEHPY4WsNrRKRvtVs8vNmQzUywJcuVXcmss7g1AAAAAAAAAAAywKkdt6bUCnk4y/Ui556wnNLZe4shPdeblOGvM1+EK8BtPyE58vKP8/oc1xlkF/VNhO/2g/0wuYRO4csMef26C/hi6JVBSrr6XS3LrxIoeQKvFZBuJ2Xm7RqpeYiArZuROwmsMS7/4emkDtbJ6UDx39oAZD8meZHl6hKOqcajZzdEu3hYDfqfMVUJR3dDchOiMVMfZVr4xNNkWlgSGYrXbCAcsyZCbmStd5ZYsXJfFGBuAOtGbY3ybL1l9lKgjDsCwiqxV9WXaTxMn/SAXKD1q2YkZ54815jarlRlnZ1H1Mk6SFnClN3T7n9PRwV1G1IkvZhlPvaSF9aNdxzEQFbN97T9HBUd6k9wAoOs4HNDY27iNgJxl/kNhYQSZe+rLpVIbcKyVaTsoxZ9MXiJUEYdtXbXrULIfSZVdehnPVcCW+pcka0w/hRn4VS1IeivTg1VGNdGBKXw1Ajwu/chRg78p9h+W7MDJN5U0iTo53cj+1e3wtZqgpUy6wsbRqfOJRc1667oNiqfecqv6AMCcXvKNhMxk889y+/IAP2TbFYeLOnJMffwG7J+AafMj9ogIaCzClqzVHQHJQFXiuuXMDFw2Jw4sIdYwG2O4QnIDgiGcDS8JAOhGq4JFL8byd6F0XSxpU8jOlNiw/gCfj+MJV1PmVbLHmSKE0LmEo31UNH38Tqta6/iAjipZo/0sCQzFa6nKDg//hM0DhMJZXkr63hYt9nCPSzvGMCv2IPI31U68qTQp0QHBGCYAl9T9CM3dTajC+bVy5g7O9winx/GMS0Hzow26Tf6dP/QAbxmn+w8Htfa/fdTcGe9B9tBkcycW6P+fvMhmpknTMwjI3lZ3REZIlxsPlyoCks1hpHJD9ht9jv64UR1MgnZpYctr5A0UejqrNfJfe4Et52FU5AcEQynVE9drZOVwaT80eax9L5Cqibiy5EdwechSl+uZ09haxpfjfmLfx9QMN3byWk7pOeW+BFyFDdj7Wthu1bpxH/GVLpHQvZz2FrNTfgqyVuQI/7lgf2wDECWnoLAvXhFtI8nfPYSGv7UGUMYhz/J8QIdfV9QMtx+l/TSm2qZhbaopBin181SSPshOLshHw9xQfDswJaNmgEPOIFqL+ebE2sCxn6gIvi6b67lLW5nFJ3x0+jeNm8lfA5e8zjMuUM260mJMdPzhKTMnl+Fyns6y6nCavC1rn2mVTR+F2JjL+6uFUahZp2+xfditsb6FiGNi9/tfZBP4/xNs2K0xEPpbu341wKL+7VFMxNEegwEO3Nfxq5oedd5V9C1YHu3kpVwTshtvL1U1/5ThSADMG0bRiIdh684V/bZSmROy0l6JdacYHCcYF/HOLXpVQuUsXLXFMSS/n3pr7vnCgdnnIufSHy9W7OFw2bgdyn5g6bggUctJQbHnEvYjxJ1zMh5Fz6Qvn33MuOen+Lug9gjpiDGgEPtkZHTM8NjolbI6mShVhPsnqVjMK1cgUzVENC1bjphO/zpQEtGzQCHnGMV6Ziaq50GAv/GfwG49gTEjW6nU1qfG3+ydRMF4+G7WVQZSPmoC5SiAN3LVwGIpOJiwH0/gtpHsD42r2K7YJZkUxOOuyYW2e+sQ3wgn+/lqlqaSea1Pja4eeGidzT1f8ugS4aKx+lU9H7rZDW66DKGBrFQ7I0MQ45FgT33yy5eCemJBxpURifAnU1E8zqr3xeZPKln8hMTvokfSseSJ9fWttk1xirR0xIefSnofInCkAVc9qDKpvrrjSXhnloYhxyUUg40qIwIwTwr2U3/XL2hR0GAj46a0S6Z4WIw85u3XNmqJP3zHCs/9TSTim17anfOFYyFHDqamwHw0GMDlpKgyvLsi9WNbrNBLRs0Ah42QoG7lq4DEQ7DzshH0h2yPnlCVjDiRLu3pjRSznNv4sBWTl7KSBy9Bvgh8BAkxPhaN6tJumIR8qjn04UDIScZ4W71f9VHbfz2FOgykbRXVykDc1gIMeH/jRvhLdtzxXD+1fe/aD8oSHkzkuNe2CWAS09msZCrSmKLGQIddi9EPCvFLNXxup7g3SsTWMh2JpFFjLtqWcJxxmyP/dsJLvzKLwGxmLVJpEsCPI84l7EeJKzZrl4KD9vTzm9wIyPnp1oM/1PORewnnn0N1k94G+ywIwQ1oh4QbHRS9oZsm7uMhOdsLSUh2Z12T4vglk3dxmHwFiQ6ax4PUZhdfGCfgP/bIcJlF3AqDU+uH9FFvllirW5Jj+Vc5h+sCDvuFUzC21RSDEq5qkbVCvLQWMx5BPGFgR5QI+OgYDTEaDv81FhwyVQOtBmIvm9lXDViHbZog1LjUmlUzE1VzoMi+Fo02TfkcQh9BsJ5/UKL48SsJsPJMGhLdpJzCypWT3EH1w0Vj5Xpr9U0U82qFaLgq983+BD9kGa6momhclD+Lzl3L+01+kdK7J63d55nQUga0Q8rtbmq217rpHJ9hvoRT64aKx8rlFjEce2UyLjMqTSPBSRuamS0I+1mC4DEcfKcKxkKODJ1NiJW8KWD1X8xXZCPpDsje/Xb/BQft6ecmc9z0XweozC6kqgYFSUH1yxWBD7W7De/Zxe/qHjvJrGk27dS0rcgAPrdBgI+OixDdIUXsG3KIWaIii8n3NQFylEJwoGQk69zNOXKu30Mxwr9gWZd+QKZqiGJVAwKkqBLtbdio2gpwN3R8UV+HqXDpt7MCPqqWAaxXi346o6c/utpg+2mTEequWXAAAAAAAAAAAxDvGdYgS09CKTcaZE22RVDeyvWRqWB5JcpJeLuKYklhwrGQo4dTU2QaKVtYLNYCwyedzBZCYnfcGhlKqfdkJxE52AOybf0KGuUcTUQegwFtgT+kStZd/BrAvyvEXU0hMjvmqSRsUV2UnXTQiSPc84nQUDISfQZucvf97/Xk1jx6R+KgFVJH0HmbFv8S+ov+1GYdQ5jJcqr9/Qu8ijP5VC3KeWlKUdBsuwIOu2faHnJboPBWNpbao05PGkgNX3bKfEOONOlRDq95OegSQ7ZPL8je+uRgctJc8sCPOjWG/wTtelY3WzzzpWIMlHzkDnhlBD+KPdhvGCKVaLeV6sammHgAMBHx27Il31NhLT9xReAxifddowDew8lXDbnDcgyfO7Ih5Xa3PbuHL2UkDk9TbdRDviUYiryKriH/442bNXqP1Dym7n5PEXyqNhS4mkfuz+NOcy4cZinoN0LEMbmbHUzzoWr4PC1mqq5agESZDpHCYnHXZMo71fkcS3TD9YEPl8bdBF+EGixn8a/Rn+YzFPyPlXI42YnOmnCQddUwbujlX8VAKqSPoOSPpWPJAjvrRl376rylI/dmyHfSLYvOHuzE0784XgReO+u2mzYRVzPhDqrWcg/UMots6xDnHl3Cq9zETvZzfgt1I/FY6kErCNmJx0xS22zmGb61mZK5Rd6Ios78oJd29Mo71rjVt+N4TrRz2xy12JMMP7osKbSqB0nCgYFSXOF2toMxHy0MQ45F/Tute+hLcf/G7RWuX6gJs2zbARbF7+dymRhEdSCVjIopBwuVlgRghTEg66pgzBAToMBHx01ohpaR4KxtLaSWhz20l05utHUXqDiv30BZnJWkrNM7TiH5lgRslPwDSX8OarkujRy46iM1TH9WY4VvHZPuFwr3uuTWFr0nvCKuZ8krOaEDl6g3CryLMwS46YkL+WcodjCwKyW2fWB7b8bhXQMcOXzlU/5ha6WwGwBrUlqJut5ilucMhqH1Jdd9NDW24QNXBXPfoLZg77Khf8lat2Mnqel2NL9kutnWRiRYv18YMMrtvD90jFyPVCZpEx/5UEShzcSLDLiSli3zz4uGawueII6TDBNaFPs/BhGnZ8jSYF8hwWATbWtxki/sxUnjcIlDilkH2LC12jjlgD1JxaW8yc6m88vO2uJG07c//l0rh+D94i7c5eVKuxyoGF7B3n+I/oBWG5rV4ahwE1oIwvKtvWZc7MdleAtaeC9YNYPtyKLu3kez/J2Vw1Br7nD4O+ER1sTgXupgO5CVk2dBAQPIG0gJ/eXSxptgJ9DHdKOZCA19XIeVMJ1B4WSHQGtM3WOxgmUF5f+Z3C9JsCmOic0FQKlDy2f7yoS3+JHxfFcj0ds7eN8qZ4qm5x5ztPLhQz5pmgcWcNhPIb5FRiB4KY3zMntNIPL/BJ3OLTdp5c22xgGZZW63pkh0ayB4tHgzLNI1mNy63PHqSVW/DH2oXpoUNAG51Gtf2Spdm77CG4yBOMeQ4Ljhsu4AuabXulYvhXEriTt/H86yj+2AvqlJ1WSmXrikDqTGyZiOhHSigjRTWJixIdjy2r2MAyMazL9Loukcq5hny9eWC+Pe+OJjoMEal3YC/W8MtQ4a0WyTUn6uIulANf/YkoZtEvXeLOGv8bGEGrm/OQn5M53oz+DUOWRyfIxIoL91JFAsaqrlMcm5xe86wQtBNPovpJQqsypT8WWmLlURIrx0FI2nbm49eSSEDl5GSyp9NyrkPWl4TaIztyoQXhGoakigSRSUGmOLS2hSXJ3nhl3eq6rKbPgAIKl3PCULa9iMKE/7tevTOTi6DfRyyPak4q72y3TZUcMkJ5g3IqMY1Bc/fN/784m7IHTAr5OCwCbIpqDwskOgNab9rlPF+Ikx/Gi5iWflOKw0T/WccaqOY54vzgzkOekimiDN4kedjNQBnon6LI69jp9Ea7z/OYJwxDs1M+IoTkVdgvDc2OlFBGUQZvErJs6CDnOVeva8VCbQgezlpAwW+gOxk9T8W/q3t/5mSI3xdNQg6YFO9wWATYgTeshXw518axczJE4YWoIWlcP4lvEfhn9s8GV+Pv9SQaq/J20Clj1S2jZk51uR5eAom9mBB30iiQwf199BNgjzxVN7b9k6kXqhIQfjkZouAGhtq1MJlreNqmsFWe44Juw04v91YIWodtU1ikT/9BN/xYdZWzWUisfKUJXMfV9n77FH9si3VKwL/rJquR3az5aJbvxWekkXPKmjHhHnxcM7vkQYaxMxWpDdt5O2iav+RwtKArp/ogjuR6OntzB/lRjOzVvhSjaCLu7Um5I7FE2Rdwi024s9wxYIghnydl/tOz+o/c8fJ6CZELLTH8pgmbD1LEo3jtbcxQzL9eutmBNGvVghF/ZipPlM6aUNT92d8rJbz7RSB1JmfEK2YfSfy/SSQg/HIyWd0DQ23UGMK7PB9uRRf4crORoIVjvGmvH2jUPqS67ruGtgHK0EwItWkUrJTKywmAyZhUw9hzmjc4ZCb+xcAtusrC3qnXeL4NOz4ED2ctIO65UOWw6jd7spBF8wqxNsu0JWBiAZwHNxIs++hrkwwTKC+hzBzrVC7lN0tTj9KKohs6CBthIjrYnArBNsJEdK0lFJ96I9Pp90ydBr4h9ueZaMXtz1+GgDYnjHf3BdYb61qcME0rR9FS3OCNX557/cI07Pgkd3hYPc0Y6oZ7pnxEFdWqTOGXnVppiZkAAAAAAAAAAOxk9CEzxpbxtXxVacFrEXHBx5JvRn+Ir2VNlv4PPi6XFfk21ajEDhm4pyxSqfGulalRfaoh2xncWNJxBPoY7pRZGKFI8q2HgFzdFina9lfEgnTBUWT7bPrR+xPbxuBW8n1v2RDPYJ9qtj84vdmpqk09n+f69SbAA3S7xwaHFJne32MHNLa4Uio60+0DzQrCb/reryCDwCPUwA1CI07K4buFOMuoXNdulsQCJQ5uJFjrR7w0EwJqXQWv16cfEUJypJeN94TMP2LjuW38HqFEx4Ehss85FZbIrjGOTo2VCRbzzpVWzD6S5WM4WlCb3X0QRzWBKaC156+j5vOH42NwK3ngdV1WU+lAAXvpA6X/+fQSErU8LJDoDHUzB/MVhX7E24+vuGoMYdMe2eXdgYYhOVJ3+KrSn9Yi4iW9qBQ1eHH+dXEXSo+h8MoTf+xgmF1lYTBEnsGdvH/npUDU3UH0zyzcIGrgrnrpFluRHNDi2lWosjBfkPlHEx00S/nsvVLGt10XxmXSQz7QGCJP7sBesf2eWemShEtkV5pWjr+kpd0Ho8YOaHFtpFR+LLTE16IkVoexdjBMoLy+QTrupjLzNn2ZFeNrvGdmO0DwPuo6Rl9pHC0ow+CwCK1OaCoFSh5bsQXFt2EoW9BE4b+NGltcKRXywGF6wwFMdLf16PHRHMNZY8tMSz+nRe+dGoRGnInfa+M2MIJLK/s91fR09uYO76L1jGuD+y1OGEZ25F8K3zQRIHgfdR0jobq9Ypszgap+0a4dd1MZ9xuw/tHIDaMumoRVCQg/koJRcCmsAWNVV6cOp8lpRVGDHQSOZWgmBNS6ChH2UfiIKrdJ133JbvZ5PYrvJ5n1KwQtzUju8LB6hzDJIvGi7Q1Uc5JhQvHTL9CXx0pnTShq8OLhgP18yXSMvtJxfnBnr09JmpOCkKns0duziOOykzRN0XInNBWMJQ+j1g"
  );
  var sigma, N, h;
  function get8(x, i) {
    return x[i >> 2] >> ((i & 3) << 3) & 255;
  }
  function add512(x, y) {
    var CF = 0, w0, w1;
    for (var i = 0; i < 16; i++) {
      w0 = (x[i] & 65535) + (y[i] & 65535) + (CF || 0);
      w1 = (x[i] >>> 16) + (y[i] >>> 16) + (w0 >>> 16);
      x[i] = w0 & 65535 | w1 << 16;
      CF = w1 >>> 16;
    }
  }
  function get512(d) {
    return new Int32Array(d.buffer, d.byteOffset, 16);
  }
  function copy512(r2, d) {
    for (var i = 0; i < 16; i++)
      r2[i] = d[i];
  }
  function new512() {
    return new Int32Array(16);
  }
  function xor512(x, y) {
    for (var i = 0; i < 16; i++)
      x[i] = x[i] ^ y[i];
  }
  var r = new512();
  function XLPS(x, y) {
    copy512(r, x);
    xor512(r, y);
    for (var i = 0; i < 8; i++) {
      var z0, z1, k = get8(r, i) << 1;
      z0 = Ax[k];
      z1 = Ax[k + 1];
      for (var j = 1; j < 8; j++) {
        k = (j << 9) + (get8(r, (j << 3) + i) << 1);
        z0 = z0 ^ Ax[k];
        z1 = z1 ^ Ax[k + 1];
      }
      x[i << 1] = z0;
      x[(i << 1) + 1] = z1;
    }
  }
  var data = new512(), Ki = new512();
  function g(h2, N2, m) {
    var i;
    copy512(data, h2);
    XLPS(data, N2);
    copy512(Ki, data);
    XLPS(data, m);
    for (i = 0; i < 11; i++) {
      XLPS(Ki, C3[i]);
      XLPS(data, Ki);
    }
    XLPS(Ki, C3[11]);
    xor512(data, Ki);
    xor512(h2, data);
    xor512(h2, m);
  }
  function stage2(d) {
    var m = get512(d);
    g(h, N, m);
    add512(N, buffer512);
    add512(sigma, m);
  }
  function stage3(d) {
    var n = d.length;
    if (n > 63)
      return;
    var b0 = new Int32Array(16);
    b0[0] = n << 3;
    var b = new Uint8Array(64);
    for (var i = 0; i < n; i++)
      b[i] = d[i];
    b[n] = 1;
    var m = get512(b), m0 = get512(b0);
    g(h, N, m);
    add512(N, m0);
    add512(sigma, m);
    g(h, buffer0, N);
    g(h, buffer0, sigma);
  }
  return function(data2) {
    sigma = new512();
    N = new512();
    h = new512();
    for (var i = 0; i < 16; i++)
      if (this.bitLength === 256)
        h[i] = 16843009;
    var d = new Uint8Array(buffer2(data2));
    var n = d.length;
    var r2 = n % 64, q = (n - r2) / 64;
    for (var i = 0; i < q; i++)
      stage2.call(this, new Uint8Array(d.buffer, i * 64, 64));
    stage3.call(this, new Uint8Array(d.buffer, q * 64, r2));
    var digest;
    if (this.bitLength === 256) {
      digest = new Int32Array(8);
      for (var i = 0; i < 8; i++)
        digest[i] = h[8 + i];
    } else {
      digest = new Int32Array(16);
      for (var i = 0; i < 16; i++)
        digest[i] = h[i];
    }
    if (this.procreator === "SC" || this.procreator === "VN")
      return swap(digest.buffer);
    else
      return digest.buffer;
  };
})();
var digest94 = (function() {
  var C3, H2, M, Sum;
  function P(d) {
    var K6 = new Uint8Array(32);
    for (var k = 0; k < 8; k++) {
      K6[4 * k] = d[k];
      K6[1 + 4 * k] = d[8 + k];
      K6[2 + 4 * k] = d[16 + k];
      K6[3 + 4 * k] = d[24 + k];
    }
    return K6;
  }
  function A(d) {
    var a = new Uint8Array(8);
    for (var j = 0; j < 8; j++) {
      a[j] = d[j] ^ d[j + 8];
    }
    arraycopy(d, 8, d, 0, 24);
    arraycopy(a, 0, d, 24, 8);
    return d;
  }
  function fw(d) {
    var wS = new Uint16Array(d.buffer, 0, 16);
    var wS15 = wS[0] ^ wS[1] ^ wS[2] ^ wS[3] ^ wS[12] ^ wS[15];
    arraycopy(wS, 1, wS, 0, 15);
    wS[15] = wS15;
  }
  function encrypt(key, s, sOff, d, dOff) {
    var t = new Uint8Array(8);
    arraycopy(d, dOff, t, 0, 8);
    var r = new Uint8Array(this.cipher.encrypt(key, t));
    arraycopy(r, 0, s, sOff, 8);
  }
  function process(d, dOff) {
    var S3 = new Uint8Array(32), U = new Uint8Array(32), V = new Uint8Array(32), W = new Uint8Array(32);
    arraycopy(d, dOff, M, 0, 32);
    arraycopy(H2, 0, U, 0, 32);
    arraycopy(M, 0, V, 0, 32);
    for (var j = 0; j < 32; j++) {
      W[j] = U[j] ^ V[j];
    }
    encrypt.call(this, P(W), S3, 0, H2, 0);
    for (var i = 1; i < 4; i++) {
      var tmpA = A(U);
      for (var j = 0; j < 32; j++) {
        U[j] = tmpA[j] ^ C3[i][j];
      }
      V = A(A(V));
      for (var j = 0; j < 32; j++) {
        W[j] = U[j] ^ V[j];
      }
      encrypt.call(this, P(W), S3, i * 8, H2, i * 8);
    }
    for (var n = 0; n < 12; n++) {
      fw(S3);
    }
    for (var n = 0; n < 32; n++) {
      S3[n] = S3[n] ^ M[n];
    }
    fw(S3);
    for (var n = 0; n < 32; n++) {
      S3[n] = H2[n] ^ S3[n];
    }
    for (var n = 0; n < 61; n++) {
      fw(S3);
    }
    arraycopy(S3, 0, H2, 0, H2.length);
  }
  function summing(d) {
    var carry = 0;
    for (var i = 0; i < Sum.length; i++) {
      var sum = (Sum[i] & 255) + (d[i] & 255) + carry;
      Sum[i] = sum;
      carry = sum >>> 8;
    }
  }
  var C22 = new Uint8Array([
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    0,
    255,
    255,
    0,
    255,
    0,
    0,
    255,
    255,
    0,
    0,
    0,
    255,
    255,
    0,
    255
  ]);
  return function(data) {
    H2 = new Uint8Array(32);
    M = new Uint8Array(32);
    Sum = new Uint8Array(32);
    C3 = new Array(4);
    for (var i = 0; i < 4; i++)
      C3[i] = new Uint8Array(32);
    arraycopy(C22, 0, C3[2], 0, C22.length);
    var d = new Uint8Array(buffer2(data));
    var n = d.length;
    var r = n % 32, q = (n - r) / 32;
    for (var i = 0; i < q; i++) {
      var b = new Uint8Array(d.buffer, i * 32, 32);
      summing.call(this, b);
      process.call(this, b, 0);
    }
    if (r > 0) {
      var b = new Uint8Array(d.buffer, q * 32), c = new Uint8Array(32);
      arraycopy(b, 0, c, 0, r);
      summing.call(this, c);
      process.call(this, c, 0);
    }
    var L = new Uint8Array(32), n8 = n * 8, k = 0;
    while (n8 > 0) {
      L[k++] = n8 & 255;
      n8 = Math.floor(n8 / 256);
    }
    process.call(this, L, 0);
    process.call(this, Sum, 0);
    var h = H2.buffer;
    if (this.procreator === "SC")
      h = swap(h);
    return h;
  };
})();
var digestSHA1 = (function() {
  var state, block = new Uint32Array(80);
  function common(a, e, w, k, f) {
    return f + e + w + k + (a << 5 | a >>> 27) >>> 0;
  }
  function f1(a, b, c, d, e, w) {
    return common(a, e, w, 1518500249, d ^ b & (c ^ d));
  }
  function f2(a, b, c, d, e, w) {
    return common(a, e, w, 1859775393, b ^ c ^ d);
  }
  function f3(a, b, c, d, e, w) {
    return common(a, e, w, 2400959708, b & c | d & (b | c));
  }
  function f4(a, b, c, d, e, w) {
    return common(a, e, w, 3395469782, b ^ c ^ d);
  }
  function cycle(state2, block2) {
    var a = state2[0], b = state2[1], c = state2[2], d = state2[3], e = state2[4];
    var fn = f1;
    for (var i = 0; i < 80; i += 5) {
      if (i === 20) {
        fn = f2;
      } else if (i === 40) {
        fn = f3;
      } else if (i === 60) {
        fn = f4;
      }
      e = fn(a, b, c, d, e, block2[i]);
      b = (b << 30 | b >>> 2) >>> 0;
      d = fn(e, a, b, c, d, block2[i + 1]);
      a = (a << 30 | a >>> 2) >>> 0;
      c = fn(d, e, a, b, c, block2[i + 2]);
      e = (e << 30 | e >>> 2) >>> 0;
      b = fn(c, d, e, a, b, block2[i + 3]);
      d = (d << 30 | d >>> 2) >>> 0;
      a = fn(b, c, d, e, a, block2[i + 4]);
      c = (c << 30 | c >>> 2) >>> 0;
    }
    state2[0] += a;
    state2[1] += b;
    state2[2] += c;
    state2[3] += d;
    state2[4] += e;
  }
  function swap322(b) {
    return (b & 255) << 24 | (b & 65280) << 8 | b >> 8 & 65280 | b >> 24 & 255;
  }
  return function(data) {
    var d = new Uint8Array(buffer2(data)), dlen = d.length;
    var len = dlen + 9;
    if (len % 64) {
      len += 64 - len % 64;
    }
    state = new Uint32Array(5);
    state[0] = 1732584193;
    state[1] = 4023233417;
    state[2] = 2562383102;
    state[3] = 271733878;
    state[4] = 3285377520;
    for (var ofs = 0; ofs < len; ofs += 64) {
      for (var i = 0; i < 64; i++) {
        var b = 0, o = ofs + i;
        if (o < dlen) {
          b = d[o];
        } else if (o === dlen) {
          b = 128;
        } else {
          var x = len - o - 1;
          if (x >= 0 && x < 4) {
            b = dlen << 3 >>> x * 8 & 255;
          }
        }
        if (i % 4 === 0) {
          block[i >> 2] = b << 24;
        } else {
          block[i >> 2] |= b << (3 - i % 4) * 8;
        }
      }
      for (var i = 16; i < 80; i++) {
        var w = block[i - 3] ^ block[i - 8] ^ block[i - 14] ^ block[i - 16];
        block[i] = w << 1 | w >>> 31;
      }
      cycle(state, block);
    }
    for (var i = 0; i < 5; i++)
      state[i] = swap322(state[i]);
    return state.buffer;
  };
})();
function signHMAC(key, data) {
  var b = this.digest === digest94 ? 32 : 64, l = this.bitLength / 8, k = buffer2(key), d = buffer2(data), k0;
  if (k.byteLength === b)
    k0 = new Uint8Array(k);
  else {
    var k0 = new Uint8Array(b);
    if (k.byteLength > b) {
      k0.set(new Uint8Array(this.digest(k)));
    } else {
      k0.set(new Uint8Array(k));
    }
  }
  var s0 = new Uint8Array(b + d.byteLength), s1 = new Uint8Array(b + l);
  for (var i = 0; i < b; i++) {
    s0[i] = k0[i] ^ 54;
    s1[i] = k0[i] ^ 92;
  }
  s0.set(new Uint8Array(d), b);
  s1.set(new Uint8Array(this.digest(s0)), b);
  return this.digest(s1);
}
function verifyHMAC(key, signature, data) {
  var hmac = new Uint8Array(this.sign(key, data)), test = new Uint8Array(signature);
  if (hmac.length !== test.length)
    return false;
  for (var i = 0, n = hmac.length; i < n; i++)
    if (hmac[i] !== test[i])
      return false;
  return true;
}
function generateKey2() {
  return getSeed(this.bitLength).buffer;
}
function deriveBitsPFXKDF(baseKey, length) {
  if (length % 8 > 0)
    throw new DataError2("Length must multiple of 8");
  var u = this.bitLength / 8, v = this.digest === digest94 ? 32 : 64, n = length / 8, r = this.iterations;
  var ID = this.diversifier, D = new Uint8Array(v);
  for (var i = 0; i < v; i++)
    D[i] = ID;
  var S0 = new Uint8Array(buffer2(this.salt)), s = S0.length, slen = v * Math.ceil(s / v), S3 = new Uint8Array(slen);
  for (var i = 0; i < slen; i++)
    S3[i] = S0[i % s];
  var P0 = new Uint8Array(buffer2(baseKey)), p = P0.length, plen = v * Math.ceil(p / v), P = new Uint8Array(plen);
  for (var i = 0; i < plen; i++)
    P[i] = P0[i % p];
  var I = new Uint8Array(slen + plen);
  arraycopy(S3, 0, I, 0, slen);
  arraycopy(P, 0, I, slen, plen);
  var c = Math.ceil(n / u);
  var A = new Uint8Array(c * u);
  for (var i = 0; i < c; i++) {
    var H2 = new Uint8Array(v + slen + plen);
    arraycopy(D, 0, H2, 0, v);
    arraycopy(I, 0, H2, v, slen + plen);
    for (var j = 0; j < r; j++)
      H2 = new Uint8Array(this.digest(H2));
    arraycopy(H2, 0, A, i * u, u);
    var B = new Uint8Array(v);
    for (var j = 0; j < v; j++)
      B[j] = H2[j % u];
    var k = (slen + plen) / v;
    for (j = 0; j < k; j++) {
      var cf = 1, w;
      for (var l = v - 1; l >= 0; --l) {
        w = I[v * j + l] + B[l] + cf;
        cf = w >>> 8;
        I[v * j + l] = w & 255;
      }
    }
  }
  var R = new Uint8Array(n);
  arraycopy(A, 0, R, 0, n);
  return R.buffer;
}
function deriveBitsKDF(baseKey, length) {
  if (length % 8 > 0)
    throw new DataError2("Length must be multiple of 8");
  var rlen = length / 8, label, context = new Uint8Array(buffer2(this.context)), blen = this.bitLength / 8, n = Math.ceil(rlen / blen);
  if (this.label)
    label = new Uint8Array(buffer2(this.label));
  else
    label = new Uint8Array([38, 189, 184, 120]);
  var result = new Uint8Array(rlen);
  for (var i = 0; i < n; i++) {
    var data = new Uint8Array(label.length + context.length + 4);
    data[0] = i + 1;
    data.set(label, 1);
    data[label.length + 1] = 0;
    data.set(context, label.length + 2);
    data[data.length - 2] = length >>> 8;
    data[data.length - 1] = length & 255;
    result.set(new Uint8Array(
      signHMAC.call(this, baseKey, data),
      0,
      i < n - 1 ? blen : rlen - i * blen
    ), i * blen);
  }
  return result.buffer;
}
function deriveBitsPBKDF2(baseKey, length) {
  var diversifier = this.diversifier || 1;
  length = length * diversifier;
  if (length < this.bitLength / 2 || length % 8 > 0)
    throw new DataError2("Length must be more than " + this.bitLength / 2 + " bits and multiple of 8");
  var hLen = this.bitLength / 8, dkLen = length / 8, c = this.iterations, P = new Uint8Array(buffer2(baseKey)), S3 = new Uint8Array(buffer2(this.salt));
  var slen = S3.byteLength, data = new Uint8Array(slen + 4);
  arraycopy(S3, 0, data, 0, slen);
  if (dkLen > (4294967295 - 1) * 32)
    throw new DataError2("Invalid parameters: Length value");
  var n = Math.ceil(dkLen / hLen), DK = new Uint8Array(dkLen);
  for (var i = 1; i <= n; i++) {
    data[slen] = i >>> 24 & 255;
    data[slen + 1] = i >>> 16 & 255;
    data[slen + 2] = i >>> 8 & 255;
    data[slen + 3] = i & 255;
    var U = new Uint8Array(signHMAC.call(this, P, data)), Z = U;
    for (var j = 1; j < c; j++) {
      U = new Uint8Array(signHMAC.call(this, P, U));
      for (var k = 0; k < hLen; k++)
        Z[k] = U[k] ^ Z[k];
    }
    var ofs = (i - 1) * hLen;
    arraycopy(Z, 0, DK, ofs, Math.min(hLen, dkLen - ofs));
  }
  if (diversifier > 1) {
    var rLen = dkLen / diversifier, R = new Uint8Array(rLen);
    arraycopy(DK, dkLen - rLen, R, 0, rLen);
    return R.buffer;
  } else
    return DK.buffer;
}
function deriveBitsCP(baseKey, length) {
  if (length > this.bitLength || length % 8 > 0)
    throw new DataError2("Length can't be more than " + this.bitLength + " bits and multiple of 8");
  var b = this.digest === digest94 ? 32 : 64, l = this.bitLength / 8, p = baseKey && baseKey.byteLength > 0 ? new Uint8Array(buffer2(baseKey)) : false, plen = p ? p.length : 0, iterations = this.iterations, salt = new Uint8Array(buffer2(this.salt)), slen = salt.length, d = new Uint8Array(slen + plen);
  arraycopy(salt, 0, d, 0, slen);
  if (p)
    arraycopy(p, 0, d, slen, plen);
  var h = new Uint8Array(this.digest(d)), k = new Uint8Array(b), s0 = new Uint8Array(b), s1 = new Uint8Array(b);
  var c = "DENEFH028.760246785.IUEFHWUIO.EF";
  for (var i = 0; i < c.length; i++)
    k[i] = c.charCodeAt(i);
  d = new Uint8Array(2 * (b + l));
  for (var j = 0; j < iterations; j++) {
    for (var i = 0; i < b; i++) {
      s0[i] = k[i] ^ 54;
      s1[i] = k[i] ^ 92;
      k[i] = 0;
    }
    arraycopy(s0, 0, d, 0, b);
    arraycopy(h, 0, d, b, l);
    arraycopy(s1, 0, d, b + l, b);
    arraycopy(h, 0, d, b + l + b, l);
    arraycopy(new Uint8Array(this.digest(d)), 0, k, 0, l);
  }
  for (var i = 0; i < l; i++) {
    s0[i] = k[i] ^ 54;
    s1[i] = k[i] ^ 92;
    k[i] = 0;
  }
  d = new Uint8Array(2 * l + slen + plen);
  arraycopy(s0, 0, d, 0, l);
  arraycopy(salt, 0, d, l, slen);
  arraycopy(s1, 0, d, l + slen, l);
  if (p)
    arraycopy(p, 0, d, l + slen + l, plen);
  h = this.digest(this.digest(d));
  if (length === this.bitLength)
    return h;
  else {
    var rlen = length / 8, r = new Uint8Array(rlen);
    arraycopy(h, 0, r, 0, rlen);
    return r.buffer;
  }
}
function deriveKey(baseKey) {
  return this.deriveBits(baseKey, this.keySize * 8);
}
function GostDigest(algorithm) {
  algorithm = algorithm || {};
  this.name = (algorithm.name || "GOST R 34.10") + "-" + (algorithm.version || 2012) % 100 + ((algorithm.version || 2012) > 1 ? "-" + (algorithm.length || 256) : "") + ((algorithm.mode || "HASH") !== "HASH" ? "-" + algorithm.mode : "") + (algorithm.procreator ? "/" + algorithm.procreator : "") + (typeof algorithm.sBox === "string" ? "/" + algorithm.sBox : "");
  this.procreator = algorithm.procreator;
  this.bitLength = algorithm.length || 256;
  switch (algorithm.version || 2012) {
    case 1:
      this.digest = digestSHA1;
      this.bitLength = 160;
      break;
    case 1994:
      this.digest = digest94;
      this.sBox = (algorithm.sBox || (algorithm.procreator === "SC" ? "D-SC" : "D-A")).toUpperCase();
      if (!gostCipher_default)
        throw new NotSupportedError2("Object GostCipher not found");
      this.cipher = new gostCipher_default({
        name: "GOST 28147",
        block: "ECB",
        sBox: this.sBox,
        procreator: this.procreator
      });
      break;
    case 2012:
      this.digest = digest2012;
      break;
    default:
      throw new NotSupportedError2("Algorithm version " + algorithm.version + " not supported");
  }
  this.keySize = algorithm.keySize || (algorithm.version <= 2 ? this.bitLength / 8 : 32);
  switch (algorithm.mode || "HASH") {
    case "HASH":
      break;
    case "HMAC":
      this.sign = signHMAC;
      this.verify = verifyHMAC;
      this.generateKey = generateKey2;
      break;
    case "KDF":
      this.deriveKey = deriveKey;
      this.deriveBits = deriveBitsKDF;
      this.label = algorithm.label;
      this.context = algorithm.context;
      break;
    case "PBKDF2":
      this.deriveKey = deriveKey;
      this.deriveBits = deriveBitsPBKDF2;
      this.generateKey = generateKey2;
      this.salt = algorithm.salt;
      this.iterations = algorithm.iterations || 2e3;
      this.diversifier = algorithm.diversifier || 1;
      break;
    case "PFXKDF":
      this.deriveKey = deriveKey;
      this.deriveBits = deriveBitsPFXKDF;
      this.generateKey = generateKey2;
      this.salt = algorithm.salt;
      this.iterations = algorithm.iterations || 2e3;
      this.diversifier = algorithm.diversifier || 1;
      break;
    case "CPKDF":
      this.deriveKey = deriveKey;
      this.deriveBits = deriveBitsCP;
      this.generateKey = generateKey2;
      this.salt = algorithm.salt;
      this.iterations = algorithm.iterations || 2e3;
      break;
    default:
      throw new NotSupportedError2("Algorithm mode " + algorithm.mode + " not supported");
  }
}
var gostDigest_default = GostDigest;
export {
  crypto_api_default as CryptoApi,
  gostDigest_default as GostDigest
};
