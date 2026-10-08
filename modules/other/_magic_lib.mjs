/*!
 * Portions adapted from GCHQ CyberChef's Magic, Stream,
 * file-type and character-encoding components.
 * Copyright Crown Copyright and respective CyberChef contributors.
 * License: Apache-2.0
 *
 * Also contains gamma and chi-squared components licensed under MIT.
 * Modified and bundled for HexSpindle.
 *
 * Full copyright, Apache-2.0, MIT and attribution notices:
 * /THIRD_PARTY_NOTICES.md
 */

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/gamma/index.js
var require_gamma = __commonJS({
  "node_modules/gamma/index.js"(exports, module) {
    var g = 7;
    var p = [
      0.9999999999998099,
      676.5203681218851,
      -1259.1392167224028,
      771.3234287776531,
      -176.6150291621406,
      12.507343278686905,
      -0.13857109526572012,
      9984369578019572e-21,
      15056327351493116e-23
    ];
    var g_ln = 607 / 128;
    var p_ln = [
      0.9999999999999971,
      57.15623566586292,
      -59.59796035547549,
      14.136097974741746,
      -0.4919138160976202,
      3399464998481189e-20,
      4652362892704858e-20,
      -9837447530487956e-20,
      1580887032249125e-19,
      -21026444172410488e-20,
      21743961811521265e-20,
      -1643181065367639e-19,
      8441822398385275e-20,
      -26190838401581408e-21,
      36899182659531625e-22
    ];
    function lngamma(z) {
      if (z < 0) return Number("0/0");
      var x = p_ln[0];
      for (var i = p_ln.length - 1; i > 0; --i) x += p_ln[i] / (z + i);
      var t = z + g_ln + 0.5;
      return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x) - Math.log(z);
    }
    module.exports = function gamma(z) {
      if (z < 0.5) {
        return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
      } else if (z > 100) return Math.exp(lngamma(z));
      else {
        z -= 1;
        var x = p[0];
        for (var i = 1; i < g + 2; i++) {
          x += p[i] / (z + i);
        }
        var t = z + g + 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
      }
    };
    module.exports.log = lngamma;
  }
});

// chisq/cdf.js
var require_cdf = __commonJS({
  "chisq/cdf.js"(exports, module) {
    var LogGamma = require_gamma().log;
    function Gcf(X, A) {
      {
        var A0 = 0;
        var B0 = 1;
        var A1 = 1;
        var B1 = X;
        var AOLD = 0;
        var N = 0;
        while (Math.abs((A1 - AOLD) / A1) > 1e-5) {
          AOLD = A1;
          N = N + 1;
          A0 = A1 + (N - A) * A0;
          B0 = B1 + (N - A) * B0;
          A1 = X * A0 + N * A1;
          B1 = X * B0 + N * B1;
          A0 = A0 / B1;
          B0 = B0 / B1;
          A1 = A1 / B1;
          B1 = 1;
        }
        var Prob = Math.exp(A * Math.log(X) - X - LogGamma(A)) * A1;
      }
      return 1 - Prob;
    }
    function Gser(X, A) {
      {
        var T9 = 1 / A;
        var G = T9;
        var I = 1;
        while (T9 > G * 1e-5) {
          T9 = T9 * X / (A + I);
          G = G + T9;
          I = I + 1;
        }
        G = G * Math.exp(A * Math.log(X) - X - LogGamma(A));
      }
      return G;
    }
    function Gammacdf(x, a) {
      var GI;
      if (x <= 0) {
        GI = 0;
      } else if (x < a + 1) {
        GI = Gser(x, a);
      } else {
        GI = Gcf(x, a);
      }
      return GI;
    }
    module.exports = function(Z, DF) {
      if (DF <= 0) {
        throw new Error("Degrees of freedom must be positive");
      }
      return Gammacdf(Z / 2, DF / 2);
    };
  }
});

// chisq/index.js
var require_chisq = __commonJS({
  "chisq/index.js"(exports) {
    var gamma = require_gamma();
    exports.pdf = function(x, k_) {
      if (x < 0) return 0;
      var k = k_ / 2;
      return 1 / (Math.pow(2, k) * gamma(k)) * Math.pow(x, k - 1) * Math.exp(-x / 2);
    };
    exports.cdf = require_cdf();
  }
});

// magic_opconfig.json
var magic_opconfig_default = { "A1Z26 Cipher Decode": { checks: [{ pattern: "^\\s*((?:0?[1-9]|1[0-9]|2[0-6]) )+(?:0?[1-9]|1[0-9]|2[0-6])\\s*$", flags: "", args: ["Space"] }, { pattern: "^\\s*((?:0?[1-9]|1[0-9]|2[0-6]),)+(?:0?[1-9]|1[0-9]|2[0-6])\\s*$", flags: "", args: ["Comma"] }, { pattern: "^\\s*((?:0?[1-9]|1[0-9]|2[0-6]);)+(?:0?[1-9]|1[0-9]|2[0-6])\\s*$", flags: "", args: ["Semi-colon"] }, { pattern: "^\\s*((?:0?[1-9]|1[0-9]|2[0-6]):)+(?:0?[1-9]|1[0-9]|2[0-6])\\s*$", flags: "", args: ["Colon"] }, { pattern: "^\\s*((?:0?[1-9]|1[0-9]|2[0-6])\\n)+(?:0?[1-9]|1[0-9]|2[0-6])\\s*$", flags: "", args: ["Line feed"] }, { pattern: "^\\s*((?:0?[1-9]|1[0-9]|2[0-6])\\r\\n)+(?:0?[1-9]|1[0-9]|2[0-6])\\s*$", flags: "", args: ["CRLF"] }] }, "Bacon Cipher Decode": { checks: [{ pattern: "^\\s*([01]{5}\\s?)+$", flags: "", args: ["Standard (I=J and U=V)", "0/1", false] }, { pattern: "^\\s*([01]{5}\\s?)+$", flags: "", args: ["Standard (I=J and U=V)", "0/1", true] }, { pattern: "^\\s*([AB]{5}\\s?)+$", flags: "", args: ["Standard (I=J and U=V)", "A/B", false] }, { pattern: "^\\s*([AB]{5}\\s?)+$", flags: "", args: ["Standard (I=J and U=V)", "A/B", true] }, { pattern: "^\\s*([01]{5}\\s?)+$", flags: "", args: ["Complete", "0/1", false] }, { pattern: "^\\s*([01]{5}\\s?)+$", flags: "", args: ["Complete", "0/1", true] }, { pattern: "^\\s*([AB]{5}\\s?)+$", flags: "", args: ["Complete", "A/B", false] }, { pattern: "^\\s*([AB]{5}\\s?)+$", flags: "", args: ["Complete", "A/B", true] }] }, "Bzip2 Decompress": { checks: [{ pattern: "^\\x42\\x5a\\x68", flags: "", args: [] }] }, "Cetacean Cipher Decode": { checks: [{ pattern: "^(?:[eE]{16,})(?: [eE]{16,})*$", flags: "", args: [] }] }, "Dechunk HTTP response": { checks: [{ pattern: "^[0-9A-F]+\r\n", flags: "i", args: [] }] }, "Decode NetBIOS Name": { checks: [{ pattern: "^\\s*\\S{32}$", flags: "", args: [65] }] }, "Defang IP Addresses": { checks: [{ pattern: "^\\s*(([0-9]{1,3}\\.){3}[0-9]{1,3}|([0-9a-f]{4}:){7}[0-9a-f]{4})\\s*$", flags: "i", args: [], output: { pattern: "^\\s*(([0-9]{1,3}\\[\\.\\]){3}[0-9]{1,3}|([0-9a-f]{4}\\[\\:\\]){7}[0-9a-f]{4})\\s*$", flags: "i" } }] }, "From BCD": { checks: [{ pattern: "^(?:\\d{4} ){3,}\\d{4}$", flags: "", args: ["8 4 2 1", true, false, "Nibbles"] }] }, "From Base32": { checks: [{ pattern: "^(?:[A-Z2-7]{8})+(?:[A-Z2-7]{2}={6}|[A-Z2-7]{4}={4}|[A-Z2-7]{5}={3}|[A-Z2-7]{7}={1})?$", flags: "", args: ["A-Z2-7=", false] }, { pattern: "^(?:[0-9A-V]{8})+(?:[0-9A-V]{2}={6}|[0-9A-V]{4}={4}|[0-9A-V]{5}={3}|[0-9A-V]{7}={1})?$", flags: "", args: ["0-9A-V=", false] }] }, "From Base58": { checks: [{ pattern: "^[1-9A-HJ-NP-Za-km-z]{20,}$", flags: "", args: ["123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", false] }, { pattern: "^[1-9A-HJ-NP-Za-km-z]{20,}$", flags: "", args: ["rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz", false] }] }, "From Base64": { checks: [{ pattern: "^\\s*(?:[A-Z\\d+/]{4})+(?:[A-Z\\d+/]{2}==|[A-Z\\d+/]{3}=)?\\s*$", flags: "i", args: ["A-Za-z0-9+/=", true, false] }, { pattern: "^\\s*[A-Z\\d\\-_]{20,}\\s*$", flags: "i", args: ["A-Za-z0-9-_", true, false] }, { pattern: "^\\s*(?:[A-Z\\d+\\-]{4}){5,}(?:[A-Z\\d+\\-]{2}==|[A-Z\\d+\\-]{3}=)?\\s*$", flags: "i", args: ["A-Za-z0-9+\\-=", true, false] }, { pattern: "^\\s*(?:[A-Z\\d./]{4}){5,}(?:[A-Z\\d./]{2}==|[A-Z\\d./]{3}=)?\\s*$", flags: "i", args: ["./0-9A-Za-z=", true, false] }, { pattern: "^\\s*[A-Z\\d_.]{20,}\\s*$", flags: "i", args: ["A-Za-z0-9_.", true, false] }, { pattern: "^\\s*(?:[A-Z\\d._]{4}){5,}(?:[A-Z\\d._]{2}--|[A-Z\\d._]{3}-)?\\s*$", flags: "i", args: ["A-Za-z0-9._-", true, false] }, { pattern: "^\\s*(?:[A-Z\\d+/]{4}){5,}(?:[A-Z\\d+/]{2}==|[A-Z\\d+/]{3}=)?\\s*$", flags: "i", args: ["0-9a-zA-Z+/=", true, false] }, { pattern: "^\\s*(?:[A-Z\\d+/]{4}){5,}(?:[A-Z\\d+/]{2}==|[A-Z\\d+/]{3}=)?\\s*$", flags: "i", args: ["0-9A-Za-z+/=", true, false] }, { pattern: `^[ !"#$%&'()*+,\\-./\\d:;<=>?@A-Z[\\\\\\]^_]{20,}$`, flags: "", args: [" -_", false, false] }, { pattern: "^\\s*[A-Z\\d+\\-]{20,}\\s*$", flags: "i", args: ["+\\-0-9A-Za-z", true, false] }, { pattern: "^\\s*[!\"#$%&'()*+,\\-0-689@A-NP-VX-Z[`a-fh-mp-r]{20,}\\s*$", flags: "", args: ["!-,-0-689@A-NP-VX-Z[`a-fh-mp-r", true, false] }, { pattern: "^\\s*(?:[N-ZA-M\\d+/]{4}){5,}(?:[N-ZA-M\\d+/]{2}==|[N-ZA-M\\d+/]{3}=)?\\s*$", flags: "i", args: ["N-ZA-Mn-za-m0-9+/=", true, false] }, { pattern: "^\\s*[A-Z\\d./]{20,}\\s*$", flags: "i", args: ["./0-9A-Za-z", true, false] }, { pattern: "^\\s*(?:[A-Z=\\d\\+/]{4}){5,}(?:[A-Z=\\d\\+/]{2}CC|[A-Z=\\d\\+/]{3}C)?\\s*$", flags: "i", args: ["/128GhIoPQROSTeUbADfgHijKLM+n0pFWXY456xyzB7=39VaqrstJklmNuZvwcdEC", true, false] }, { pattern: "^\\s*(?:[A-Z=\\d\\+/]{4}){5,}(?:[A-Z=\\d\\+/]{2}55|[A-Z=\\d\\+/]{3}5)?\\s*$", flags: "i", args: ["3GHIJKLMNOPQRSTUb=cdefghijklmnopWXYZ/12+406789VaqrstuvwxyzABCDEF5", true, false] }, { pattern: "^\\s*(?:[A-Z=\\d\\+/]{4}){5,}(?:[A-Z=\\d\\+/]{2}22|[A-Z=\\d\\+/]{3}2)?\\s*$", flags: "i", args: ["ZKj9n+yf0wDVX1s/5YbdxSo=ILaUpPBCHg8uvNO4klm6iJGhQ7eFrWczAMEq3RTt2", true, false] }, { pattern: "^\\s*(?:[A-Z=\\d\\+/]{4}){5,}(?:[A-Z=\\d\\+/]{2}55|[A-Z=\\d\\+/]{3}5)?\\s*$", flags: "i", args: ["HNO4klm6ij9n+J2hyf0gzA8uvwDEq3X1Q7ZKeFrWcVTts/MRGYbdxSo=ILaUpPBC5", true, false] }] }, "From Base85": { checks: [{ pattern: "^\\s*(?:<~)?[\\s!-uz]*[!-uz]{15}[\\s!-uz]*(?:~>)?\\s*$", args: ["!-u"] }, { pattern: "^[\\s0-9a-zA-Z.\\-:+=^!/*?&<>()[\\]{}@%$#]*[0-9a-zA-Z.\\-:+=^!/*?&<>()[\\]{}@%$#]{15}[\\s0-9a-zA-Z.\\-:+=^!/*?&<>()[\\]{}@%$#]*$", args: ["0-9a-zA-Z.\\-:+=^!/*?&<>()[]{}@%$#"] }, { pattern: "^[\\s0-9A-Za-z!#$%&()*+\\-;<=>?@^_`{|}~]*[0-9A-Za-z!#$%&()*+\\-;<=>?@^_`{|}~]{15}[\\s0-9A-Za-z!#$%&()*+\\-;<=>?@^_`{|}~]*$", args: ["0-9A-Za-z!#$%&()*+\\-;<=>?@^_`{|}~"] }] }, "From Bech32": { checks: [{ pattern: "^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,87}$", flags: "i", args: ["Auto-detect", "Hex"] }, { pattern: "^tb1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,87}$", flags: "i", args: ["Auto-detect", "Hex"] }, { pattern: "^age1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,87}$", flags: "i", args: ["Auto-detect", "HRP: Hex"] }, { pattern: "^AGE-SECRET-KEY-1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{6,87}$", flags: "", args: ["Auto-detect", "HRP: Hex"] }, { pattern: "^ltc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,87}$", flags: "i", args: ["Auto-detect", "Hex"] }, { pattern: "^[a-z]{1,83}1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,}$", flags: "i", args: ["Auto-detect", "Hex"] }] }, "From Binary": { checks: [{ pattern: "^(?:[01]{8})+$", flags: "", args: ["None"] }, { pattern: "^(?:[01]{8})(?: [01]{8})*$", flags: "", args: ["Space"] }, { pattern: "^(?:[01]{8})(?:,[01]{8})*$", flags: "", args: ["Comma"] }, { pattern: "^(?:[01]{8})(?:;[01]{8})*$", flags: "", args: ["Semi-colon"] }, { pattern: "^(?:[01]{8})(?::[01]{8})*$", flags: "", args: ["Colon"] }, { pattern: "^(?:[01]{8})(?:\\n[01]{8})*$", flags: "", args: ["Line feed"] }, { pattern: "^(?:[01]{8})(?:\\r\\n[01]{8})*$", flags: "", args: ["CRLF"] }] }, "From Decimal": { checks: [{ pattern: "^(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5])(?: (?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5]))*$", flags: "", args: ["Space", false] }, { pattern: "^(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5])(?:,(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5]))*$", flags: "", args: ["Comma", false] }, { pattern: "^(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5])(?:;(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5]))*$", flags: "", args: ["Semi-colon", false] }, { pattern: "^(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5])(?::(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5]))*$", flags: "", args: ["Colon", false] }, { pattern: "^(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5])(?:\\n(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5]))*$", flags: "", args: ["Line feed", false] }, { pattern: "^(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5])(?:\\r\\n(?:\\d{1,2}|1\\d{2}|2[0-4]\\d|25[0-5]))*$", flags: "", args: ["CRLF", false] }] }, "From HTML Entity": { checks: [{ pattern: "&(?:#\\d{2,3}|#x[\\da-f]{2}|[a-z]{2,6});", flags: "i", args: [] }] }, "From Hex": { checks: [{ pattern: "^(?:[\\dA-F]{2})+$", flags: "i", args: ["None"] }, { pattern: "^[\\dA-F]{2}(?: [\\dA-F]{2})*$", flags: "i", args: ["Space"] }, { pattern: "^[\\dA-F]{2}(?:,[\\dA-F]{2})*$", flags: "i", args: ["Comma"] }, { pattern: "^[\\dA-F]{2}(?:;[\\dA-F]{2})*$", flags: "i", args: ["Semi-colon"] }, { pattern: "^[\\dA-F]{2}(?::[\\dA-F]{2})*$", flags: "i", args: ["Colon"] }, { pattern: "^[\\dA-F]{2}(?:\\n[\\dA-F]{2})*$", flags: "i", args: ["Line feed"] }, { pattern: "^[\\dA-F]{2}(?:\\r\\n[\\dA-F]{2})*$", flags: "i", args: ["CRLF"] }, { pattern: "^(?:0x[\\dA-F]{2})+$", flags: "i", args: ["0x"] }, { pattern: "^0x[\\dA-F]{2}(?:,0x[\\dA-F]{2})*$", flags: "i", args: ["0x with comma"] }, { pattern: "^(?:\\\\x[\\dA-F]{2})+$", flags: "i", args: ["\\x"] }] }, "From Hex Content": { checks: [{ pattern: "\\|([\\da-f]{2} ?)+\\|", flags: "i", args: [] }] }, "From Hexdump": { checks: [{ pattern: "^(?:(?:[\\dA-F]{4,16}h?:?)?[ \\t]*((?:[\\dA-F]{2} ){1,8}(?:[ \\t]|[\\dA-F]{2}-)(?:[\\dA-F]{2} ){1,8}|(?:[\\dA-F]{4} )*[\\dA-F]{4}|(?:[\\dA-F]{2} )*[\\dA-F]{2})[^\\n]*\\n?){2,}$", flags: "i", args: [] }] }, "From Modhex": { checks: [{ pattern: "^(?:[cbdefghijklnrtuv]{2})+$", flags: "i", args: ["None"] }, { pattern: "^[cbdefghijklnrtuv]{2}(?: [cbdefghijklnrtuv]{2})*$", flags: "i", args: ["Space"] }, { pattern: "^[cbdefghijklnrtuv]{2}(?:,[cbdefghijklnrtuv]{2})*$", flags: "i", args: ["Comma"] }, { pattern: "^[cbdefghijklnrtuv]{2}(?:;[cbdefghijklnrtuv]{2})*$", flags: "i", args: ["Semi-colon"] }, { pattern: "^[cbdefghijklnrtuv]{2}(?::[cbdefghijklnrtuv]{2})*$", flags: "i", args: ["Colon"] }, { pattern: "^[cbdefghijklnrtuv]{2}(?:\\n[cbdefghijklnrtuv]{2})*$", flags: "i", args: ["Line feed"] }, { pattern: "^[cbdefghijklnrtuv]{2}(?:\\r\\n[cbdefghijklnrtuv]{2})*$", flags: "i", args: ["CRLF"] }] }, "From Morse Code": { checks: [{ pattern: "(?:^[-. \\n]{5,}$|^[_. \\n]{5,}$|^(?:dash|dot| |\\n){5,}$)", flags: "i", args: ["Space", "Line feed"] }] }, "From Octal": { checks: [{ pattern: "^(?:[0-7]{1,2}|[123][0-7]{2})(?: (?:[0-7]{1,2}|[123][0-7]{2}))*$", flags: "", args: ["Space"] }, { pattern: "^(?:[0-7]{1,2}|[123][0-7]{2})(?:,(?:[0-7]{1,2}|[123][0-7]{2}))*$", flags: "", args: ["Comma"] }, { pattern: "^(?:[0-7]{1,2}|[123][0-7]{2})(?:;(?:[0-7]{1,2}|[123][0-7]{2}))*$", flags: "", args: ["Semi-colon"] }, { pattern: "^(?:[0-7]{1,2}|[123][0-7]{2})(?::(?:[0-7]{1,2}|[123][0-7]{2}))*$", flags: "", args: ["Colon"] }, { pattern: "^(?:[0-7]{1,2}|[123][0-7]{2})(?:\\n(?:[0-7]{1,2}|[123][0-7]{2}))*$", flags: "", args: ["Line feed"] }, { pattern: "^(?:[0-7]{1,2}|[123][0-7]{2})(?:\\r\\n(?:[0-7]{1,2}|[123][0-7]{2}))*$", flags: "", args: ["CRLF"] }] }, "From Quoted Printable": { checks: [{ pattern: "^[\\x21-\\x3d\\x3f-\\x7e \\t]{0,76}(?:=[\\da-f]{2}|=\\r?\\n)(?:[\\x21-\\x3d\\x3f-\\x7e \\t]|=[\\da-f]{2}|=\\r?\\n)*$", flags: "i", args: [] }] }, "From UNIX Timestamp": { checks: [{ pattern: "^1?\\d{9}$", flags: "", args: ["Seconds (s)"] }, { pattern: "^1?\\d{12}$", flags: "", args: ["Milliseconds (ms)"] }, { pattern: "^1?\\d{15}$", flags: "", args: ["Microseconds (\u03BCs)"] }, { pattern: "^1?\\d{18}$", flags: "", args: ["Nanoseconds (ns)"] }] }, Gunzip: { checks: [{ pattern: "^\\x1f\\x8b\\x08", flags: "", args: [] }] }, "JWK to PEM": { checks: [{ pattern: '"kty":\\s*"(EC|RSA)"', flags: "gm", args: [] }] }, "JWT Decode": { checks: [{ pattern: "^ey([A-Za-z0-9_-]+)\\.ey([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)$", flags: "", args: [] }] }, "Microsoft Script Decoder": { checks: [{ pattern: "#@~\\^.{6}==(.+).{6}==\\^#~@", flags: "i", args: [] }] }, "PEM to Hex": { checks: [{ pattern: "----BEGIN ([A-Z][A-Z ]+[A-Z])-----", args: [] }] }, "PEM to JWK": { checks: [{ pattern: "-----BEGIN ((RSA |EC )?(PRIVATE|PUBLIC) KEY|CERTIFICATE)-----", args: [] }] }, "Parse CSR": { checks: [{ pattern: "^-+BEGIN CERTIFICATE REQUEST-+\\r?\\n[\\da-z+/\\n\\r]+-+END CERTIFICATE REQUEST-+\\r?\\n?$", flags: "i", args: ["PEM"] }] }, "Parse SSH Host Key": { checks: [{ pattern: "^\\s*([A-F\\d]{2}[,;:]){15,}[A-F\\d]{2}\\s*$", flags: "i", args: ["Hex"] }] }, "Parse UNIX file permissions": { checks: [{ pattern: "^\\s*d[rxw-]{9}\\s*$", flags: "", args: [] }] }, "Parse User Agent": { checks: [{ pattern: "^(User-Agent:|Mozilla\\/)[^\\n\\r]+\\s*$", flags: "i", args: [] }] }, "Parse X.509 CRL": { checks: [{ pattern: "^-+BEGIN X509 CRL-+\\r?\\n[\\da-z+/\\n\\r]+-+END X509 CRL-+\\r?\\n?$", flags: "i", args: ["PEM"] }] }, "Parse X.509 certificate": { checks: [{ pattern: "^-+BEGIN CERTIFICATE-+\\r?\\n[\\da-z+/\\n\\r]+-+END CERTIFICATE-+\\r?\\n?$", flags: "i", args: ["PEM"] }] }, "Public Key from Certificate": { checks: [] }, "Public Key from Private Key": { checks: [] }, "Raw Inflate": { checks: [{ entropyRange: [7.5, 8], args: [0, 0, ["Adaptive", "Block"], false, false] }] }, "Render Image": { checks: [{ pattern: "^(?:\\xff\\xd8\\xff|\\x89\\x50\\x4e\\x47|\\x47\\x49\\x46|.{8}\\x57\\x45\\x42\\x50|\\x42\\x4d)", flags: "", args: ["Raw"], useful: true, output: { mime: "image" } }] }, "Render PDF": { checks: [{ pattern: "^%PDF-", flags: "", args: ["Raw"], useful: true, output: { mime: "application/pdf" } }] }, "Strip HTML tags": { checks: [{ pattern: "(</html>|</div>|</body>)", flags: "i", args: [true, true] }] }, "Strip HTTP headers": { checks: [{ pattern: "^HTTP(.|\\s)+?(\\r?\\n){2}", flags: "", args: [] }] }, "URL Decode": { checks: [{ pattern: ".*(?:%[\\da-f]{2}.*){4}", flags: "i", args: [] }] }, "Unescape Unicode Characters": { checks: [{ pattern: "\\\\u(?:[\\da-f]{4,6})", flags: "i", args: ["\\u"] }, { pattern: "%u(?:[\\da-f]{4,6})", flags: "i", args: ["%u"] }, { pattern: "U\\+(?:[\\da-f]{4,6})", flags: "i", args: ["U+"] }] }, Untar: { checks: [{ pattern: "^.{257}\\x75\\x73\\x74\\x61\\x72", flags: "", args: [] }] }, Unzip: { checks: [{ pattern: "^\\x50\\x4b(?:\\x03|\\x05|\\x07)(?:\\x04|\\x06|\\x08)", flags: "", args: ["", false] }] }, "Zlib Inflate": { checks: [{ pattern: "^\\x78(\\x01|\\x9c|\\xda|\\x5e)", flags: "", args: [0, 0, "Adaptive", false, false] }] }, "Encode text": { args: [{ value: ["UTF-8 (65001)", "UTF-7 (65000)", "UTF-16LE (1200)", "UTF-16BE (1201)", "UTF-32LE (12000)", "UTF-32BE (12001)", "IBM EBCDIC International (500)", "IBM EBCDIC US-Canada (37)", "IBM EBCDIC Multilingual/ROECE (Latin 2) (870)", "IBM EBCDIC Greek Modern (875)", "IBM EBCDIC French (1010)", "IBM EBCDIC Turkish (Latin 5) (1026)", "IBM EBCDIC Latin 1/Open System (1047)", "IBM EBCDIC Lao (1132/1133/1341)", "IBM EBCDIC US-Canada (037 + Euro symbol) (1140)", "IBM EBCDIC Germany (20273 + Euro symbol) (1141)", "IBM EBCDIC Denmark-Norway (20277 + Euro symbol) (1142)", "IBM EBCDIC Finland-Sweden (20278 + Euro symbol) (1143)", "IBM EBCDIC Italy (20280 + Euro symbol) (1144)", "IBM EBCDIC Latin America-Spain (20284 + Euro symbol) (1145)", "IBM EBCDIC United Kingdom (20285 + Euro symbol) (1146)", "IBM EBCDIC France (20297 + Euro symbol) (1147)", "IBM EBCDIC International (500 + Euro symbol) (1148)", "IBM EBCDIC Icelandic (20871 + Euro symbol) (1149)", "IBM EBCDIC Germany (20273)", "IBM EBCDIC Denmark-Norway (20277)", "IBM EBCDIC Finland-Sweden (20278)", "IBM EBCDIC Italy (20280)", "IBM EBCDIC Latin America-Spain (20284)", "IBM EBCDIC United Kingdom (20285)", "IBM EBCDIC Japanese Katakana Extended (20290)", "IBM EBCDIC France (20297)", "IBM EBCDIC Arabic (20420)", "IBM EBCDIC Greek (20423)", "IBM EBCDIC Hebrew (20424)", "IBM EBCDIC Korean Extended (20833)", "IBM EBCDIC Thai (20838)", "IBM EBCDIC Icelandic (20871)", "IBM EBCDIC Cyrillic Russian (20880)", "IBM EBCDIC Turkish (20905)", "IBM EBCDIC Latin 1/Open System (1047 + Euro symbol) (20924)", "IBM EBCDIC Cyrillic Serbian-Bulgarian (21025)", "OEM United States (437)", "OEM Greek (formerly 437G); Greek (DOS) (737)", "OEM Baltic; Baltic (DOS) (775)", "OEM Russian; Cyrillic + Euro symbol (808)", "OEM Multilingual Latin 1; Western European (DOS) (850)", "OEM Latin 2; Central European (DOS) (852)", "OEM Cyrillic (primarily Russian) (855)", "OEM Turkish; Turkish (DOS) (857)", "OEM Multilingual Latin 1 + Euro symbol (858)", "OEM Portuguese; Portuguese (DOS) (860)", "OEM Icelandic; Icelandic (DOS) (861)", "OEM Hebrew; Hebrew (DOS) (862)", "OEM French Canadian; French Canadian (DOS) (863)", "OEM Arabic; Arabic (864) (864)", "OEM Nordic; Nordic (DOS) (865)", "OEM Russian; Cyrillic (DOS) (866)", "OEM Modern Greek; Greek, Modern (DOS) (869)", "OEM Cyrillic (primarily Russian) + Euro Symbol (872)", "Windows-874 Thai (874)", "Windows-1250 Central European (1250)", "Windows-1251 Cyrillic (1251)", "Windows-1252 Latin (1252)", "Windows-1253 Greek (1253)", "Windows-1254 Turkish (1254)", "Windows-1255 Hebrew (1255)", "Windows-1256 Arabic (1256)", "Windows-1257 Baltic (1257)", "Windows-1258 Vietnam (1258)", "ISO-8859-1 Latin 1 Western European (28591)", "ISO-8859-2 Latin 2 Central European (28592)", "ISO-8859-3 Latin 3 South European (28593)", "ISO-8859-4 Latin 4 North European (28594)", "ISO-8859-5 Latin/Cyrillic (28595)", "ISO-8859-6 Latin/Arabic (28596)", "ISO-8859-7 Latin/Greek (28597)", "ISO-8859-8 Latin/Hebrew (28598)", "ISO 8859-8 Hebrew (ISO-Logical) (38598)", "ISO-8859-9 Latin 5 Turkish (28599)", "ISO-8859-10 Latin 6 Nordic (28600)", "ISO-8859-11 Latin/Thai (28601)", "ISO-8859-13 Latin 7 Baltic Rim (28603)", "ISO-8859-14 Latin 8 Celtic (28604)", "ISO-8859-15 Latin 9 (28605)", "ISO-8859-16 Latin 10 (28606)", "ISO 2022 JIS Japanese with no halfwidth Katakana (50220)", "ISO 2022 JIS Japanese with halfwidth Katakana (50221)", "ISO 2022 Japanese JIS X 0201-1989 (1 byte Kana-SO/SI) (50222)", "ISO 2022 Korean (50225)", "ISO 2022 Simplified Chinese (50227)", "ISO 6937 Non-Spacing Accent (20269)", "EUC Japanese (51932)", "EUC Simplified Chinese (51936)", "EUC Korean (51949)", "ISCII Devanagari (57002)", "ISCII Bengali (57003)", "ISCII Tamil (57004)", "ISCII Telugu (57005)", "ISCII Assamese (57006)", "ISCII Oriya (57007)", "ISCII Kannada (57008)", "ISCII Malayalam (57009)", "ISCII Gujarati (57010)", "ISCII Punjabi (57011)", "Japanese Shift-JIS (932)", "Simplified Chinese GBK (936)", "Korean (949)", "Traditional Chinese Big5 (950)", "US-ASCII (7-bit) (20127)", "Simplified Chinese GB2312 (20936)", "KOI8-R Russian Cyrillic (20866)", "KOI8-U Ukrainian Cyrillic (21866)", "Mazovia (Polish) MS-DOS (620)", "Arabic (ASMO 708) (708)", "Arabic (Transparent ASMO); Arabic (DOS) (720)", "Kamenick\xFD (Czech) MS-DOS (895)", "Korean (Johab) (1361)", "MAC Roman (10000)", "Japanese (Mac) (10001)", "MAC Traditional Chinese (Big5) (10002)", "Korean (Mac) (10003)", "Arabic (Mac) (10004)", "Hebrew (Mac) (10005)", "Greek (Mac) (10006)", "Cyrillic (Mac) (10007)", "MAC Simplified Chinese (GB 2312) (10008)", "Romanian (Mac) (10010)", "Ukrainian (Mac) (10017)", "Thai (Mac) (10021)", "MAC Latin 2 (Central European) (10029)", "Icelandic (Mac) (10079)", "Turkish (Mac) (10081)", "Croatian (Mac) (10082)", "CNS Taiwan (Chinese Traditional) (20000)", "TCA Taiwan (20001)", "ETEN Taiwan (Chinese Traditional) (20002)", "IBM5550 Taiwan (20003)", "TeleText Taiwan (20004)", "Wang Taiwan (20005)", "Western European IA5 (IRV International Alphabet 5) (20105)", "IA5 German (7-bit) (20106)", "IA5 Swedish (7-bit) (20107)", "IA5 Norwegian (7-bit) (20108)", "T.61 (20261)", "Japanese (JIS 0208-1990 and 0212-1990) (20932)", "Korean Wansung (20949)", "Extended/Ext Alpha Lowercase (21027)", "Europa 3 (29001)", "Atari ST/TT (47451)", "HZ-GB2312 Simplified Chinese (52936)", "Simplified Chinese GB18030 (54936)"] }] } };

// magic_utils_shim.mjs
function isWorkerEnvironment() {
  return false;
}
var Utils = {
  byteArrayToUtf8(byteArray) {
    if (!byteArray || !byteArray.length) return "";
    if (!(byteArray instanceof Uint8Array)) byteArray = new Uint8Array(byteArray);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(byteArray);
    } catch (err) {
      return Utils.byteArrayToChars(byteArray);
    }
  },
  byteArrayToChars(byteArray) {
    if (!byteArray || !byteArray.length) return "";
    let str = "";
    for (let i = 0; i < byteArray.length; i += 2e4) str += String.fromCharCode(...byteArray.slice(i, i + 2e4));
    return str;
  },
  arrayBufferToStr(arrayBuffer, utf8 = true) {
    if (!arrayBuffer || !arrayBuffer.byteLength) return "";
    const arr = new Uint8Array(arrayBuffer);
    return utf8 ? Utils.byteArrayToUtf8(arr) : Utils.byteArrayToChars(arr);
  }
};
var magic_utils_shim_default = Utils;

import Recipe from "./_magic_recipe.js";
import Dish from "./_magic_dish.js";

var Stream = class _Stream {
  /**
   * Stream constructor.
   *
   * @param {Uint8Array} input
   * @param {number} pos
   * @param {number} bitPos
   */
  constructor(input, pos = 0, bitPos = 0) {
    this.bytes = input;
    this.length = this.bytes.length;
    this.position = pos;
    this.bitPos = bitPos;
  }
  /**
   * Clone this Stream returning a new identical Stream.
   *
   * @returns {Stream}
   */
  clone() {
    return new _Stream(this.bytes, this.position, this.bitPos);
  }
  /**
   * Get a number of bytes from the current position, or all remaining bytes.
   *
   * @param {number} [numBytes=null]
   * @returns {Uint8Array}
   */
  getBytes(numBytes = null) {
    if (this.position > this.length) return void 0;
    const newPosition = numBytes !== null ? this.position + numBytes : this.length;
    const bytes = this.bytes.slice(this.position, newPosition);
    this.position = newPosition;
    this.bitPos = 0;
    return bytes;
  }
  /**
   * Interpret the following bytes as a string, stopping at the next null byte or
   * the supplied limit.
   *
   * @param {number} [numBytes=-1]
   * @returns {string}
   */
  readString(numBytes = -1) {
    if (this.position > this.length) return void 0;
    if (numBytes === -1) numBytes = this.length - this.position;
    let result = "";
    for (let i = this.position; i < this.position + numBytes; i++) {
      const currentByte = this.bytes[i];
      if (currentByte === 0) break;
      result += String.fromCharCode(currentByte);
    }
    this.position += numBytes;
    this.bitPos = 0;
    return result;
  }
  /**
   * Interpret the following bytes as an integer in big or little endian.
   *
   * @param {number} numBytes
   * @param {string} [endianness="be"]
   * @returns {number}
   */
  readInt(numBytes, endianness = "be") {
    if (this.position > this.length) return void 0;
    let val = 0;
    if (endianness === "be") {
      for (let i = this.position; i < this.position + numBytes; i++) {
        val = val << 8;
        val |= this.bytes[i];
      }
    } else {
      for (let i = this.position + numBytes - 1; i >= this.position; i--) {
        val = val << 8;
        val |= this.bytes[i];
      }
    }
    this.position += numBytes;
    this.bitPos = 0;
    return val;
  }
  /**
   * Reads a number of bits from the buffer in big or little endian.
   *
   * @param {number} numBits
   * @param {string} [endianness="be"]
   * @returns {number}
   */
  readBits(numBits, endianness = "be") {
    if (this.position > this.length) return void 0;
    let bitBuf = 0, bitBufLen = 0;
    bitBuf = this.bytes[this.position++] & bitMask(this.bitPos);
    if (endianness !== "be") bitBuf >>>= this.bitPos;
    bitBufLen = 8 - this.bitPos;
    this.bitPos = 0;
    while (bitBufLen < numBits) {
      if (endianness === "be")
        bitBuf = bitBuf << bitBufLen | this.bytes[this.position++];
      else
        bitBuf |= this.bytes[this.position++] << bitBufLen;
      bitBufLen += 8;
    }
    if (bitBufLen > numBits) {
      const excess = bitBufLen - numBits;
      if (endianness === "be")
        bitBuf >>>= excess;
      else
        bitBuf &= (1 << numBits) - 1;
      bitBufLen -= excess;
      this.position--;
      this.bitPos = 8 - excess;
    }
    return bitBuf;
    function bitMask(bitPos) {
      return endianness === "be" ? (1 << 8 - bitPos) - 1 : 256 - (1 << bitPos);
    }
  }
  /**
   * Consume the stream until we reach the specified byte or sequence of bytes.
   *
   * @param {number|List<number>} val
   */
  continueUntil(val) {
    if (this.position > this.length) return;
    this.bitPos = 0;
    if (typeof val === "number") {
      while (++this.position < this.length && this.bytes[this.position] !== val) {
        continue;
      }
      return;
    }
    function preprocess(val2, len) {
      const skiptable2 = new Array();
      val2.forEach((element, index) => {
        skiptable2[element] = len - index;
      });
      return skiptable2;
    }
    const length = val.length;
    const initial = val[length - 1];
    this.position = length;
    const skiptable = preprocess(val, length);
    let found;
    while (this.position < this.length) {
      while (this.position < this.length && this.bytes[this.position++] !== initial) ;
      found = true;
      for (let x = length - 1; x >= 0; x--) {
        if (this.bytes[this.position - length + x] !== val[x]) {
          found = false;
          this.position += skiptable[val[x]];
          break;
        }
      }
      if (found) {
        this.position -= length;
        break;
      }
    }
  }
  /**
   * Consume bytes if they match the supplied value.
   *
   * @param {Number} val
   */
  consumeWhile(val) {
    while (this.position < this.length) {
      if (this.bytes[this.position] !== val) {
        break;
      }
      this.position++;
    }
    this.bitPos = 0;
  }
  /**
   * Consume the next byte if it matches the supplied value.
   *
   * @param {number} val
   */
  consumeIf(val) {
    if (this.bytes[this.position] === val) {
      this.position++;
      this.bitPos = 0;
    }
  }
  /**
   * Move forwards through the stream by the specified number of bytes.
   *
   * @param {number} numBytes
   */
  moveForwardsBy(numBytes) {
    const pos = this.position + numBytes;
    if (pos < 0 || pos > this.length)
      throw new Error("Cannot move to position " + pos + " in stream. Out of bounds.");
    this.position = pos;
    this.bitPos = 0;
  }
  /**
   * Move backwards through the stream by the specified number of bytes.
   *
   * @param {number} numBytes
   */
  moveBackwardsBy(numBytes) {
    const pos = this.position - numBytes;
    if (pos < 0 || pos > this.length)
      throw new Error("Cannot move to position " + pos + " in stream. Out of bounds.");
    this.position = pos;
    this.bitPos = 0;
  }
  /**
   * Move backwards through the strem by the specified number of bits.
   *
   * @param {number} numBits
   */
  moveBackwardsByBits(numBits) {
    if (numBits <= this.bitPos) {
      this.bitPos -= numBits;
    } else {
      if (this.bitPos > 0) {
        numBits -= this.bitPos;
        this.bitPos = 0;
      }
      while (numBits > 0) {
        this.moveBackwardsBy(1);
        this.bitPos = 8;
        this.moveBackwardsByBits(numBits);
        numBits -= 8;
      }
    }
  }
  /**
   * Move to a specified position in the stream.
   *
   * @param {number} pos
   */
  moveTo(pos) {
    if (pos < 0 || pos > this.length)
      throw new Error("Cannot move to position " + pos + " in stream. Out of bounds.");
    this.position = pos;
    this.bitPos = 0;
  }
  /**
   * Returns true if there are more bytes left in the stream.
   *
   * @returns {boolean}
   */
  hasMore() {
    return this.position < this.length;
  }
  /**
   * Returns a slice of the stream up to the current position.
   *
   * @param {number} [start=0]
   * @param {number} [finish=this.position]
   * @returns {Uint8Array}
   */
  carve(start = 0, finish = this.position) {
    if (this.bitPos > 0) finish++;
    return this.bytes.slice(start, finish);
  }
};

var FILE_SIGNATURES = {
  "Images": [
    {
      name: "Joint Photographic Experts Group image",
      extension: "jpg,jpeg,jpe,thm,mpo",
      mime: "image/jpeg",
      description: "",
      signature: {
        0: 255,
        1: 216,
        2: 255,
        3: [192, 196, 219, 221, 224, 225, 226, 227, 228, 229, 231, 232, 234, 235, 236, 237, 238, 254]
      },
      extractor: extractJPEG
    },
    {
      name: "Graphics Interchange Format image",
      extension: "gif",
      mime: "image/gif",
      description: "",
      signature: {
        0: 71,
        // GIF
        1: 73,
        2: 70,
        3: 56,
        // 8
        4: [55, 57],
        // 7|9
        5: 97
        // a
      },
      extractor: extractGIF
    },
    {
      name: "Portable Network Graphics image",
      extension: "png",
      mime: "image/png",
      description: "",
      signature: {
        0: 137,
        1: 80,
        // PNG
        2: 78,
        3: 71,
        4: 13,
        5: 10,
        6: 26,
        7: 10
      },
      extractor: extractPNG
    },
    {
      name: "WEBP Image",
      extension: "webp",
      mime: "image/webp",
      description: "",
      signature: {
        8: 87,
        9: 69,
        10: 66,
        11: 80
      },
      extractor: extractWEBP
    },
    {
      name: "High Efficiency Image File Format",
      extension: "heic,heif",
      mime: "image/heif",
      description: "",
      signature: {
        0: 0,
        1: 0,
        2: 0,
        3: [36, 24],
        4: 102,
        // ftypheic
        5: 116,
        6: 121,
        7: 112,
        8: 104,
        9: 101,
        10: 105,
        11: 99
      },
      extractor: null
    },
    {
      name: "Camera Image File Format",
      extension: "crw",
      mime: "image/x-canon-crw",
      description: "",
      signature: {
        6: 72,
        // HEAPCCDR
        7: 69,
        8: 65,
        9: 80,
        10: 67,
        11: 67,
        12: 68,
        13: 82
      },
      extractor: null
    },
    {
      // Place before tiff check
      name: "Canon CR2 raw image",
      extension: "cr2",
      mime: "image/x-canon-cr2",
      description: "",
      signature: [
        {
          0: 73,
          1: 73,
          2: 42,
          3: 0,
          8: 67,
          9: 82
        },
        {
          0: 77,
          1: 77,
          2: 0,
          3: 42,
          8: 67,
          9: 82
        }
      ],
      extractor: null
    },
    {
      name: "Tagged Image File Format image",
      extension: "tif",
      mime: "image/tiff",
      description: "",
      signature: [
        {
          0: 73,
          1: 73,
          2: 42,
          3: 0
        },
        {
          0: 77,
          1: 77,
          2: 0,
          3: 42
        }
      ],
      extractor: null
    },
    {
      name: "Bitmap image",
      extension: "bmp",
      mime: "image/bmp",
      description: "",
      signature: {
        0: 66,
        1: 77,
        7: 0,
        9: 0,
        14: [12, 40, 56, 64, 108, 124],
        15: 0,
        16: 0,
        17: 0
      },
      extractor: extractBMP
    },
    {
      name: "JPEG Extended Range image",
      extension: "jxr",
      mime: "image/vnd.ms-photo",
      description: "",
      signature: {
        0: 73,
        1: 73,
        2: 188
      },
      extractor: null
    },
    {
      name: "Photoshop image",
      extension: "psd",
      mime: "image/vnd.adobe.photoshop",
      description: "",
      signature: {
        0: 56,
        // 8BPS
        1: 66,
        2: 80,
        3: 83,
        4: 0,
        5: 1,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
        11: 0
      },
      extractor: null
    },
    {
      name: "Photoshop Large Document",
      extension: "psb",
      mime: "application/x-photoshop",
      description: "",
      signature: {
        0: 56,
        // 8BPS
        1: 66,
        2: 80,
        3: 83,
        4: 0,
        5: 2,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
        11: 0,
        12: 0
      },
      extractor: null
    },
    {
      name: "Paint Shop Pro image",
      extension: "psp",
      mime: "image/psp",
      description: "",
      signature: [
        {
          0: 80,
          // Paint Shop Pro Im
          1: 97,
          2: 105,
          3: 110,
          4: 116,
          5: 32,
          6: 83,
          7: 104,
          8: 111,
          9: 112,
          10: 32,
          11: 80,
          12: 114,
          13: 111,
          14: 32,
          15: 73,
          16: 109
        },
        {
          0: 126,
          1: 66,
          2: 75,
          3: 0
        }
      ],
      extractor: null
    },
    {
      name: "The GIMP image",
      extension: "xcf",
      mime: "image/x-xcf",
      description: "",
      signature: {
        0: 103,
        // gimp xcf
        1: 105,
        2: 109,
        3: 112,
        4: 32,
        5: 120,
        6: 99,
        7: 102,
        8: 32,
        9: [102, 118],
        10: [105, 48],
        11: [108, 48],
        12: [101, 49, 50, 51]
      },
      extractor: null
    },
    {
      name: "Icon image",
      extension: "ico",
      mime: "image/x-icon",
      description: "",
      signature: {
        0: 0,
        1: 0,
        2: 1,
        3: 0,
        4: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
        5: 0,
        6: [16, 32, 48, 64, 128],
        7: [16, 32, 48, 64, 128],
        9: 0,
        10: [0, 1]
      },
      extractor: extractICO
    },
    {
      name: "Radiance High Dynamic Range image",
      extension: "hdr",
      mime: "image/vnd.radiance",
      description: "",
      signature: {
        0: 35,
        // #?RADIANCE
        1: 63,
        2: 82,
        3: 65,
        4: 68,
        5: 73,
        6: 65,
        7: 78,
        8: 67,
        9: 69,
        10: 10
      },
      extractor: null
    },
    {
      name: "Sony ARW image",
      extension: "arw",
      mime: "image/x-raw",
      description: "",
      signature: {
        0: 5,
        1: 0,
        2: 0,
        3: 0,
        4: 65,
        5: 87,
        6: 49,
        7: 46
      },
      extractor: null
    },
    {
      name: "Fujifilm Raw Image",
      extension: "raf",
      mime: "image/x-raw",
      description: "",
      signature: {
        0: 70,
        // FUJIFILMCCD-RAW
        1: 85,
        2: 74,
        3: 73,
        4: 70,
        5: 73,
        6: 76,
        7: 77,
        8: 67,
        9: 67,
        10: 68,
        11: 45,
        12: 82,
        13: 65,
        14: 87
      },
      extractor: null
    },
    {
      name: "Minolta RAW image",
      extension: "mrw",
      mime: "image/x-raw",
      description: "",
      signature: {
        0: 0,
        1: 77,
        // MRM
        2: 82,
        3: 77
      },
      extractor: null
    },
    {
      name: "Adobe Bridge Thumbnail Cache",
      extension: "bct",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 108,
        1: 110,
        2: 98,
        3: 116,
        4: 2,
        5: 0,
        6: 0,
        7: 0
      },
      extractor: null
    },
    {
      name: "Microsoft Document Imaging",
      extension: "mdi",
      mime: "image/vnd.ms-modi",
      description: "",
      signature: {
        0: 69,
        1: 80,
        2: 42,
        3: 0
      },
      extractor: null
    },
    {
      name: "Joint Photographic Experts Group image (under Base64)",
      extension: "B64",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 47,
        1: 57,
        2: 106,
        3: 47,
        4: 52
      },
      extractor: null
    },
    {
      name: "Portable Network Graphics image (under Base64)",
      extension: "B64",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 105,
        1: 86,
        2: 66,
        3: 79,
        4: 82,
        5: 119,
        6: 48
      },
      extractor: null
    },
    {
      name: "AutoCAD Drawing",
      extension: "dwg,123d",
      mime: "application/acad",
      description: "",
      signature: {
        0: 65,
        1: 67,
        2: 49,
        3: 48,
        4: [48, 49],
        5: [48, 49, 50, 51, 52, 53],
        6: 0
      },
      extractor: null
    },
    {
      name: "AutoCAD Drawing",
      extension: "dwg,dwt",
      mime: "application/acad",
      description: "",
      signature: [
        {
          0: 65,
          1: 67,
          2: 49,
          3: 48,
          4: 49,
          5: 56,
          6: 0
        },
        {
          0: 65,
          1: 67,
          2: 49,
          3: 48,
          4: 50,
          5: 52,
          6: 0
        },
        {
          0: 65,
          1: 67,
          2: 49,
          3: 48,
          4: 50,
          5: 55,
          6: 0
        }
      ],
      extractor: null
    },
    {
      name: "Targa Image",
      extension: "tga",
      mime: "image/x-targa",
      description: "",
      signature: [
        {
          // This signature is not at the beginning of the file. The extractor works backwards.
          0: 84,
          1: 82,
          2: 85,
          3: 69,
          4: 86,
          5: 73,
          6: 83,
          7: 73,
          8: 79,
          9: 78,
          10: 45,
          11: 88,
          12: 70,
          13: 73,
          14: 76,
          15: 69,
          16: 46
        }
      ],
      extractor: extractTARGA
    }
  ],
  "Video": [
    {
      // Place before webm
      name: "Matroska Multimedia Container",
      extension: "mkv",
      mime: "video/x-matroska",
      description: "",
      signature: {
        31: 109,
        32: 97,
        33: 116,
        34: 114,
        35: 111,
        36: 115,
        37: 107,
        38: 97
      },
      extractor: null
    },
    {
      name: "WEBM video",
      extension: "webm",
      mime: "video/webm",
      description: "",
      signature: {
        0: 26,
        1: 69,
        2: 223,
        3: 163
      },
      extractor: null
    },
    {
      // Place before MPEG-4
      name: "Flash MP4 video",
      extension: "f4v",
      mime: "video/mp4",
      description: "",
      signature: {
        4: 102,
        5: 116,
        6: 121,
        7: 112,
        8: [102, 70],
        9: 52,
        10: [118, 86],
        11: 32
      },
      extractor: null
    },
    {
      name: "MPEG-4 video",
      extension: "mp4",
      mime: "video/mp4",
      description: "",
      signature: [
        {
          0: 0,
          1: 0,
          2: 0,
          3: [24, 32],
          4: 102,
          5: 116,
          6: 121,
          7: 112
        },
        {
          0: 51,
          // 3gp5
          1: 103,
          2: 112,
          3: 53
        },
        {
          0: 0,
          1: 0,
          2: 0,
          3: 28,
          4: 102,
          5: 116,
          6: 121,
          7: 112,
          8: 109,
          9: 112,
          10: 52,
          11: 50,
          16: 109,
          // mp41mp42isom
          17: 112,
          18: 52,
          19: 49,
          20: 109,
          21: 112,
          22: 52,
          23: 50,
          24: 105,
          25: 115,
          26: 111,
          27: 109
        }
      ],
      extractor: null
    },
    {
      name: "M4V video",
      extension: "m4v",
      mime: "video/x-m4v",
      description: "",
      signature: {
        0: 0,
        1: 0,
        2: 0,
        3: 28,
        4: 102,
        5: 116,
        6: 121,
        7: 112,
        8: 77,
        9: 52,
        10: 86
      },
      extractor: null
    },
    {
      name: "Quicktime video",
      extension: "mov",
      mime: "video/quicktime",
      description: "",
      signature: {
        0: 0,
        1: 0,
        2: 0,
        3: 20,
        4: 102,
        5: 116,
        6: 121,
        7: 112
      },
      extractor: null
    },
    {
      name: "Audio Video Interleave",
      extension: "avi",
      mime: "video/x-msvideo",
      description: "",
      signature: {
        0: 82,
        1: 73,
        2: 70,
        3: 70,
        8: 65,
        9: 86,
        10: 73
      },
      extractor: null
    },
    {
      name: "Windows Media Video",
      extension: "wmv",
      mime: "video/x-ms-wmv",
      description: "",
      signature: {
        0: 48,
        1: 38,
        2: 178,
        3: 117,
        4: 142,
        5: 102,
        6: 207,
        7: 17,
        8: 166,
        9: 217
      },
      extractor: null
    },
    {
      name: "MPEG video",
      extension: "mpg",
      mime: "video/mpeg",
      description: "",
      signature: {
        0: 0,
        1: 0,
        2: 1,
        3: 186
      },
      extractor: null
    },
    {
      name: "Flash Video",
      extension: "flv",
      mime: "video/x-flv",
      description: "",
      signature: {
        0: 70,
        1: 76,
        2: 86,
        3: 1
      },
      extractor: extractFLV
    },
    {
      name: "OGG Video",
      extension: "ogv,ogm,opus,ogx",
      mime: "video/ogg",
      description: "",
      signature: [
        {
          0: 79,
          // OggS
          1: 103,
          2: 103,
          3: 83,
          4: 0,
          5: 2,
          28: 1,
          29: 118,
          // video
          30: 105,
          31: 100,
          32: 101,
          33: 111
        },
        {
          0: 79,
          // OggS
          1: 103,
          2: 103,
          3: 83,
          4: 0,
          5: 2,
          28: 128,
          29: 116,
          // theora
          30: 104,
          31: 101,
          32: 111,
          33: 114,
          34: 97
        },
        {
          0: 79,
          // OggS
          1: 103,
          2: 103,
          3: 83,
          4: 0,
          5: 2,
          28: 102,
          // fishead
          29: 105,
          30: 115,
          31: 104,
          32: 101,
          33: 97,
          34: 100
        }
      ],
      extractor: null
    }
  ],
  "Audio": [
    {
      name: "Waveform Audio",
      extension: "wav",
      mime: "audio/x-wav",
      description: "",
      signature: {
        0: 82,
        1: 73,
        2: 70,
        3: 70,
        8: 87,
        9: 65,
        10: 86,
        11: 69
      },
      extractor: extractWAV
    },
    {
      name: "OGG audio",
      extension: "ogg",
      mime: "audio/ogg",
      description: "",
      signature: {
        0: 79,
        1: 103,
        2: 103,
        3: 83
      },
      extractor: null
    },
    {
      name: "Musical Instrument Digital Interface audio",
      extension: "midi",
      mime: "audio/midi",
      description: "",
      signature: {
        0: 77,
        1: 84,
        2: 104,
        3: 100
      },
      extractor: null
    },
    {
      name: "MPEG-3 audio",
      extension: "mp3",
      mime: "audio/mpeg",
      description: "",
      signature: [
        {
          0: 73,
          1: 68,
          2: 51
        },
        {
          0: 255,
          1: 251
        }
      ],
      extractor: extractMP3
    },
    {
      name: "MPEG-4 Part 14 audio",
      extension: "m4a",
      mime: "audio/m4a",
      description: "",
      signature: [
        {
          4: 102,
          5: 116,
          6: 121,
          7: 112,
          8: 77,
          9: 52,
          10: 65
        },
        {
          0: 77,
          1: 52,
          2: 65,
          3: 32
        }
      ],
      extractor: null
    },
    {
      name: "Free Lossless Audio Codec",
      extension: "flac",
      mime: "audio/x-flac",
      description: "",
      signature: {
        0: 102,
        1: 76,
        2: 97,
        3: 67
      },
      extractor: null
    },
    {
      name: "Adaptive Multi-Rate audio codec",
      extension: "amr",
      mime: "audio/amr",
      description: "",
      signature: {
        0: 35,
        1: 33,
        2: 65,
        3: 77,
        4: 82,
        5: 10
      },
      extractor: null
    },
    {
      name: "Audacity",
      extension: "au",
      mime: "audio/x-au",
      description: "",
      signature: {
        0: 100,
        // dns.
        1: 110,
        2: 115,
        3: 46,
        24: 65,
        // AudacityBlockFile
        25: 117,
        26: 100,
        27: 97,
        28: 99,
        29: 105,
        30: 116,
        31: 121,
        32: 66,
        33: 108,
        34: 111,
        35: 99,
        36: 107,
        37: 70,
        38: 105,
        39: 108,
        40: 101
      },
      extractor: null
    },
    {
      name: "Audacity Block",
      extension: "auf",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 65,
        // AudacityBlockFile
        1: 117,
        2: 100,
        3: 97,
        4: 99,
        5: 105,
        6: 116,
        7: 121,
        8: 66,
        9: 108,
        10: 111,
        11: 99,
        12: 107,
        13: 70,
        14: 105,
        15: 108,
        16: 101
      },
      extractor: null
    },
    {
      name: "Audio Interchange File",
      extension: "aif",
      mime: "audio/x-aiff",
      description: "",
      signature: {
        0: 70,
        // FORM
        1: 79,
        2: 82,
        3: 77,
        8: 65,
        // AIFF
        9: 73,
        10: 70,
        11: 70
      },
      extractor: null
    },
    {
      name: "Audio Interchange File (compressed)",
      extension: "aifc",
      mime: "audio/x-aifc",
      description: "",
      signature: {
        0: 70,
        // FORM
        1: 79,
        2: 82,
        3: 77,
        8: 65,
        // AIFC
        9: 73,
        10: 70,
        11: 67
      },
      extractor: null
    }
  ],
  "Documents": [
    {
      name: "Portable Document Format",
      extension: "pdf",
      mime: "application/pdf",
      description: "",
      signature: {
        0: 37,
        1: 80,
        2: 68,
        3: 70
      },
      extractor: extractPDF
    },
    {
      name: "Portable Document Format (under Base64)",
      extension: "B64",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 65,
        1: 74,
        2: 86,
        3: 66,
        4: 69,
        5: 82,
        6: 105
      },
      extractor: null
    },
    {
      // Place before PostScript
      name: "Adobe PostScript",
      extension: "ps,eps,ai,pfa",
      mime: "application/postscript",
      description: "",
      signature: {
        0: 37,
        1: 33,
        2: 80,
        3: 83,
        4: 45,
        5: 65,
        6: 100,
        7: 111,
        8: 98,
        9: 101
      },
      extractor: null
    },
    {
      name: "PostScript",
      extension: "ps",
      mime: "application/postscript",
      description: "",
      signature: {
        0: 37,
        1: 33
      },
      extractor: null
    },
    {
      name: "Encapsulated PostScript",
      extension: "eps,ai",
      mime: "application/eps",
      description: "",
      signature: {
        0: 197,
        1: 208,
        2: 211,
        3: 198
      },
      extractor: null
    },
    {
      name: "Rich Text Format",
      extension: "rtf",
      mime: "application/rtf",
      description: "",
      signature: {
        0: 123,
        1: 92,
        2: 114,
        3: 116
      },
      extractor: extractRTF
    },
    {
      name: "Microsoft Office document/OLE2",
      extension: "ole2,doc,xls,dot,ppt,xla,ppa,pps,pot,msi,sdw,db,vsd,msg",
      mime: "application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint",
      description: "Microsoft Office documents",
      signature: {
        0: 208,
        1: 207,
        2: 17,
        3: 224,
        4: 161,
        5: 177,
        6: 26,
        7: 225
      },
      extractor: null
    },
    {
      name: "Microsoft Office document/OLE2 (under Base64)",
      extension: "B64",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 48,
        1: 77,
        2: 56,
        3: 82,
        4: 52,
        5: 75,
        6: 71,
        7: 120
      },
      extractor: null
    },
    {
      name: "Microsoft Office 2007+ document",
      extension: "docx,xlsx,pptx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation",
      description: "",
      signature: {
        38: 95,
        // _Types].xml
        39: 84,
        40: 121,
        41: 112,
        42: 101,
        43: 115,
        44: 93,
        45: 46,
        46: 120,
        47: 109,
        48: 108
      },
      extractor: extractZIP
    },
    {
      name: "Microsoft Access database",
      extension: "mdb,mda,mde,mdt,fdb,psa",
      mime: "application/msaccess",
      description: "",
      signature: {
        0: 0,
        1: 1,
        2: 0,
        3: 0,
        4: 83,
        // Standard Jet
        5: 116,
        6: 97,
        7: 110,
        8: 100,
        9: 97,
        10: 114,
        11: 100,
        12: 32,
        13: 74,
        14: 101,
        15: 116
      },
      extractor: null
    },
    {
      name: "Microsoft Access 2007+ database",
      extension: "accdb,accde,accda,accdu",
      mime: "application/msaccess",
      description: "",
      signature: {
        0: 0,
        1: 1,
        2: 0,
        3: 0,
        4: 83,
        // Standard ACE DB
        5: 116,
        6: 97,
        7: 110,
        8: 100,
        9: 97,
        10: 114,
        11: 100,
        12: 32,
        13: 65,
        14: 67,
        15: 69,
        16: 32
      },
      extractor: null
    },
    {
      name: "Microsoft OneNote document",
      extension: "one",
      mime: "application/onenote",
      description: "",
      signature: {
        0: 228,
        1: 82,
        2: 92,
        3: 123,
        4: 140,
        5: 216,
        6: 167,
        7: 77,
        8: 174,
        9: 177,
        10: 83,
        11: 120,
        12: 208,
        13: 41,
        14: 150,
        15: 211
      },
      extractor: null
    },
    {
      name: "Outlook Express database",
      extension: "dbx",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 207,
        1: 173,
        2: 18,
        3: 254,
        4: [48, 197, 198, 199],
        11: 17
      },
      extractor: null
    },
    {
      name: "Personal Storage Table (Outlook)",
      extension: "pst,ost,fdb,pab",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 33,
        // !BDN
        1: 66,
        2: 68,
        3: 78
      },
      extractor: null
    },
    {
      name: "Microsoft Exchange Database",
      extension: "edb",
      mime: "application/octet-stream",
      description: "",
      signature: {
        4: 239,
        5: 205,
        6: 171,
        7: 137,
        8: [32, 35],
        9: 6,
        10: 0,
        11: 0,
        12: [0, 1],
        13: 0,
        14: 0,
        15: 0
      },
      extractor: null
    },
    {
      name: "WordPerfect document",
      extension: "wpd,wp,wp5,wp6,wpp,bk!,wcm",
      mime: "application/wordperfect",
      description: "",
      signature: {
        0: 255,
        1: 87,
        2: 80,
        3: 67,
        7: [0, 1, 2],
        8: 1,
        9: 10
      },
      extractor: null
    },
    {
      name: "EPUB e-book",
      extension: "epub",
      mime: "application/epub+zip",
      description: "",
      signature: {
        0: 80,
        1: 75,
        2: 3,
        3: 4,
        30: 109,
        // mimetypeapplication/epub_zip
        31: 105,
        32: 109,
        33: 101,
        34: 116,
        35: 121,
        36: 112,
        37: 101,
        38: 97,
        39: 112,
        40: 112,
        41: 108,
        42: 105,
        43: 99,
        44: 97,
        45: 116,
        46: 105,
        47: 111,
        48: 110,
        49: 47,
        50: 101,
        51: 112,
        52: 117,
        53: 98,
        54: 43,
        55: 122,
        56: 105,
        57: 112
      },
      extractor: extractZIP
    }
  ],
  "Applications": [
    {
      name: "Windows Portable Executable",
      extension: "exe,dll,drv,vxd,sys,ocx,vbx,com,fon,scr",
      mime: "application/vnd.microsoft.portable-executable",
      description: "",
      signature: {
        0: 77,
        1: 90,
        3: [0, 1, 2],
        5: [0, 1, 2]
      },
      extractor: extractMZPE
    },
    {
      name: "Executable and Linkable Format",
      extension: "elf,bin,axf,o,prx,so",
      mime: "application/x-executable",
      description: "Executable and Linkable Format file. No standard file extension.",
      signature: {
        0: 127,
        1: 69,
        2: 76,
        3: 70
      },
      extractor: extractELF
    },
    {
      name: "MacOS Mach-O object",
      extension: "dylib",
      mime: "application/octet-stream",
      description: "",
      signature: [
        {
          0: 202,
          1: 254,
          2: 186,
          3: 190,
          4: 0,
          5: 0,
          6: 0,
          7: [1, 2, 3]
        },
        {
          0: 206,
          1: 250,
          2: 237,
          3: 254,
          4: 7,
          5: 0,
          6: 0,
          7: 0,
          8: [1, 2, 3]
        }
      ],
      extractor: extractMACHO
    },
    {
      name: "MacOS Mach-O 64-bit object",
      extension: "dylib",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 207,
        1: 250,
        2: 237,
        3: 254
      },
      extractor: extractMACHO
    },
    {
      name: "Adobe Flash",
      extension: "swf",
      mime: "application/x-shockwave-flash",
      description: "",
      signature: {
        0: [67, 70],
        1: 87,
        2: 83
      },
      extractor: null
    },
    {
      name: "Java Class",
      extension: "class",
      mime: "application/java-vm",
      description: "",
      signature: {
        0: 202,
        1: 254,
        2: 186,
        3: 190
      },
      extractor: null
    },
    {
      name: "Dalvik Executable",
      extension: "dex",
      mime: "application/octet-stream",
      description: "Dalvik Executable as used by Android",
      signature: {
        0: 100,
        1: 101,
        2: 120,
        3: 10,
        4: 48,
        5: 51,
        6: 53,
        7: 0
      },
      extractor: null
    },
    {
      name: "Google Chrome Extension",
      extension: "crx",
      mime: "application/crx",
      description: "Google Chrome extension or packaged app",
      signature: {
        0: 67,
        1: 114,
        2: 50,
        3: 52
      },
      extractor: null
    }
  ],
  "Archives": [
    {
      name: "PKZIP archive",
      extension: "zip",
      mime: "application/zip",
      description: "",
      signature: {
        0: 80,
        1: 75,
        2: [3, 5, 7],
        3: [4, 6, 8]
      },
      extractor: extractZIP
    },
    {
      name: "PKZIP archive (under Base64)",
      extension: "B64",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 85,
        1: 69,
        2: 115,
        3: 68,
        4: 66,
        5: 66
      },
      extractor: null
    },
    {
      name: "TAR archive",
      extension: "tar",
      mime: "application/x-tar",
      description: "",
      signature: {
        257: 117,
        // ustar
        258: 115,
        259: 116,
        260: 97,
        261: 114
      },
      extractor: extractTAR
    },
    {
      name: "Roshal Archive",
      extension: "rar",
      mime: "application/x-rar-compressed",
      description: "",
      signature: {
        0: 82,
        1: 97,
        2: 114,
        3: 33,
        4: 26,
        5: 7,
        6: [0, 1]
      },
      extractor: null
    },
    {
      name: "Gzip",
      extension: "gz",
      mime: "application/gzip",
      description: "",
      signature: {
        0: 31,
        1: 139,
        2: 8
      },
      extractor: extractGZIP
    },
    {
      name: "Bzip2",
      extension: "bz2",
      mime: "application/x-bzip2",
      description: "",
      signature: {
        0: 66,
        1: 90,
        2: 104
      },
      extractor: extractBZIP2
    },
    {
      name: "7zip",
      extension: "7z",
      mime: "application/x-7z-compressed",
      description: "",
      signature: {
        0: 55,
        1: 122,
        2: 188,
        3: 175,
        4: 39,
        5: 28
      },
      extractor: null
    },
    {
      name: "Zlib Deflate",
      extension: "zlib",
      mime: "application/x-deflate",
      description: "",
      signature: {
        0: 120,
        1: [1, 156, 218, 94]
      },
      extractor: extractZlib
    },
    {
      name: "xz compression",
      extension: "xz",
      mime: "application/x-xz",
      description: "",
      signature: {
        0: 253,
        1: 55,
        2: 122,
        3: 88,
        4: 90,
        5: 0
      },
      extractor: extractXZ
    },
    {
      name: "Tarball",
      extension: "tar.z",
      mime: "application/x-gtar",
      description: "",
      signature: {
        0: 31,
        1: [157, 160]
      },
      extractor: null
    },
    {
      name: "ISO disk image",
      extension: "iso",
      mime: "application/octet-stream",
      description: "ISO 9660 CD/DVD image file",
      signature: [
        {
          32769: 67,
          32770: 68,
          32771: 48,
          32772: 48,
          32773: 49
        },
        {
          34817: 67,
          34818: 68,
          34819: 48,
          34820: 48,
          34821: 49
        },
        {
          36865: 67,
          36866: 68,
          36867: 48,
          36868: 48,
          36869: 49
        }
      ],
      extractor: null
    },
    {
      name: "Virtual Machine Disk",
      extension: "vmdk",
      mime: "application/vmdk,application/x-virtualbox-vmdk",
      description: "",
      signature: {
        0: 75,
        1: 68,
        2: 77,
        3: 86,
        5: 0,
        6: 0,
        7: 0
      },
      extractor: null
    },
    {
      name: "Virtual Hard Drive",
      extension: "vhd",
      mime: "application/x-vhd",
      description: "",
      signature: {
        0: 99,
        // conectix
        1: 111,
        2: 110,
        3: 101,
        4: 99,
        5: 116,
        6: 105,
        7: 120
      },
      extractor: null
    },
    {
      name: "Macintosh disk image",
      extension: "dmf,dmg",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 120,
        1: 1,
        2: 115,
        3: 13,
        4: 98,
        5: 98,
        6: 96,
        7: 96
      },
      extractor: null
    },
    {
      name: "ARJ Archive",
      extension: "arj",
      mime: "application/x-arj-compressed",
      description: "",
      signature: {
        0: 96,
        1: 234,
        8: [0, 16, 20],
        9: 0,
        10: 2
      },
      extractor: null
    },
    {
      name: "WinAce Archive",
      extension: "ace",
      mime: "application/x-ace-compressed",
      description: "",
      signature: {
        7: 42,
        // **ACE**
        8: 42,
        9: 65,
        10: 67,
        11: 69,
        12: 42,
        13: 42
      },
      extractor: null
    },
    {
      name: "Macintosh BinHex Encoded File",
      extension: "hqx",
      mime: "application/mac-binhex",
      description: "",
      signature: {
        11: 109,
        // must be converted with BinHex
        12: 117,
        13: 115,
        14: 116,
        15: 32,
        16: 98,
        17: 101,
        18: 32,
        19: 99,
        20: 111,
        21: 110,
        22: 118,
        23: 101,
        24: 114,
        25: 116,
        26: 101,
        27: 100,
        28: 32,
        29: 119,
        30: 105,
        31: 116,
        32: 104,
        33: 32,
        34: 66,
        35: 105,
        36: 110,
        37: 72,
        38: 101,
        39: 120
      },
      extractor: null
    },
    {
      name: "ALZip Archive",
      extension: "alz",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 65,
        // ALZ
        1: 76,
        2: 90,
        3: 1,
        4: 10,
        5: 0,
        6: 0,
        7: 0
      },
      extractor: null
    },
    {
      name: "KGB Compressed Archive",
      extension: "kgb",
      mime: "application/x-kgb-compressed",
      description: "",
      signature: {
        0: 75,
        // KGB_arch -
        1: 71,
        2: 66,
        3: 95,
        4: 97,
        5: 114,
        6: 99,
        7: 104,
        8: 32,
        9: 45
      },
      extractor: null
    },
    {
      name: "Microsoft Cabinet",
      extension: "cab",
      mime: "vnd.ms-cab-compressed",
      description: "",
      signature: {
        0: 77,
        1: 83,
        2: 67,
        3: 70,
        4: 0,
        5: 0,
        6: 0,
        7: 0
      },
      extractor: null
    },
    {
      name: "Jar Archive",
      extension: "jar",
      mime: "application/java-archive",
      description: "",
      signature: {
        0: 95,
        1: 39,
        2: 168,
        3: 137
      },
      extractor: null
    },
    {
      name: "Jar Archive",
      extension: "jar",
      mime: "application/java-archive",
      description: "",
      signature: {
        0: 80,
        1: 75,
        2: 3,
        3: 4,
        4: 20,
        5: 0,
        6: 8,
        7: 0,
        8: 8,
        9: 0
      },
      extractor: extractZIP
    },
    {
      name: "lzop compressed",
      extension: "lzop,lzo",
      mime: "application/x-lzop",
      description: "",
      signature: {
        0: 137,
        1: 76,
        // LZO
        2: 90,
        3: 79,
        4: 0,
        5: 13,
        6: 10,
        7: 26
      },
      extractor: extractLZOP
    },
    {
      name: "Linux deb package",
      extension: "deb",
      mime: "application/vnd.debian.binary-package",
      description: "",
      signature: {
        0: 33,
        1: 60,
        2: 97,
        3: 114,
        4: 99,
        5: 104,
        6: 62
      },
      extractor: extractDEB
    },
    {
      name: "Apple Disk Image",
      extension: "dmg",
      mime: "application/x-apple-diskimage",
      description: "",
      signature: {
        0: 120,
        1: 1,
        2: 115,
        3: 13,
        4: 98,
        5: 98,
        6: 96
      },
      extractor: null
    }
  ],
  "Miscellaneous": [
    {
      name: "UTF-8 text",
      extension: "txt",
      mime: "text/plain",
      description: "UTF-8 encoded Unicode byte order mark, commonly but not exclusively seen in text files.",
      signature: {
        0: 239,
        1: 187,
        2: 191
      },
      extractor: null
    },
    {
      // Place before UTF-16 LE text
      name: "UTF-32 LE text",
      extension: "utf32le",
      mime: "charset/utf32le",
      description: "Little-endian UTF-32 encoded Unicode byte order mark.",
      signature: {
        0: 255,
        1: 254,
        2: 0,
        3: 0
      },
      extractor: null
    },
    {
      name: "UTF-16 LE text",
      extension: "utf16le",
      mime: "charset/utf16le",
      description: "Little-endian UTF-16 encoded Unicode byte order mark.",
      signature: {
        0: 255,
        1: 254
      },
      extractor: null
    },
    {
      name: "Web Open Font Format",
      extension: "woff",
      mime: "application/font-woff",
      description: "",
      signature: {
        0: 119,
        1: 79,
        2: 70,
        3: 70,
        4: 0,
        5: 1,
        6: 0,
        7: 0
      },
      extractor: null
    },
    {
      name: "Web Open Font Format 2",
      extension: "woff2",
      mime: "application/font-woff",
      description: "",
      signature: {
        0: 119,
        1: 79,
        2: 70,
        3: 50,
        4: 0,
        5: 1,
        6: 0,
        7: 0
      },
      extractor: null
    },
    {
      name: "Embedded OpenType font",
      extension: "eot",
      mime: "application/octet-stream",
      description: "",
      signature: [
        {
          8: 2,
          9: 0,
          10: 1,
          34: 76,
          35: 80
        },
        {
          8: 1,
          9: 0,
          10: 0,
          34: 76,
          35: 80
        },
        {
          8: 2,
          9: 0,
          10: 2,
          34: 76,
          35: 80
        }
      ],
      extractor: null
    },
    {
      name: "TrueType Font",
      extension: "ttf",
      mime: "application/font-sfnt",
      description: "",
      signature: {
        0: 0,
        1: 1,
        2: 0,
        3: 0,
        4: 0
      },
      extractor: null
    },
    {
      name: "OpenType Font",
      extension: "otf",
      mime: "application/font-sfnt",
      description: "",
      signature: {
        0: 79,
        1: 84,
        2: 84,
        3: 79,
        4: 0
      },
      extractor: null
    },
    {
      name: "SQLite",
      extension: "sqlite",
      mime: "application/x-sqlite3",
      description: "",
      signature: {
        0: 83,
        1: 81,
        2: 76,
        3: 105
      },
      extractor: extractSQLITE
    },
    {
      name: "BitTorrent link",
      extension: "torrent",
      mime: "application/x-bittorrent",
      description: "",
      signature: [
        {
          0: 100,
          // d8:announce##:
          1: 56,
          2: 58,
          3: 97,
          4: 110,
          5: 110,
          6: 111,
          7: 117,
          8: 110,
          9: 99,
          10: 101,
          11: 35,
          12: 35,
          13: 58
        },
        {
          0: 100,
          // d4:infod
          1: 52,
          2: 58,
          3: 105,
          4: 110,
          5: 102,
          6: 111,
          7: 100,
          8: [52, 53, 54],
          9: 58
        }
      ],
      extractor: null
    },
    {
      name: "Cryptocurrency wallet",
      extension: "wallet",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 1,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
        11: 0,
        12: 98,
        13: 49,
        14: 5,
        15: 0
      },
      extractor: null
    },
    {
      name: "Registry fragment",
      extension: "hbin",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 104,
        // hbin
        1: 98,
        2: 105,
        3: 110,
        4: 0
      },
      extractor: null
    },
    {
      name: "Registry script",
      extension: "rgs",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 72,
        // HKCR
        1: 75,
        2: 67,
        3: 82,
        4: 13,
        5: 10,
        6: 92,
        7: 123
      },
      extractor: null
    },
    {
      name: "WinNT Registry Hive",
      extension: "registry",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 114,
        1: 101,
        2: 103,
        3: 102
      },
      extractor: null
    },
    {
      name: "Windows Event Log",
      extension: "evt",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 48,
        1: 0,
        2: 0,
        3: 0,
        4: 76,
        5: 102,
        6: 76,
        7: 101
      },
      extractor: extractEVT
    },
    {
      name: "Windows Event Log",
      extension: "evtx",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 69,
        // ElfFile
        1: 108,
        2: 102,
        3: 70,
        4: 105,
        5: 108,
        6: 101
      },
      extractor: extractEVTX
    },
    {
      name: "Windows Pagedump",
      extension: "dmp",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 80,
        // PAGEDU(MP|64)
        1: 65,
        2: 71,
        3: 69,
        4: 68,
        5: 85,
        6: [77, 54],
        7: [80, 52]
      },
      extractor: extractDMP
    },
    {
      name: "Windows Prefetch",
      extension: "pf",
      mime: "application/x-pf",
      description: "",
      signature: {
        0: [17, 23, 26],
        1: 0,
        2: 0,
        3: 0,
        4: 83,
        5: 67,
        6: 67,
        7: 65
      },
      extractor: extractPF
    },
    {
      name: "Windows Prefetch (Win 10)",
      extension: "pf",
      mime: "application/x-pf",
      description: "",
      signature: {
        0: 77,
        1: 65,
        2: 77,
        3: 4,
        7: 0
      },
      extractor: extractPFWin10
    },
    {
      name: "PList (XML)",
      extension: "plist",
      mime: "application/xml",
      description: "",
      signature: {
        39: 60,
        // <!DOCTYPE plist
        40: 33,
        41: 68,
        42: 79,
        43: 67,
        44: 84,
        45: 89,
        46: 80,
        47: 69,
        48: 32,
        49: 112,
        50: 108,
        51: 105,
        52: 115,
        53: 116
      },
      extractor: extractPListXML
    },
    {
      name: "PList (binary)",
      extension: "bplist,plist,ipmeta,abcdp,mdbackup,mdinfo,strings,nib,ichat,qtz,webbookmark,webhistory",
      mime: "application/x-plist",
      description: "",
      signature: {
        0: 98,
        // bplist00
        1: 112,
        2: 108,
        3: 105,
        4: 115,
        5: 116,
        6: 48,
        7: 48
      },
      extractor: null
    },
    {
      name: "MacOS X Keychain",
      extension: "keychain",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 107,
        // kych
        1: 121,
        2: 99,
        3: 104,
        4: 0,
        5: 1
      },
      extractor: extractMacOSXKeychain
    },
    {
      name: "TCP Packet",
      extension: "tcp",
      mime: "application/tcp",
      description: "",
      signature: {
        12: 8,
        13: 0,
        14: 69,
        15: 0,
        21: 0,
        22: (b) => b >= 1 && b <= 128,
        23: 6
      },
      extractor: null
    },
    {
      name: "UDP Packet",
      extension: "udp",
      mime: "application/udp",
      description: "",
      signature: {
        12: 8,
        13: 0,
        14: 69,
        15: 0,
        16: [0, 1, 2, 3, 4, 5],
        22: (b) => b >= 1 && b <= 128,
        23: 17
      },
      extractor: null
    },
    {
      name: "Compiled HTML",
      extension: "chm,chw,chi",
      mime: "application/vnd.ms-htmlhelp",
      description: "",
      signature: {
        0: 73,
        // ITSF
        1: 84,
        2: 83,
        3: 70,
        4: 3,
        5: 0,
        6: 0,
        7: 0
      },
      extractor: null
    },
    {
      name: "Windows Password",
      extension: "pwl",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 227,
        1: 130,
        2: 133,
        3: 150
      },
      extractor: null
    },
    {
      name: "Bitlocker recovery key",
      extension: "bitlocker",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 255,
        1: 254,
        2: 66,
        3: 0,
        4: 105,
        5: 0,
        6: 116,
        7: 0,
        8: 76,
        9: 0,
        10: 111,
        11: 0,
        12: 99,
        13: 0,
        14: 107,
        15: 0,
        16: 101,
        17: 0,
        18: 114,
        19: 0,
        20: 32,
        21: 0
      },
      extractor: null
    },
    {
      name: "Certificate",
      extension: "cer,cat,p7b,p7c,p7m,p7s,swz,rsa,crl,crt,der",
      mime: "application/pkix-cert",
      description: "",
      signature: {
        0: 48,
        1: 130,
        4: [6, 10, 48]
      },
      extractor: null
    },
    {
      name: "Certificate",
      extension: "cat,swz,p7m",
      mime: "application/vnd.ms-pki.seccat",
      description: "",
      signature: {
        0: 48,
        1: 131,
        2: (b) => b !== 0,
        5: 6,
        6: 9
      },
      extractor: null
    },
    {
      name: "PGP pubring",
      extension: "pkr,gpg",
      mime: "application/pgp-keys",
      description: "",
      signature: {
        0: 153,
        1: 1,
        2: [13, 162],
        3: 4
      },
      extractor: null
    },
    {
      name: "PGP secring",
      extension: "skr",
      mime: "application/pgp-keys",
      description: "",
      signature: [
        {
          0: 149,
          1: 1,
          2: 207,
          3: 4
        },
        {
          0: 149,
          1: 3,
          2: 198,
          3: 4
        },
        {
          0: 149,
          1: 5,
          2: 134,
          3: 4
        }
      ],
      extractor: null
    },
    {
      name: "PGP Safe",
      extension: "pgd",
      mime: "application/pgp-keys",
      description: "",
      signature: {
        0: 80,
        // PGPdMAIN
        1: 71,
        2: 80,
        3: 100,
        4: 77,
        5: 65,
        6: 73,
        7: 78,
        8: 96,
        9: 1,
        10: 0
      },
      extractor: null
    },
    {
      name: "Task Scheduler",
      extension: "job",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: [0, 1, 2, 3],
        1: [5, 6],
        2: 1,
        3: 0,
        20: 70,
        21: 0
      },
      extractor: null
    },
    {
      name: "Windows Shortcut",
      extension: "lnk",
      mime: "application/x-ms-shortcut",
      description: "",
      signature: {
        0: 76,
        1: 0,
        2: 0,
        3: 0,
        4: 1,
        5: 20,
        6: 2,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
        11: 0,
        12: 192,
        13: 0,
        14: 0,
        15: 0,
        16: 0,
        17: 0,
        18: 0,
        19: 70
      },
      extractor: extractLNK
    },
    {
      name: "Bash",
      extension: "bash",
      mime: "application/bash",
      description: "",
      signature: {
        0: 35,
        // #!/bin/bash
        1: 33,
        2: 47,
        3: 98,
        4: 105,
        5: 110,
        6: 47,
        7: 98,
        8: 97,
        9: 115,
        10: 104
      },
      extractor: null
    },
    {
      name: "Shell",
      extension: "sh",
      mime: "application/sh",
      description: "",
      signature: {
        0: 35,
        // #!/bin/sh
        1: 33,
        2: 47,
        3: 98,
        4: 105,
        5: 110,
        6: 47,
        7: 115,
        8: 104
      },
      extractor: null
    },
    {
      name: "Python",
      extension: "py,pyc,pyd,pyo,pyw,pyz",
      mime: "application/python",
      description: "",
      signature: {
        0: 35,
        // #!/usr/bin/python(2|3)
        1: 33,
        2: 47,
        3: 117,
        4: 115,
        5: 114,
        6: 47,
        7: 98,
        8: 105,
        9: 110,
        10: 47,
        11: 112,
        12: 121,
        13: 116,
        14: 104,
        15: 111,
        16: 110,
        17: [50, 51, 10, 13]
      },
      extractor: null
    },
    {
      name: "Ruby",
      extension: "rb",
      mime: "application/ruby",
      description: "",
      signature: {
        0: 35,
        // #!/usr/bin/ruby
        1: 33,
        2: 47,
        3: 117,
        4: 115,
        5: 114,
        6: 47,
        7: 98,
        8: 105,
        9: 110,
        10: 47,
        11: 114,
        12: 117,
        13: 98,
        14: 121
      },
      extractor: null
    },
    {
      name: "perl",
      extension: "pl,pm,t,pod",
      mime: "application/perl",
      description: "",
      signature: {
        0: 35,
        // #!/usr/bin/perl
        1: 33,
        2: 47,
        3: 117,
        4: 115,
        5: 114,
        6: 47,
        7: 98,
        8: 105,
        9: 110,
        10: 47,
        11: 112,
        12: 101,
        13: 114,
        14: 108
      },
      extractor: null
    },
    {
      name: "php",
      extension: "php,phtml,php3,php4,php5,php7,phps,php-s,pht,phar",
      mime: "application/php",
      description: "",
      signature: {
        0: 60,
        // <?php
        1: 63,
        2: 112,
        3: 104,
        4: 112
      },
      extractor: null
    },
    {
      name: "Smile",
      extension: "sml",
      mime: "	application/x-jackson-smile",
      description: "",
      signature: {
        0: 58,
        1: 41,
        2: 10
      },
      extractor: null
    },
    {
      name: "Lua Bytecode",
      extension: "luac",
      mime: "application/x-lua",
      description: "",
      signature: {
        0: 27,
        1: 76,
        2: 117,
        3: 97
      },
      extractor: null
    },
    {
      name: "WebAssembly binary",
      extension: "wasm",
      mime: "application/octet-stream",
      description: "",
      signature: {
        0: 0,
        1: 97,
        2: 115,
        3: 109
      },
      extractor: null
    }
  ]
};
function extractJPEG(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  while (stream.hasMore()) {
    const marker = stream.getBytes(2);
    if (marker[0] !== 255) throw new Error(`Invalid marker while parsing JPEG at pos ${stream.position}: ${marker}`);
    let segmentSize = 0;
    switch (marker[1]) {
      // No length
      case 216:
      // Start of Image
      case 1:
        break;
      case 217:
        return stream.carve();
      // Variable size segment
      case 192:
      // Start of frame (Baseline DCT)
      case 193:
      // Start of frame (Extended sequential DCT)
      case 194:
      // Start of frame (Progressive DCT)
      case 195:
      // Start of frame (Lossless sequential)
      case 196:
      // Define Huffman Table
      case 197:
      // Start of frame (Differential sequential DCT)
      case 198:
      // Start of frame (Differential progressive DCT)
      case 199:
      // Start of frame (Differential lossless)
      case 200:
      // Reserved for JPEG extensions
      case 201:
      // Start of frame (Extended sequential DCT)
      case 202:
      // Start of frame (Progressive DCT)
      case 203:
      // Start of frame (Lossless sequential)
      case 204:
      // Define arithmetic conditioning table
      case 205:
      // Start of frame (Differential sequential DCT)
      case 206:
      // Start of frame (Differential progressive DCT)
      case 207:
      // Start of frame (Differential lossless)
      case 219:
      // Define Quantization Table
      case 222:
      // Define hierarchical progression
      case 224:
      // Application-specific
      case 225:
      // Application-specific
      case 226:
      // Application-specific
      case 227:
      // Application-specific
      case 228:
      // Application-specific
      case 229:
      // Application-specific
      case 230:
      // Application-specific
      case 231:
      // Application-specific
      case 232:
      // Application-specific
      case 233:
      // Application-specific
      case 234:
      // Application-specific
      case 235:
      // Application-specific
      case 236:
      // Application-specific
      case 237:
      // Application-specific
      case 238:
      // Application-specific
      case 239:
      // Application-specific
      case 254:
        segmentSize = stream.readInt(2, "be");
        stream.position += segmentSize - 2;
        break;
      // 1 byte
      case 223:
        stream.position++;
        break;
      // 2 bytes
      case 220:
      // Define number of lines
      case 221:
        stream.position += 2;
        break;
      // Start scan
      case 218:
        segmentSize = stream.readInt(2, "be");
        stream.position += segmentSize - 2;
        stream.continueUntil(255);
        break;
      // Continue through encoded data
      case 0:
      // Byte stuffing
      case 208:
      // Restart
      case 209:
      // Restart
      case 210:
      // Restart
      case 211:
      // Restart
      case 212:
      // Restart
      case 213:
      // Restart
      case 214:
      // Restart
      case 215:
        stream.continueUntil(255);
        break;
      default:
        stream.continueUntil(255);
        break;
    }
  }
  throw new Error("Unable to parse JPEG successfully");
}
function extractGIF(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.continueUntil([33, 255]);
  stream.continueUntil([33, 249]);
  stream.moveForwardsBy(2);
  while (stream.hasMore()) {
    stream.moveForwardsBy(stream.readInt(1) + 1);
    stream.moveForwardsBy(11);
    while (!Array.from(stream.getBytes(2)).equals([33, 249])) {
      stream.moveBackwardsBy(2);
      stream.moveForwardsBy(stream.readInt(1));
      if (!stream.readInt(1))
        break;
      stream.moveBackwardsBy(1);
    }
    if (stream.readInt(1) === 59)
      break;
    stream.moveForwardsBy(1);
  }
  return stream.carve();
}
function extractMZPE(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(60);
  const peAddress = stream.readInt(4, "le");
  stream.moveTo(peAddress);
  stream.moveForwardsBy(6);
  const numSections = stream.readInt(2, "le");
  stream.moveForwardsBy(16);
  const optionalMagic = stream.readInt(2, "le");
  const pe32Plus = optionalMagic === 523;
  const dataDirectoryOffset = pe32Plus ? 112 : 96;
  stream.moveForwardsBy(dataDirectoryOffset - 2);
  stream.moveForwardsBy(32);
  const certTableAddress = stream.readInt(4, "le");
  const certTableSize = stream.readInt(4, "le");
  if (certTableAddress > 0) {
    stream.moveTo(certTableAddress + certTableSize);
    return stream.carve();
  }
  stream.moveForwardsBy(88);
  stream.moveForwardsBy((numSections - 1) * 40);
  stream.moveForwardsBy(16);
  const rawDataSize = stream.readInt(4, "le");
  const rawDataAddress = stream.readInt(4, "le");
  stream.moveTo(rawDataAddress + rawDataSize);
  return stream.carve();
}
function extractPDF(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.continueUntil([37, 37, 69, 79, 70]);
  stream.moveForwardsBy(5);
  stream.consumeIf(13);
  stream.consumeIf(10);
  return stream.carve();
}
function extractZIP(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.continueUntil([80, 75, 5, 6]);
  stream.moveForwardsBy(20);
  const commentLength = stream.readInt(2, "le");
  stream.moveForwardsBy(commentLength);
  return stream.carve();
}
function extractMACHO(bytes, offset) {
  const MHCIGAM64 = "207250237254";
  const MHMAGIC64 = "254237250207";
  const MHCIGAM = "206250237254";
  function isMagic64(magic2) {
    return magic2 === MHCIGAM64 || magic2 === MHMAGIC64;
  }
  function shouldSwapBytes(magic2) {
    return magic2 === MHCIGAM || magic2 === MHCIGAM64;
  }
  function dumpSegmentCommands(stream2, offset2, isSwap, ncmds) {
    let total = 0;
    const LCSEGEMENT64 = 25;
    const LCSEGEMENT = 1;
    for (let i = 0; i < ncmds; i++) {
      stream2.moveTo(offset2);
      const cmd = stream2.readInt(4, isSwap);
      if (cmd === LCSEGEMENT64) {
        stream2.moveTo(offset2 + 48);
        total += stream2.readInt(8, isSwap);
        stream2.moveTo(offset2 + 4);
        offset2 += stream2.readInt(4, isSwap);
      } else if (cmd === LCSEGEMENT) {
        stream2.moveTo(offset2 + 36);
        total += stream2.readInt(4, isSwap);
        stream2.moveTo(offset2 + 4);
        offset2 += stream2.readInt(4, isSwap);
      }
    }
    return total;
  }
  function dumpMachHeader(stream2, is64, isSwap) {
    let loadCommandsOffset = 28;
    if (is64)
      loadCommandsOffset += 4;
    stream2.moveTo(16);
    const ncmds = stream2.readInt(4, isSwap);
    return dumpSegmentCommands(stream2, loadCommandsOffset, isSwap, ncmds);
  }
  const stream = new Stream(bytes.slice(offset));
  const magic = stream.getBytes(4).join("");
  stream.moveTo(dumpMachHeader(stream, isMagic64(magic), shouldSwapBytes(magic) ? "le" : "be"));
  return stream.carve();
}
function extractTAR(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  while (stream.hasMore()) {
    stream.moveForwardsBy(257);
    if (stream.getBytes(5).join("") !== [117, 115, 116, 97, 114].join("")) {
      stream.moveBackwardsBy(262);
      break;
    }
    stream.moveBackwardsBy(138);
    let fsize = 0;
    stream.getBytes(11).forEach((element, index) => {
      fsize += (element - 48).toString();
    });
    fsize = Math.ceil(parseInt(fsize, 8) / 512) * 512;
    stream.moveForwardsBy(fsize + 377);
  }
  stream.consumeWhile(0);
  return stream.carve();
}
function extractPNG(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(8);
  let chunkSize = 0, chunkType = "";
  while (chunkType !== "IEND") {
    chunkSize = stream.readInt(4, "be");
    chunkType = stream.readString(4);
    stream.moveForwardsBy(chunkSize + 4);
  }
  return stream.carve();
}
function extractWEBP(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(4);
  const fileSize = stream.readInt(4, "le");
  stream.moveForwardsBy(fileSize);
  return stream.carve();
}
function extractBMP(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(2);
  const bmpSize = stream.readInt(4, "le");
  stream.moveForwardsBy(bmpSize - 6);
  return stream.carve();
}
function extractICO(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(4);
  const numberFiles = stream.readInt(2, "le");
  stream.moveForwardsBy(8 + (numberFiles - 1) * 16);
  const fileSize = stream.readInt(4, "le");
  const fileOffset = stream.readInt(4, "le");
  stream.moveTo(fileOffset + fileSize);
  return stream.carve();
}
function extractTARGA(bytes, offset) {
  const stream = new Stream(bytes);
  stream.moveTo(offset - 8);
  const extensionOffset = stream.readInt(4, "le");
  const developerOffset = stream.readInt(4, "le");
  stream.moveBackwardsBy(8);
  function moveBackwardsUntilSize(maxSize, sizeOfSize) {
    for (let i = 0; i < maxSize; i++) {
      stream.moveBackwardsBy(1);
      const size = stream.readInt(sizeOfSize, "le") - 1;
      stream.moveBackwardsBy(sizeOfSize);
      if (size === i)
        break;
    }
  }
  function moveBackwardsUntilImageSize() {
    stream.moveBackwardsBy(5);
    for (let i = 0; i < 1048576; i++) {
      const total = stream.readInt(2, "le") * stream.readInt(2, "le") * stream.readInt(1) / 8;
      if (total === i - 1)
        break;
      stream.moveBackwardsBy(6);
    }
  }
  if (extensionOffset || developerOffset) {
    if (extensionOffset) {
      moveBackwardsUntilSize(65535, 2);
      stream.moveBackwardsBy(extensionOffset);
    } else if (developerOffset) {
      moveBackwardsUntilSize(4294967295, 4);
      stream.moveBackwardsBy(6);
      stream.moveBackwardsBy(developerOffset);
    }
  } else {
    moveBackwardsUntilImageSize();
    stream.moveBackwardsBy(12 + 5);
  }
  return stream.carve(stream.position, offset + 18);
}
function extractWAV(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(4);
  stream.moveTo(stream.readInt(4, "le") + 8);
  return stream.carve();
}
function extractMP3(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  const bitRateIndexes = ["free", 32e3, 4e4, 48e3, 56e3, 64e3, 8e4, 96e3, 112e3, 128e3, 16e4, 192e3, 224e3, 256e3, 32e4, "bad"];
  const samplingRateFrequencyIndex = [44100, 48e3, 32e3, "reserved"];
  if (stream.getBytes(3).toString() === [73, 68, 51].toString()) {
    stream.moveTo(6);
    const tagSize = stream.readInt(1) << 21 | stream.readInt(1) << 14 | stream.readInt(1) << 7 | stream.readInt(1);
    stream.moveForwardsBy(tagSize);
  } else {
    stream.moveTo(0);
  }
  while (stream.hasMore()) {
    if (stream.getBytes(3) === [84, 65, 71].toString()) {
      stream.moveForwardsBy(125);
      break;
    }
    if (stream.getBytes(2).toString() !== [255, 251].toString()) {
      stream.moveBackwardsBy(2);
      break;
    }
    const flags = stream.readInt(1);
    const bitRate = bitRateIndexes[flags >> 4];
    const sampleRate = samplingRateFrequencyIndex[(flags & 15) >> 2];
    const padding = (flags & 2) >> 1;
    if (bitRate === "free" || bitRate === "bad" || sampleRate === "reserved") {
      stream.moveBackwardsBy(1);
      break;
    }
    const frameSize = Math.floor(144 * bitRate / sampleRate + padding);
    if (stream.position + frameSize > stream.length) {
      stream.moveTo(stream.length);
      break;
    } else {
      stream.moveForwardsBy(frameSize - 3);
    }
  }
  return stream.carve();
}
function extractFLV(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(5);
  const headerSize = stream.readInt(4, "be");
  stream.moveForwardsBy(headerSize - 9);
  let tagSize = -11;
  while (stream.hasMore()) {
    const prevTagSize = stream.readInt(4, "be");
    const tagType = stream.readInt(1);
    if ([8, 9, 18].indexOf(tagType) < 0) {
      stream.moveBackwardsBy(1);
      break;
    }
    if (prevTagSize !== tagSize + 11) {
      stream.moveBackwardsBy(tagSize + 11 + 5);
      break;
    }
    tagSize = stream.readInt(3, "be");
    stream.moveForwardsBy(7 + tagSize);
  }
  return stream.carve();
}
function extractRTF(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  let openTags = 0;
  if (stream.readInt(1) !== 123) {
    throw new Error("Not a valid RTF file");
  } else {
    openTags++;
  }
  while (openTags > 0 && stream.hasMore()) {
    switch (stream.readInt(1)) {
      case 123:
        openTags++;
        break;
      case 125:
        openTags--;
        break;
      case 92:
        stream.consumeIf(92);
        stream.position++;
        break;
      default:
        break;
    }
  }
  return stream.carve();
}
function extractSQLITE(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(16);
  const pageSize = stream.readInt(2);
  stream.moveTo(28);
  const numPages = stream.readInt(4);
  stream.moveTo(pageSize * numPages);
  return stream.carve();
}
function extractPListXML(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  let braceCount = 0;
  stream.continueUntil([60, 112, 108, 105, 115, 116]);
  stream.moveForwardsBy(6);
  braceCount++;
  while (braceCount > 0 && stream.hasMore()) {
    if (stream.readInt(1) === 60) {
      if (stream.getBytes(5).join("") === [112, 108, 105, 115, 116].join("")) {
        braceCount++;
      } else {
        stream.moveBackwardsBy(5);
      }
      if (stream.getBytes(7).join("") === [47, 112, 108, 105, 115, 116, 62].join("")) {
        braceCount--;
      } else {
        stream.moveBackwardsBy(7);
      }
    }
  }
  stream.consumeIf(10);
  return stream.carve();
}
function extractMacOSXKeychain(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(20);
  stream.moveForwardsBy(stream.readInt(4));
  return stream.carve();
}
function extractGZIP(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(3);
  const flags = stream.readInt(1);
  stream.moveForwardsBy(4);
  stream.readInt(1);
  stream.moveForwardsBy(1);
  if (flags & 4) {
    const extraFieldsSize = stream.readInt(2, "le");
    stream.moveForwardsby(extraFieldsSize);
  }
  if (flags & 8) {
    stream.continueUntil(0);
    stream.moveForwardsBy(1);
  }
  if (flags & 16) {
    stream.continueUntil(0);
    stream.moveForwardsBy(1);
  }
  if (flags & 2) {
    stream.moveForwardsBy(2);
  }
  parseDEFLATE(stream);
  stream.moveForwardsBy(8);
  return stream.carve();
}
function extractBZIP2(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  const lookingfor = [
    [119, 36, 83, 133, 9],
    [238, 72, 167, 10, 18],
    [220, 145, 78, 20, 36],
    [185, 34, 156, 40, 72],
    [114, 69, 56, 80, 144],
    [187, 146, 41, 194, 132],
    [93, 201, 20, 225, 66],
    [46, 228, 138, 112, 161],
    [23, 114, 69, 56, 80]
  ];
  for (let i = 0; i < lookingfor.length; i++) {
    stream.continueUntil(lookingfor[i]);
    if (stream.getBytes(5).join("") === lookingfor[i].join(""))
      break;
    stream.moveTo(0);
  }
  stream.moveForwardsBy(4);
  return stream.carve();
}
function extractZlib(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(1);
  const flags = stream.readInt(1);
  if (flags & 32) {
    stream.moveForwardsBy(4);
  }
  parseDEFLATE(stream);
  stream.moveForwardsBy(4);
  return stream.carve();
}
function extractXZ(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.continueUntil([0, 0, 0, 0, 4, 89, 90]);
  stream.moveForwardsBy(7);
  return stream.carve();
}
function extractDEB(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(8);
  while (stream.hasMore()) {
    stream.moveForwardsBy(48);
    let fsize = "";
    for (const elem of stream.getBytes(10)) {
      fsize += String.fromCharCode(elem);
    }
    fsize = parseInt(fsize.trim(), 10);
    stream.moveForwardsBy(2);
    stream.moveForwardsBy(fsize);
  }
  return stream.carve();
}
function extractELF(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveForwardsBy(4);
  const x86 = stream.readInt(1) === 1;
  const endian = stream.readInt(1) === 1 ? "le" : "be";
  stream.moveForwardsBy(x86 ? 26 : 34);
  const shoff = x86 ? stream.readInt(4, endian) : stream.readInt(8, endian);
  stream.moveForwardsBy(10);
  const shentsize = stream.readInt(2, endian);
  const shnum = stream.readInt(2, endian);
  stream.moveTo(shoff);
  stream.moveForwardsBy(shentsize * shnum);
  return stream.carve();
}
var fixedLiteralTableLengths = new Array(288);
for (let i = 0; i < fixedLiteralTableLengths.length; i++) {
  fixedLiteralTableLengths[i] = i <= 143 ? 8 : i <= 255 ? 9 : i <= 279 ? 7 : 8;
}
var fixedLiteralTable = buildHuffmanTable(fixedLiteralTableLengths);
var fixedDistanceTableLengths = new Array(30).fill(5);
var fixedDistanceTable = buildHuffmanTable(fixedDistanceTableLengths);
var huffmanOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
function parseDEFLATE(stream) {
  let finalBlock = 0;
  while (!finalBlock) {
    finalBlock = stream.readBits(1, "le");
    const blockType = stream.readBits(2, "le");
    if (blockType === 0) {
      stream.moveForwardsBy(1);
      const blockLength = stream.readInt(2, "le");
      stream.moveForwardsBy(2 + blockLength);
    } else if (blockType === 1) {
      parseHuffmanBlock(stream, fixedLiteralTable, fixedDistanceTable);
    } else if (blockType === 2) {
      const hlit = stream.readBits(5, "le") + 257;
      const hdist = stream.readBits(5, "le") + 1;
      const hclen = stream.readBits(4, "le") + 4;
      const codeLengths = new Uint8Array(huffmanOrder.length);
      for (let i = 0; i < hclen; i++) {
        codeLengths[huffmanOrder[i]] = stream.readBits(3, "le");
      }
      const codeLengthsTable = buildHuffmanTable(codeLengths);
      const lengthTable = new Uint8Array(hlit + hdist);
      let code, repeat, prev;
      for (let i = 0; i < hlit + hdist; ) {
        code = readHuffmanCode(stream, codeLengthsTable);
        switch (code) {
          case 16:
            repeat = 3 + stream.readBits(2, "le");
            while (repeat--) lengthTable[i++] = prev;
            break;
          case 17:
            repeat = 3 + stream.readBits(3, "le");
            while (repeat--) lengthTable[i++] = 0;
            prev = 0;
            break;
          case 18:
            repeat = 11 + stream.readBits(7, "le");
            while (repeat--) lengthTable[i++] = 0;
            prev = 0;
            break;
          default:
            lengthTable[i++] = code;
            prev = code;
            break;
        }
      }
      const dynamicLiteralTable = buildHuffmanTable(lengthTable.subarray(0, hlit));
      const dynamicDistanceTable = buildHuffmanTable(lengthTable.subarray(hlit));
      parseHuffmanBlock(stream, dynamicLiteralTable, dynamicDistanceTable);
    } else {
      throw new Error(`Invalid block type while parsing DEFLATE stream at pos ${stream.position}`);
    }
  }
  if (stream.bitPos > 0)
    stream.moveForwardsBy(1);
}
var lengthExtraTable = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  0,
  0
];
var distanceExtraTable = [
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13
];
function parseHuffmanBlock(stream, litTab, distTab) {
  let code;
  let loops = 0;
  while (code = readHuffmanCode(stream, litTab)) {
    if (code === 256) break;
    if (++loops > 1e4)
      throw new Error("Caught in probable infinite loop while parsing Huffman Block");
    if (code < 256) continue;
    stream.readBits(lengthExtraTable[code - 257], "le");
    code = readHuffmanCode(stream, distTab);
    stream.readBits(distanceExtraTable[code], "le");
  }
}
function buildHuffmanTable(lengths) {
  const maxCodeLength = Math.max.apply(Math, lengths);
  const minCodeLength = Math.min.apply(Math, lengths);
  const size = 1 << maxCodeLength;
  const table = new Uint32Array(size);
  for (let bitLength = 1, code = 0, skip = 2; bitLength <= maxCodeLength; ) {
    for (let i = 0; i < lengths.length; i++) {
      if (lengths[i] === bitLength) {
        let reversed, rtemp, j;
        for (reversed = 0, rtemp = code, j = 0; j < bitLength; j++) {
          reversed = reversed << 1 | rtemp & 1;
          rtemp >>= 1;
        }
        const value = bitLength << 16 | i;
        for (let j2 = reversed; j2 < size; j2 += skip) {
          table[j2] = value;
        }
        code++;
      }
    }
    bitLength++;
    code <<= 1;
    skip <<= 1;
  }
  return [table, maxCodeLength, minCodeLength];
}
function readHuffmanCode(stream, table) {
  const [codeTable, maxCodeLength] = table;
  const bitsBuf = stream.readBits(maxCodeLength, "le");
  const codeWithLength = codeTable[bitsBuf & (1 << maxCodeLength) - 1];
  const codeLength = codeWithLength >>> 16;
  if (codeLength > maxCodeLength) {
    throw new Error(`Invalid Huffman Code length while parsing DEFLATE block at pos ${stream.position}: ${codeLength}`);
  }
  stream.moveBackwardsByBits(maxCodeLength - codeLength);
  return codeWithLength & 65535;
}
function extractEVTX(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(40);
  const total = stream.readInt(4, "le") - 44;
  stream.moveForwardsBy(total);
  while (stream.hasMore()) {
    if (stream.getBytes(7).join("") !== [69, 108, 102, 67, 104, 110, 107].join(""))
      break;
    stream.moveForwardsBy(65529);
  }
  stream.consumeWhile(0);
  return stream.carve();
}
function extractEVT(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(20);
  const eofOffset = stream.readInt(4, "le");
  stream.moveTo(eofOffset);
  const eofSize = stream.readInt(4, "le");
  stream.moveForwardsBy(eofSize - 4);
  return stream.carve();
}
function extractDMP(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(112);
  stream.moveTo((stream.readInt(4, "le") + 1) * 4096);
  return stream.carve();
}
function extractPF(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(12);
  stream.moveTo(stream.readInt(4, "be"));
  return stream.carve();
}
function extractPFWin10(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(stream.readInt(4, "be"));
  return stream.carve();
}
function extractLNK(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  stream.moveTo(52);
  stream.moveTo(stream.readInt(4, "le"));
  return stream.carve();
}
function extractLZOP(bytes, offset) {
  const stream = new Stream(bytes.slice(offset));
  const F_ADLER32_D = 1;
  const F_ADLER32_C = 2;
  const F_CRC32_D = 256;
  const F_CRC32_C = 512;
  const F_H_FILTER = 2048;
  const F_H_EXTRA_FIELD = 64;
  let numCheckSumC = 0, numCheckSumD = 0;
  stream.moveForwardsBy(9);
  const version = stream.readInt(2, "be");
  stream.moveForwardsBy(6);
  const flags = stream.readInt(4, "be");
  if (version & F_H_FILTER)
    stream.moveForwardsBy(4);
  if (flags & F_ADLER32_C)
    numCheckSumC++;
  if (flags & F_CRC32_C)
    numCheckSumC++;
  if (flags & F_ADLER32_D)
    numCheckSumD++;
  if (flags & F_CRC32_D)
    numCheckSumD++;
  stream.moveForwardsBy(8);
  if (version >= 2368)
    stream.moveForwardsBy(4);
  const fnameSize = stream.readInt(1, "be");
  stream.moveForwardsBy(fnameSize);
  if (flags & F_H_EXTRA_FIELD) {
    const extraSize = stream.readInt(4, "be");
    stream.moveForwardsBy(extraSize);
  }
  stream.moveForwardsBy(4);
  while (stream.hasMore()) {
    const uncompSize = stream.readInt(4, "be");
    if (uncompSize === 0)
      break;
    const compSize = stream.readInt(4, "be");
    const numCheckSumSkip = uncompSize === compSize ? numCheckSumD : numCheckSumD + numCheckSumC;
    stream.moveForwardsBy(compSize + numCheckSumSkip * 4);
  }
  return stream.carve();
}

function signatureMatches(sig, buf, offset = 0) {
  if (sig.length) {
    for (let i = 0; i < sig.length; i++) {
      if (bytesMatch(sig[i], buf, offset)) return true;
    }
    return false;
  } else {
    return bytesMatch(sig, buf, offset);
  }
}
function bytesMatch(sig, buf, offset = 0) {
  for (const sigoffset in sig) {
    const pos = parseInt(sigoffset, 10) + offset;
    switch (typeof sig[sigoffset]) {
      case "number":
        if (buf[pos] !== sig[sigoffset])
          return false;
        break;
      case "object":
        if (sig[sigoffset].indexOf(buf[pos]) < 0)
          return false;
        break;
      case "function":
        if (!sig[sigoffset](buf[pos]))
          return false;
        break;
      default:
        throw new Error(`Unrecognised signature type at offset ${sigoffset}`);
    }
  }
  return true;
}
function detectFileType(buf, categories = Object.keys(FILE_SIGNATURES)) {
  if (buf instanceof ArrayBuffer) {
    buf = new Uint8Array(buf);
  }
  if (!(buf && buf.length > 1)) {
    return [];
  }
  const matchingFiles = [];
  const signatures = {};
  for (const cat in FILE_SIGNATURES) {
    if (categories.includes(cat)) {
      signatures[cat] = FILE_SIGNATURES[cat];
    }
  }
  for (const cat in signatures) {
    const category = signatures[cat];
    category.forEach((filetype) => {
      if (signatureMatches(filetype.signature, buf)) {
        matchingFiles.push(filetype);
      }
    });
  }
  return matchingFiles;
}
function isType(type, buf) {
  const types = detectFileType(buf);
  if (!types.length) return false;
  if (typeof type === "string") {
    return types.reduce((acc, t) => {
      const mime = t.mime.startsWith(type) ? t.mime : false;
      return acc || mime;
    }, false);
  } else if (type instanceof RegExp) {
    return types.reduce((acc, t) => {
      const mime = type.test(t.mime) ? t.mime : false;
      return acc || mime;
    }, false);
  } else {
    throw new Error("Invalid type input.");
  }
}

var CHR_ENC_CODE_PAGES = {
  "UTF-8 (65001)": 65001,
  "UTF-7 (65000)": 65e3,
  "UTF-16LE (1200)": 1200,
  "UTF-16BE (1201)": 1201,
  "UTF-32LE (12000)": 12e3,
  "UTF-32BE (12001)": 12001,
  "IBM EBCDIC International (500)": 500,
  "IBM EBCDIC US-Canada (37)": 37,
  "IBM EBCDIC Multilingual/ROECE (Latin 2) (870)": 870,
  "IBM EBCDIC Greek Modern (875)": 875,
  "IBM EBCDIC French (1010)": 1010,
  "IBM EBCDIC Turkish (Latin 5) (1026)": 1026,
  "IBM EBCDIC Latin 1/Open System (1047)": 1047,
  "IBM EBCDIC Lao (1132/1133/1341)": 1132,
  "IBM EBCDIC US-Canada (037 + Euro symbol) (1140)": 1140,
  "IBM EBCDIC Germany (20273 + Euro symbol) (1141)": 1141,
  "IBM EBCDIC Denmark-Norway (20277 + Euro symbol) (1142)": 1142,
  "IBM EBCDIC Finland-Sweden (20278 + Euro symbol) (1143)": 1143,
  "IBM EBCDIC Italy (20280 + Euro symbol) (1144)": 1144,
  "IBM EBCDIC Latin America-Spain (20284 + Euro symbol) (1145)": 1145,
  "IBM EBCDIC United Kingdom (20285 + Euro symbol) (1146)": 1146,
  "IBM EBCDIC France (20297 + Euro symbol) (1147)": 1147,
  "IBM EBCDIC International (500 + Euro symbol) (1148)": 1148,
  "IBM EBCDIC Icelandic (20871 + Euro symbol) (1149)": 1149,
  "IBM EBCDIC Germany (20273)": 20273,
  "IBM EBCDIC Denmark-Norway (20277)": 20277,
  "IBM EBCDIC Finland-Sweden (20278)": 20278,
  "IBM EBCDIC Italy (20280)": 20280,
  "IBM EBCDIC Latin America-Spain (20284)": 20284,
  "IBM EBCDIC United Kingdom (20285)": 20285,
  "IBM EBCDIC Japanese Katakana Extended (20290)": 20290,
  "IBM EBCDIC France (20297)": 20297,
  "IBM EBCDIC Arabic (20420)": 20420,
  "IBM EBCDIC Greek (20423)": 20423,
  "IBM EBCDIC Hebrew (20424)": 20424,
  "IBM EBCDIC Korean Extended (20833)": 20833,
  "IBM EBCDIC Thai (20838)": 20838,
  "IBM EBCDIC Icelandic (20871)": 20871,
  "IBM EBCDIC Cyrillic Russian (20880)": 20880,
  "IBM EBCDIC Turkish (20905)": 20905,
  "IBM EBCDIC Latin 1/Open System (1047 + Euro symbol) (20924)": 20924,
  "IBM EBCDIC Cyrillic Serbian-Bulgarian (21025)": 21025,
  "OEM United States (437)": 437,
  "OEM Greek (formerly 437G); Greek (DOS) (737)": 737,
  "OEM Baltic; Baltic (DOS) (775)": 775,
  "OEM Russian; Cyrillic + Euro symbol (808)": 808,
  "OEM Multilingual Latin 1; Western European (DOS) (850)": 850,
  "OEM Latin 2; Central European (DOS) (852)": 852,
  "OEM Cyrillic (primarily Russian) (855)": 855,
  "OEM Turkish; Turkish (DOS) (857)": 857,
  "OEM Multilingual Latin 1 + Euro symbol (858)": 858,
  "OEM Portuguese; Portuguese (DOS) (860)": 860,
  "OEM Icelandic; Icelandic (DOS) (861)": 861,
  "OEM Hebrew; Hebrew (DOS) (862)": 862,
  "OEM French Canadian; French Canadian (DOS) (863)": 863,
  "OEM Arabic; Arabic (864) (864)": 864,
  "OEM Nordic; Nordic (DOS) (865)": 865,
  "OEM Russian; Cyrillic (DOS) (866)": 866,
  "OEM Modern Greek; Greek, Modern (DOS) (869)": 869,
  "OEM Cyrillic (primarily Russian) + Euro Symbol (872)": 872,
  "Windows-874 Thai (874)": 874,
  "Windows-1250 Central European (1250)": 1250,
  "Windows-1251 Cyrillic (1251)": 1251,
  "Windows-1252 Latin (1252)": 1252,
  "Windows-1253 Greek (1253)": 1253,
  "Windows-1254 Turkish (1254)": 1254,
  "Windows-1255 Hebrew (1255)": 1255,
  "Windows-1256 Arabic (1256)": 1256,
  "Windows-1257 Baltic (1257)": 1257,
  "Windows-1258 Vietnam (1258)": 1258,
  "ISO-8859-1 Latin 1 Western European (28591)": 28591,
  "ISO-8859-2 Latin 2 Central European (28592)": 28592,
  "ISO-8859-3 Latin 3 South European (28593)": 28593,
  "ISO-8859-4 Latin 4 North European (28594)": 28594,
  "ISO-8859-5 Latin/Cyrillic (28595)": 28595,
  "ISO-8859-6 Latin/Arabic (28596)": 28596,
  "ISO-8859-7 Latin/Greek (28597)": 28597,
  "ISO-8859-8 Latin/Hebrew (28598)": 28598,
  "ISO 8859-8 Hebrew (ISO-Logical) (38598)": 38598,
  "ISO-8859-9 Latin 5 Turkish (28599)": 28599,
  "ISO-8859-10 Latin 6 Nordic (28600)": 28600,
  "ISO-8859-11 Latin/Thai (28601)": 28601,
  "ISO-8859-13 Latin 7 Baltic Rim (28603)": 28603,
  "ISO-8859-14 Latin 8 Celtic (28604)": 28604,
  "ISO-8859-15 Latin 9 (28605)": 28605,
  "ISO-8859-16 Latin 10 (28606)": 28606,
  "ISO 2022 JIS Japanese with no halfwidth Katakana (50220)": 50220,
  "ISO 2022 JIS Japanese with halfwidth Katakana (50221)": 50221,
  "ISO 2022 Japanese JIS X 0201-1989 (1 byte Kana-SO/SI) (50222)": 50222,
  "ISO 2022 Korean (50225)": 50225,
  "ISO 2022 Simplified Chinese (50227)": 50227,
  "ISO 6937 Non-Spacing Accent (20269)": 20269,
  "EUC Japanese (51932)": 51932,
  "EUC Simplified Chinese (51936)": 51936,
  "EUC Korean (51949)": 51949,
  "ISCII Devanagari (57002)": 57002,
  "ISCII Bengali (57003)": 57003,
  "ISCII Tamil (57004)": 57004,
  "ISCII Telugu (57005)": 57005,
  "ISCII Assamese (57006)": 57006,
  "ISCII Oriya (57007)": 57007,
  "ISCII Kannada (57008)": 57008,
  "ISCII Malayalam (57009)": 57009,
  "ISCII Gujarati (57010)": 57010,
  "ISCII Punjabi (57011)": 57011,
  "Japanese Shift-JIS (932)": 932,
  "Simplified Chinese GBK (936)": 936,
  "Korean (949)": 949,
  "Traditional Chinese Big5 (950)": 950,
  "US-ASCII (7-bit) (20127)": 20127,
  "Simplified Chinese GB2312 (20936)": 20936,
  "KOI8-R Russian Cyrillic (20866)": 20866,
  "KOI8-U Ukrainian Cyrillic (21866)": 21866,
  "Mazovia (Polish) MS-DOS (620)": 620,
  "Arabic (ASMO 708) (708)": 708,
  "Arabic (Transparent ASMO); Arabic (DOS) (720)": 720,
  "Kamenick\xFD (Czech) MS-DOS (895)": 895,
  "Korean (Johab) (1361)": 1361,
  "MAC Roman (10000)": 1e4,
  "Japanese (Mac) (10001)": 10001,
  "MAC Traditional Chinese (Big5) (10002)": 10002,
  "Korean (Mac) (10003)": 10003,
  "Arabic (Mac) (10004)": 10004,
  "Hebrew (Mac) (10005)": 10005,
  "Greek (Mac) (10006)": 10006,
  "Cyrillic (Mac) (10007)": 10007,
  "MAC Simplified Chinese (GB 2312) (10008)": 10008,
  "Romanian (Mac) (10010)": 10010,
  "Ukrainian (Mac) (10017)": 10017,
  "Thai (Mac) (10021)": 10021,
  "MAC Latin 2 (Central European) (10029)": 10029,
  "Icelandic (Mac) (10079)": 10079,
  "Turkish (Mac) (10081)": 10081,
  "Croatian (Mac) (10082)": 10082,
  "CNS Taiwan (Chinese Traditional) (20000)": 2e4,
  "TCA Taiwan (20001)": 20001,
  "ETEN Taiwan (Chinese Traditional) (20002)": 20002,
  "IBM5550 Taiwan (20003)": 20003,
  "TeleText Taiwan (20004)": 20004,
  "Wang Taiwan (20005)": 20005,
  "Western European IA5 (IRV International Alphabet 5) (20105)": 20105,
  "IA5 German (7-bit) (20106)": 20106,
  "IA5 Swedish (7-bit) (20107)": 20107,
  "IA5 Norwegian (7-bit) (20108)": 20108,
  "T.61 (20261)": 20261,
  "Japanese (JIS 0208-1990 and 0212-1990) (20932)": 20932,
  "Korean Wansung (20949)": 20949,
  "Extended/Ext Alpha Lowercase (21027)": 21027,
  "Europa 3 (29001)": 29001,
  "Atari ST/TT (47451)": 47451,
  "HZ-GB2312 Simplified Chinese (52936)": 52936,
  "Simplified Chinese GB18030 (54936)": 54936
};
var CHR_ENC_SIMPLE_LOOKUP = {};
var CHR_ENC_SIMPLE_REVERSE_LOOKUP = {};
for (const name in CHR_ENC_CODE_PAGES) {
  const simpleName = name.match(/(^.+)\([\d/]+\)$/)[1];
  CHR_ENC_SIMPLE_LOOKUP[simpleName] = CHR_ENC_CODE_PAGES[name];
  CHR_ENC_SIMPLE_REVERSE_LOOKUP[CHR_ENC_CODE_PAGES[name]] = simpleName;
}
function isUTF8(data) {
  const bytes = new Uint8Array(data);
  let i = 0;
  let onlyASCII = true;
  while (i < bytes.length) {
    if (
      // ASCII
      bytes[i] === 9 || bytes[i] === 10 || bytes[i] === 13 || 32 <= bytes[i] && bytes[i] <= 126
    ) {
      i += 1;
      continue;
    }
    onlyASCII = false;
    if (
      // non-overlong 2-byte
      194 <= bytes[i] && bytes[i] <= 223 && (128 <= bytes[i + 1] && bytes[i + 1] <= 191)
    ) {
      i += 2;
      continue;
    }
    if (
      // excluding overlongs
      bytes[i] === 224 && (160 <= bytes[i + 1] && bytes[i + 1] <= 191) && (128 <= bytes[i + 2] && bytes[i + 2] <= 191) || // straight 3-byte
      (225 <= bytes[i] && bytes[i] <= 236 || bytes[i] === 238 || bytes[i] === 239) && (128 <= bytes[i + 1] && bytes[i + 1] <= 191) && (128 <= bytes[i + 2] && bytes[i + 2] <= 191) || // excluding surrogates
      bytes[i] === 237 && (128 <= bytes[i + 1] && bytes[i + 1] <= 159) && (128 <= bytes[i + 2] && bytes[i + 2] <= 191)
    ) {
      i += 3;
      continue;
    }
    if (
      // planes 1-3
      bytes[i] === 240 && (144 <= bytes[i + 1] && bytes[i + 1] <= 191) && (128 <= bytes[i + 2] && bytes[i + 2] <= 191) && (128 <= bytes[i + 3] && bytes[i + 3] <= 191) || // planes 4-15
      241 <= bytes[i] && bytes[i] <= 243 && (128 <= bytes[i + 1] && bytes[i + 1] <= 191) && (128 <= bytes[i + 2] && bytes[i + 2] <= 191) && (128 <= bytes[i + 3] && bytes[i + 3] <= 191) || // plane 16
      bytes[i] === 244 && (128 <= bytes[i + 1] && bytes[i + 1] <= 143) && (128 <= bytes[i + 2] && bytes[i + 2] <= 191) && (128 <= bytes[i + 3] && bytes[i + 3] <= 191)
    ) {
      i += 4;
      continue;
    }
    return 0;
  }
  return onlyASCII ? 1 : 2;
}

var import_chi_squared = __toESM(require_chisq(), 1);
var Magic = class _Magic {
  /**
   * Magic constructor.
   *
   * @param {ArrayBuffer} buf
   * @param {Object[]} [opCriteria]
   * @param {Object} [prevOp]
   */
  constructor(buf, opCriteria = _Magic._generateOpCriteria(), prevOp = null) {
    this.inputBuffer = new Uint8Array(buf);
    this.inputStr = magic_utils_shim_default.arrayBufferToStr(buf);
    this.opCriteria = opCriteria;
    this.prevOp = prevOp;
  }
  /**
   * Finds operations that claim to be able to decode the input based on various criteria.
   *
   * @returns {Object[]}
   */
  findMatchingInputOps() {
    const matches = [], inputEntropy = this.calcEntropy();
    this.opCriteria.forEach((check) => {
      if (check.entropyRange && (inputEntropy < check.entropyRange[0] || inputEntropy > check.entropyRange[1]))
        return;
      if (check.pattern && !check.pattern.test(this.inputStr))
        return;
      matches.push(check);
    });
    return matches;
  }
  /**
   * Attempts to detect the language of the input by comparing its byte frequency
   * to that of several known languages.
   *
   * @param {boolean} [extLang=false] - Extensive language support (false = only check the most
   *                                    common Internet languages)
   * @returns {Object[]}
   */
  detectLanguage(extLang = false) {
    if (!this.inputBuffer.length) return [{
      lang: "Unknown",
      score: Math.MAX_VALUE,
      probability: Math.MIN_VALUE
    }];
    const inputFreq = this._freqDist();
    const langFreqs = extLang ? EXTENSIVE_LANG_FREQS : COMMON_LANG_FREQS;
    const chiSqrs = [];
    for (const lang in langFreqs) {
      const [score, prob] = _Magic._chiSqr(inputFreq, langFreqs[lang]);
      chiSqrs.push({
        lang,
        score,
        probability: prob
      });
    }
    chiSqrs.sort((a, b) => {
      return a.score - b.score;
    });
    return chiSqrs;
  }
  /**
   * Detects any matching file types for the input.
   *
   * @returns {Object} type
   * @returns {string} type.ext - File extension
   * @returns {string} type.mime - Mime type
   * @returns {string} [type.desc] - Description
   */
  detectFileType() {
    const fileType = detectFileType(this.inputBuffer);
    if (!fileType.length) return null;
    return {
      name: fileType[0].name,
      ext: fileType[0].extension,
      mime: fileType[0].mime,
      desc: fileType[0].description
    };
  }
  /**
   * Calculates the Shannon entropy of the input data.
   *
   * @returns {number}
   */
  calcEntropy(data = this.inputBuffer, standalone = false) {
    if (!standalone && this.inputEntropy) return this.inputEntropy;
    const prob = this._freqDist(data, standalone);
    let entropy = 0, p;
    for (let i = 0; i < prob.length; i++) {
      p = prob[i] / 100;
      if (p === 0) continue;
      entropy += p * Math.log(p) / Math.log(2);
    }
    if (!standalone) this.inputEntropy = -entropy;
    return -entropy;
  }
  /**
   * Generate various simple brute-forced encodings of the data (trucated to 100 bytes).
   *
   * @returns {Object[]} - The encoded data and an operation config to generate it.
   */
  async bruteForce() {
    const sample = new Uint8Array(this.inputBuffer).slice(0, 100);
    const results = [];
    for (let i = 1; i < 256; i++) {
      results.push({
        data: sample.map((b) => b ^ i).buffer,
        conf: {
          op: "XOR",
          args: [{ "option": "Hex", "string": i.toString(16) }, "Standard", false]
        }
      });
    }
    for (let i = 1; i < 8; i++) {
      results.push({
        data: sample.map((b) => b >> i | (b & Math.pow(2, i) - 1) << 8 - i).buffer,
        conf: {
          op: "Rotate right",
          args: [i, false]
        }
      });
    }
    const encodings = magic_opconfig_default["Encode text"].args[0].value;
    const testEnc = async (op) => {
      for (let i = 0; i < encodings.length; i++) {
        const conf = {
          op,
          args: [encodings[i]]
        };
        try {
          const data = await this._runRecipe([conf], sample.buffer);
          if (!_buffersEqual(data, sample.buffer)) {
            results.push({
              data,
              conf
            });
          }
        } catch (err) {
          continue;
        }
      }
    };
    await testEnc("Encode text");
    await testEnc("Decode text");
    return results;
  }
  /**
   * Checks whether the data passes output criteria for an operation check
   *
   * @param {ArrayBuffer} data
   * @param {Object} criteria
   * @returns {boolean}
   */
  outputCheckPasses(data, criteria) {
    if (criteria.pattern) {
      const dataStr = magic_utils_shim_default.arrayBufferToStr(data), regex = new RegExp(criteria.pattern, criteria.flags);
      if (!regex.test(dataStr))
        return false;
    }
    if (criteria.entropyRange) {
      const dataEntropy = this.calcEntropy(data, true);
      if (dataEntropy < criteria.entropyRange[0] || dataEntropy > criteria.entropyRange[1])
        return false;
    }
    if (criteria.mime && !isType(criteria.mime, data))
      return false;
    return true;
  }
  /**
   * Speculatively executes matching operations, recording metadata of each result.
   *
   * @param {number} [depth=0] - How many levels to try to execute
   * @param {boolean} [extLang=false] - Extensive language support (false = only check the most
   *     common Internet languages)
   * @param {boolean} [intensive=false] - Run brute-forcing on each branch (significantly affects
   *     performance)
   * @param {Object[]} [recipeConfig=[]] - The recipe configuration up to this point
   * @param {boolean} [useful=false] - Whether the current recipe should be scored highly
   * @param {string} [crib=null] - The regex crib provided by the user, for filtering the operation
   *     output
   * @returns {Object[]} - A sorted list of the recipes most likely to result in correct decoding
   */
  async speculativeExecution(depth = 0, extLang = false, intensive = false, recipeConfig = [], useful = false, crib = null) {
    if (depth < 0) return [];
    const matchingOps = this.findMatchingInputOps();
    let results = [];
    results.push({
      recipe: recipeConfig,
      data: this.inputStr.slice(0, 100),
      languageScores: this.detectLanguage(extLang),
      fileType: this.detectFileType(),
      isUTF8: !!isUTF8(this.inputBuffer),
      entropy: this.calcEntropy(),
      matchingOps,
      useful,
      matchesCrib: crib && crib.test(this.inputStr)
    });
    const prevOp = recipeConfig[recipeConfig.length - 1];
    await Promise.all(matchingOps.map(async (op) => {
      const opConfig = {
        op: op.op,
        args: op.args
      }, output = await this._runRecipe([opConfig]);
      if (_buffersEqual(output, new ArrayBuffer())) {
        return;
      }
      if (prevOp && op.op === prevOp.op && _buffersEqual(output, this.inputBuffer)) {
        return;
      }
      if (op.output && !this.outputCheckPasses(output, op.output))
        return;
      const magic = new _Magic(output, this.opCriteria, magic_opconfig_default[op.op]), speculativeResults = await magic.speculativeExecution(
        depth - 1,
        extLang,
        intensive,
        [...recipeConfig, opConfig],
        op.useful,
        crib
      );
      results = results.concat(speculativeResults);
    }));
    if (intensive) {
      const bfEncodings = await this.bruteForce();
      await Promise.all(bfEncodings.map(async (enc) => {
        const magic = new _Magic(enc.data, this.opCriteria, void 0), bfResults = await magic.speculativeExecution(
          depth - 1,
          extLang,
          false,
          [...recipeConfig, enc.conf],
          false,
          crib
        );
        results = results.concat(bfResults);
      }));
    }
    const prunedResults = results.filter(
      (r) => (r.useful || r.data.length > 0) && // The operation resulted in ""
      // One of the following must be true
      (r.languageScores[0].probability > 0 || // Some kind of language was found
      r.fileType || // A file was found
      r.isUTF8 || // UTF-8 was found
      r.matchingOps.length || // A matching op was found
      r.matchesCrib)
    );
    return prunedResults.sort((a, b) => {
      let aScore = a.languageScores[0].score, bScore = b.languageScores[0].score;
      if (a.isUTF8) aScore -= 100;
      if (b.isUTF8) bScore -= 100;
      if (a.fileType && aScore > 500) aScore = 500;
      if (b.fileType && bScore > 500) bScore = 500;
      if (a.useful && aScore > 100) aScore = 100;
      if (b.useful && bScore > 100) bScore = 100;
      aScore += a.recipe.length;
      bScore += b.recipe.length;
      aScore += a.entropy;
      bScore += b.entropy;
      if (!a.recipe.length && a.matchingOps.length && b.recipe.length)
        return 1;
      if (!b.recipe.length && b.matchingOps.length && a.recipe.length)
        return -1;
      return aScore - bScore;
    });
  }
  /**
   * Runs the given recipe over the input buffer and returns the output.
   *
   * @param {Object[]} recipeConfig
   * @param {ArrayBuffer} [input=this.inputBuffer]
   * @returns {ArrayBuffer}
   */
  async _runRecipe(recipeConfig, input = this.inputBuffer) {
    input = input instanceof ArrayBuffer ? input : input.buffer;
    const dish = new Dish();
    dish.set(input, Dish.ARRAY_BUFFER);
    if (isWorkerEnvironment()) self.loadRequiredModules(recipeConfig);
    const recipe = new Recipe(recipeConfig);
    try {
      await recipe.execute(dish);
      if (recipe.lastRunOp === recipe.opList[recipe.opList.length - 1]) {
        return await dish.get(Dish.ARRAY_BUFFER);
      } else {
        return new ArrayBuffer();
      }
    } catch (err) {
      return new ArrayBuffer();
    }
  }
  /**
   * Calculates the number of times each byte appears in the input as a percentage
   *
   * @private
   * @param {ArrayBuffer} [data]
   * @param {boolean} [standalone]
   * @returns {number[]}
   */
  _freqDist(data = this.inputBuffer, standalone = false) {
    if (!standalone && this.freqDist) return this.freqDist;
    const len = data.length, counts = new Array(256).fill(0);
    let i = len;
    if (!len) {
      this.freqDist = counts;
      return this.freqDist;
    }
    while (i--) {
      counts[data[i]]++;
    }
    const result = counts.map((c) => {
      return c / len * 100;
    });
    if (!standalone) this.freqDist = result;
    return result;
  }
  /**
   * Generates a list of all patterns that operations claim to be able to decode.
   *
   * @private
   * @returns {Object[]}
   */
  static _generateOpCriteria() {
    const opCriteria = [];
    for (const op in magic_opconfig_default) {
      if (!("checks" in magic_opconfig_default[op]))
        continue;
      magic_opconfig_default[op].checks.forEach((check) => {
        opCriteria.push({
          op,
          pattern: check.pattern ? new RegExp(check.pattern, check.flags) : null,
          args: check.args,
          useful: check.useful,
          entropyRange: check.entropyRange,
          output: check.output
        });
      });
    }
    return opCriteria;
  }
  /**
   * Calculates Pearson's Chi-Squared test for two frequency arrays.
   * https://en.wikipedia.org/wiki/Pearson%27s_chi-squared_test
   *
   * @private
   * @param {number[]} observed
   * @param {number[]} expected
   * @param {number} ddof - Delta degrees of freedom
   * @returns {number[]} - The score and the probability
   */
  static _chiSqr(observed, expected, ddof = 0) {
    let tmp, score = 0;
    for (let i = 0; i < observed.length; i++) {
      tmp = observed[i] - expected[i];
      score += tmp * tmp / expected[i];
    }
    return [
      score,
      1 - import_chi_squared.default.cdf(score, observed.length - 1 - ddof)
    ];
  }
  /**
   * Translates ISO 639(-ish) codes to their full language names as used by Wikipedia
   * Accurate up to 2018-02
   * Taken from http://wikistats.wmflabs.org/display.php?t=wp
   *
   * @param {string} code - ISO 639 code
   * @returns {string} The full name of the language
   */
  static codeToLanguage(code) {
    return {
      "aa": "Afar",
      "ab": "Abkhazian",
      "ace": "Acehnese",
      "ady": "Adyghe",
      "af": "Afrikaans",
      "ak": "Akan",
      "als": "Alemannic",
      "am": "Amharic",
      "an": "Aragonese",
      "ang": "Anglo-Saxon",
      "ar": "Arabic",
      "arc": "Aramaic",
      "arz": "Egyptian Arabic",
      "as": "Assamese",
      "ast": "Asturian",
      "atj": "Atikamekw",
      "av": "Avar",
      "ay": "Aymara",
      "az": "Azerbaijani",
      "azb": "South Azerbaijani",
      "ba": "Bashkir",
      "bar": "Bavarian",
      "bat-smg": "Samogitian",
      "bcl": "Central_Bicolano",
      "be": "Belarusian",
      "be-tarask": "Belarusian (Tara\u0161kievica)",
      "bg": "Bulgarian",
      "bh": "Bihari",
      "bi": "Bislama",
      "bjn": "Banjar",
      "bm": "Bambara",
      "bn": "Bengali",
      "bo": "Tibetan",
      "bpy": "Bishnupriya Manipuri",
      "br": "Breton",
      "bs": "Bosnian",
      "bug": "Buginese",
      "bxr": "Buryat (Russia)",
      "ca": "Catalan",
      "cbk-zam": "Zamboanga Chavacano",
      "cdo": "Min Dong",
      "ce": "Chechen",
      "ceb": "Cebuano",
      "ch": "Chamorro",
      "cho": "Choctaw",
      "chr": "Cherokee",
      "chy": "Cheyenne",
      "ckb": "Sorani",
      "co": "Corsican",
      "cr": "Cree",
      "crh": "Crimean Tatar",
      "cs": "Czech",
      "csb": "Kashubian",
      "cu": "Old Church Slavonic",
      "cv": "Chuvash",
      "cy": "Welsh",
      "da": "Danish",
      "de": "German",
      "din": "Dinka",
      "diq": "Zazaki",
      "dsb": "Lower Sorbian",
      "dty": "Doteli",
      "dv": "Divehi",
      "dz": "Dzongkha",
      "ee": "Ewe",
      "el": "Greek",
      "eml": "Emilian-Romagnol",
      "en": "English",
      "eo": "Esperanto",
      "es": "Spanish",
      "et": "Estonian",
      "eu": "Basque",
      "ext": "Extremaduran",
      "fa": "Persian",
      "ff": "Fula",
      "fi": "Finnish",
      "fiu-vro": "V\xF5ro",
      "fj": "Fijian",
      "fo": "Faroese",
      "fr": "French",
      "frp": "Franco-Proven\xE7al/Arpitan",
      "frr": "North Frisian",
      "fur": "Friulian",
      "fy": "West Frisian",
      "ga": "Irish",
      "gag": "Gagauz",
      "gan": "Gan",
      "gd": "Scottish Gaelic",
      "gl": "Galician",
      "glk": "Gilaki",
      "gn": "Guarani",
      "gom": "Goan Konkani",
      "got": "Gothic",
      "gu": "Gujarati",
      "gv": "Manx",
      "ha": "Hausa",
      "hak": "Hakka",
      "haw": "Hawaiian",
      "he": "Hebrew",
      "hi": "Hindi",
      "hif": "Fiji Hindi",
      "ho": "Hiri Motu",
      "hr": "Croatian",
      "hsb": "Upper Sorbian",
      "ht": "Haitian",
      "hu": "Hungarian",
      "hy": "Armenian",
      "hz": "Herero",
      "ia": "Interlingua",
      "id": "Indonesian",
      "ie": "Interlingue",
      "ig": "Igbo",
      "ii": "Sichuan Yi",
      "ik": "Inupiak",
      "ilo": "Ilokano",
      "io": "Ido",
      "is": "Icelandic",
      "it": "Italian",
      "iu": "Inuktitut",
      "ja": "Japanese",
      "jam": "Jamaican",
      "jbo": "Lojban",
      "jv": "Javanese",
      "ka": "Georgian",
      "kaa": "Karakalpak",
      "kab": "Kabyle",
      "kbd": "Kabardian Circassian",
      "kbp": "Kabiye",
      "kg": "Kongo",
      "ki": "Kikuyu",
      "kj": "Kuanyama",
      "kk": "Kazakh",
      "kl": "Greenlandic",
      "km": "Khmer",
      "kn": "Kannada",
      "ko": "Korean",
      "koi": "Komi-Permyak",
      "kr": "Kanuri",
      "krc": "Karachay-Balkar",
      "ks": "Kashmiri",
      "ksh": "Ripuarian",
      "ku": "Kurdish",
      "kv": "Komi",
      "kw": "Cornish",
      "ky": "Kirghiz",
      "la": "Latin",
      "lad": "Ladino",
      "lb": "Luxembourgish",
      "lbe": "Lak",
      "lez": "Lezgian",
      "lg": "Luganda",
      "li": "Limburgish",
      "lij": "Ligurian",
      "lmo": "Lombard",
      "ln": "Lingala",
      "lo": "Lao",
      "lrc": "Northern Luri",
      "lt": "Lithuanian",
      "ltg": "Latgalian",
      "lv": "Latvian",
      "mai": "Maithili",
      "map-bms": "Banyumasan",
      "mdf": "Moksha",
      "mg": "Malagasy",
      "mh": "Marshallese",
      "mhr": "Meadow Mari",
      "mi": "Maori",
      "min": "Minangkabau",
      "mk": "Macedonian",
      "ml": "Malayalam",
      "mn": "Mongolian",
      "mo": "Moldovan",
      "mr": "Marathi",
      "mrj": "Hill Mari",
      "ms": "Malay",
      "mt": "Maltese",
      "mus": "Muscogee",
      "mwl": "Mirandese",
      "my": "Burmese",
      "myv": "Erzya",
      "mzn": "Mazandarani",
      "na": "Nauruan",
      "nah": "Nahuatl",
      "nap": "Neapolitan",
      "nds": "Low Saxon",
      "nds-nl": "Dutch Low Saxon",
      "ne": "Nepali",
      "new": "Newar / Nepal Bhasa",
      "ng": "Ndonga",
      "nl": "Dutch",
      "nn": "Norwegian (Nynorsk)",
      "no": "Norwegian (Bokm\xE5l)",
      "nov": "Novial",
      "nrm": "Norman",
      "nso": "Northern Sotho",
      "nv": "Navajo",
      "ny": "Chichewa",
      "oc": "Occitan",
      "olo": "Livvi-Karelian",
      "om": "Oromo",
      "or": "Oriya",
      "os": "Ossetian",
      "pa": "Punjabi",
      "pag": "Pangasinan",
      "pam": "Kapampangan",
      "pap": "Papiamentu",
      "pcd": "Picard",
      "pdc": "Pennsylvania German",
      "pfl": "Palatinate German",
      "pi": "Pali",
      "pih": "Norfolk",
      "pl": "Polish",
      "pms": "Piedmontese",
      "pnb": "Western Panjabi",
      "pnt": "Pontic",
      "ps": "Pashto",
      "pt": "Portuguese",
      "qu": "Quechua",
      "rm": "Romansh",
      "rmy": "Romani",
      "rn": "Kirundi",
      "ro": "Romanian",
      "roa-rup": "Aromanian",
      "roa-tara": "Tarantino",
      "ru": "Russian",
      "rue": "Rusyn",
      "rw": "Kinyarwanda",
      "sa": "Sanskrit",
      "sah": "Sakha",
      "sc": "Sardinian",
      "scn": "Sicilian",
      "sco": "Scots",
      "sd": "Sindhi",
      "se": "Northern Sami",
      "sg": "Sango",
      "sh": "Serbo-Croatian",
      "si": "Sinhalese",
      "simple": "Simple English",
      "sk": "Slovak",
      "sl": "Slovenian",
      "sm": "Samoan",
      "sn": "Shona",
      "so": "Somali",
      "sq": "Albanian",
      "sr": "Serbian",
      "srn": "Sranan",
      "ss": "Swati",
      "st": "Sesotho",
      "stq": "Saterland Frisian",
      "su": "Sundanese",
      "sv": "Swedish",
      "sw": "Swahili",
      "szl": "Silesian",
      "ta": "Tamil",
      "tcy": "Tulu",
      "te": "Telugu",
      "tet": "Tetum",
      "tg": "Tajik",
      "th": "Thai",
      "ti": "Tigrinya",
      "tk": "Turkmen",
      "tl": "Tagalog",
      "tn": "Tswana",
      "to": "Tongan",
      "tpi": "Tok Pisin",
      "tr": "Turkish",
      "ts": "Tsonga",
      "tt": "Tatar",
      "tum": "Tumbuka",
      "tw": "Twi",
      "ty": "Tahitian",
      "tyv": "Tuvan",
      "udm": "Udmurt",
      "ug": "Uyghur",
      "uk": "Ukrainian",
      "ur": "Urdu",
      "uz": "Uzbek",
      "ve": "Venda",
      "vec": "Venetian",
      "vep": "Vepsian",
      "vi": "Vietnamese",
      "vls": "West Flemish",
      "vo": "Volap\xFCk",
      "wa": "Walloon",
      "war": "Waray-Waray",
      "wo": "Wolof",
      "wuu": "Wu",
      "xal": "Kalmyk",
      "xh": "Xhosa",
      "xmf": "Mingrelian",
      "yi": "Yiddish",
      "yo": "Yoruba",
      "za": "Zhuang",
      "zea": "Zeelandic",
      "zh": "Chinese",
      "zh-classical": "Classical Chinese",
      "zh-min-nan": "Min Nan",
      "zh-yue": "Cantonese",
      "zu": "Zulu"
    }[code];
  }
};
var COMMON_LANG_FREQS = {
  "en": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.755, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.843, 4e-3, 0.375, 2e-3, 8e-3, 0.019, 8e-3, 0.134, 0.137, 0.137, 1e-3, 1e-3, 0.972, 0.19, 0.857, 0.017, 0.334, 0.421, 0.246, 0.108, 0.104, 0.112, 0.103, 0.1, 0.127, 0.237, 0.04, 0.027, 4e-3, 3e-3, 4e-3, 2e-3, 1e-4, 0.338, 0.218, 0.326, 0.163, 0.121, 0.149, 0.133, 0.192, 0.232, 0.107, 0.082, 0.148, 0.248, 0.134, 0.103, 0.195, 0.012, 0.162, 0.368, 0.366, 0.077, 0.061, 0.127, 9e-3, 0.03, 0.015, 4e-3, 1e-4, 4e-3, 1e-4, 3e-3, 1e-4, 6.614, 1.039, 2.327, 2.934, 9.162, 1.606, 1.415, 3.503, 5.718, 0.081, 0.461, 3.153, 1.793, 5.723, 5.565, 1.415, 0.066, 5.036, 4.79, 6.284, 1.992, 0.759, 1.176, 0.139, 1.162, 0.102, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.06, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 0.031, 6e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.014, 1e-3, 1e-3, 5e-3, 5e-3, 1e-3, 2e-3, 0.017, 7e-3, 2e-3, 3e-3, 4e-3, 2e-3, 1e-3, 2e-3, 2e-3, 0.012, 1e-3, 2e-3, 1e-3, 4e-3, 1e-3, 1e-3, 3e-3, 3e-3, 2e-3, 5e-3, 1e-3, 1e-3, 3e-3, 1e-3, 3e-3, 1e-3, 2e-3, 1e-3, 4e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.02, 0.047, 9e-3, 9e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 0.061, 1e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ru": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.512, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.274, 2e-3, 0.063, 1e-4, 1e-3, 9e-3, 1e-3, 1e-3, 0.118, 0.118, 1e-4, 1e-3, 0.595, 0.135, 0.534, 9e-3, 0.18, 0.281, 0.15, 0.078, 0.076, 0.077, 0.068, 0.066, 0.083, 0.16, 0.036, 0.016, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.013, 9e-3, 0.014, 9e-3, 7e-3, 6e-3, 7e-3, 6e-3, 0.031, 2e-3, 3e-3, 7e-3, 0.012, 7e-3, 5e-3, 0.01, 1e-3, 8e-3, 0.017, 0.011, 3e-3, 9e-3, 5e-3, 0.012, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 3e-3, 1e-4, 0.065, 9e-3, 0.022, 0.021, 0.074, 0.01, 0.013, 0.019, 0.054, 1e-3, 8e-3, 0.036, 0.02, 0.047, 0.055, 0.013, 1e-3, 0.052, 0.037, 0.041, 0.026, 7e-3, 6e-3, 3e-3, 0.011, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.469, 2.363, 2.342, 0.986, 0.156, 0.422, 0.252, 0.495, 0.217, 0.136, 0.014, 0.778, 0.56, 0.097, 0.251, 0.811, 0.09, 0.184, 0.165, 0.06, 0.179, 0.021, 0.013, 0.029, 0.05, 5e-3, 0.116, 0.045, 0.087, 0.073, 0.067, 0.124, 0.211, 0.16, 0.055, 0.033, 0.036, 0.024, 0.013, 0.02, 0.022, 2e-3, 1e-4, 0.1, 1e-4, 0.025, 9e-3, 0.011, 3.536, 0.619, 1.963, 0.833, 1.275, 3.452, 0.323, 0.635, 3.408, 0.642, 1.486, 1.967, 1.26, 2.857, 4.587, 1.082, 1e-4, 1e-4, 0.339, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 1e-4, 2e-3, 1e-3, 31.356, 12.318, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.131, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "de": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.726, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.303, 2e-3, 0.278, 1e-4, 1e-4, 7e-3, 3e-3, 5e-3, 0.149, 0.149, 0.015, 1e-3, 0.636, 0.237, 0.922, 0.023, 0.305, 0.472, 0.225, 0.115, 0.11, 0.121, 0.108, 0.11, 0.145, 0.271, 0.049, 0.022, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 0.413, 0.383, 0.144, 0.412, 0.275, 0.258, 0.273, 0.218, 0.18, 0.167, 0.277, 0.201, 0.328, 0.179, 0.111, 0.254, 0.012, 0.219, 0.602, 0.209, 0.1, 0.185, 0.206, 5e-3, 0.01, 0.112, 2e-3, 1e-4, 2e-3, 1e-4, 6e-3, 1e-4, 4.417, 1.306, 1.99, 3.615, 12.382, 1.106, 2, 2.958, 6.179, 0.082, 0.866, 2.842, 1.869, 7.338, 2.27, 0.606, 0.016, 6.056, 4.424, 4.731, 3.002, 0.609, 0.918, 0.053, 0.169, 0.824, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.147, 2e-3, 3e-3, 1e-3, 6e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.03, 1e-4, 1e-4, 9e-3, 1e-3, 2e-3, 9e-3, 2e-3, 1e-3, 0.061, 1e-4, 0.048, 0.122, 0.057, 9e-3, 1e-3, 1e-3, 0.4, 1e-3, 2e-3, 3e-3, 3e-3, 0.017, 1e-3, 3e-3, 1e-3, 5e-3, 1e-4, 1e-3, 3e-3, 2e-3, 3e-3, 5e-3, 1e-3, 1e-3, 0.203, 1e-4, 2e-3, 1e-3, 2e-3, 2e-3, 0.438, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.056, 1.237, 0.01, 0.013, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.148, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ja": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.834, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.258, 7e-3, 0.036, 1e-3, 1e-4, 5e-3, 2e-3, 3e-3, 0.033, 0.033, 1e-4, 2e-3, 0.019, 0.052, 0.026, 9e-3, 0.281, 0.407, 0.259, 0.126, 0.108, 0.109, 0.095, 0.092, 0.104, 0.184, 8e-3, 1e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 0.048, 0.026, 0.039, 0.027, 0.028, 0.022, 0.018, 0.016, 0.03, 0.012, 0.014, 0.02, 0.03, 0.025, 0.025, 0.026, 2e-3, 0.026, 0.045, 0.031, 0.013, 0.014, 0.014, 6e-3, 6e-3, 3e-3, 1e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 0.077, 0.012, 0.03, 0.026, 0.088, 0.012, 0.017, 0.025, 0.067, 2e-3, 0.016, 0.041, 0.039, 0.059, 0.066, 0.016, 1e-3, 0.06, 0.043, 0.051, 0.028, 9e-3, 7e-3, 4e-3, 0.015, 4e-3, 1e-4, 0.011, 1e-4, 1e-4, 1e-4, 2.555, 10.322, 5.875, 4.462, 0.784, 0.468, 0.442, 0.409, 1.173, 0.96, 0.657, 1.448, 1.442, 0.636, 0.341, 0.685, 0.495, 0.342, 0.651, 0.536, 0.435, 0.657, 0.51, 0.978, 0.31, 0.563, 0.439, 0.514, 0.668, 0.438, 0.29, 1.039, 0.423, 0.532, 0.407, 0.691, 0.677, 0.555, 0.911, 0.887, 1.086, 0.531, 0.836, 1.345, 0.438, 0.666, 1.528, 0.959, 0.535, 0.379, 0.302, 0.822, 0.614, 0.308, 0.253, 0.467, 0.807, 0.807, 0.777, 0.809, 1.292, 0.546, 0.524, 0.425, 1e-4, 1e-4, 2e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 0.015, 19.387, 1.167, 4.022, 2.518, 1.734, 1.339, 1.229, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.409, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "es": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.757, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.771, 3e-3, 0.315, 1e-3, 4e-3, 0.019, 3e-3, 0.014, 0.132, 0.133, 1e-3, 1e-3, 0.976, 0.078, 0.703, 0.014, 0.268, 0.331, 0.197, 0.095, 0.086, 0.095, 0.085, 0.084, 0.105, 0.183, 0.053, 0.027, 1e-3, 2e-3, 2e-3, 2e-3, 1e-4, 0.242, 0.129, 0.28, 0.129, 0.322, 0.105, 0.099, 0.077, 0.116, 0.074, 0.034, 0.209, 0.196, 0.086, 0.059, 0.187, 9e-3, 0.118, 0.247, 0.128, 0.061, 0.072, 0.033, 0.023, 0.018, 0.013, 5e-3, 1e-4, 5e-3, 1e-4, 3e-3, 1e-4, 8.9, 0.939, 3.234, 4.015, 9.642, 0.603, 0.891, 0.531, 5.007, 0.262, 0.107, 4.355, 1.915, 5.487, 6.224, 1.805, 0.423, 4.992, 5.086, 3.402, 2.878, 0.667, 0.044, 0.125, 0.673, 0.299, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.033, 9e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-4, 1e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 6e-3, 6e-3, 1e-3, 1e-4, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 8e-3, 8e-3, 1e-3, 1e-3, 0.025, 0.274, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 0.221, 3e-3, 0.019, 1e-3, 0.373, 1e-3, 1e-3, 5e-3, 0.144, 0.01, 0.631, 2e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 0.102, 0.018, 6e-3, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.079, 1.766, 3e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 8e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.032, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "fr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.894, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.162, 3e-3, 0.276, 1e-4, 1e-4, 0.012, 2e-3, 0.638, 0.153, 0.153, 1e-3, 2e-3, 0.96, 0.247, 0.715, 0.011, 0.225, 0.339, 0.18, 0.084, 0.081, 0.086, 0.081, 0.084, 0.106, 0.194, 0.063, 0.018, 3e-3, 2e-3, 3e-3, 2e-3, 1e-4, 0.208, 0.141, 0.255, 0.128, 0.144, 0.1, 0.095, 0.071, 0.154, 0.072, 0.042, 0.331, 0.173, 0.077, 0.056, 0.167, 0.013, 0.108, 0.214, 0.102, 0.049, 0.062, 0.035, 9e-3, 0.014, 0.011, 3e-3, 1e-4, 3e-3, 1e-4, 4e-3, 1e-4, 5.761, 0.627, 2.287, 3.136, 10.738, 0.723, 0.838, 0.669, 5.295, 0.172, 0.12, 4.204, 1.941, 5.522, 4.015, 2.005, 0.584, 5.043, 5.545, 5.13, 4.06, 0.906, 0.051, 0.295, 0.278, 0.085, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.136, 3e-3, 4e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 0.034, 1e-4, 1e-4, 1e-3, 4e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 0.019, 3e-3, 1e-4, 1e-4, 1e-3, 1e-3, 0.112, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 0.367, 7e-3, 0.034, 1e-3, 3e-3, 1e-3, 3e-3, 0.046, 0.303, 1.817, 0.082, 0.045, 1e-3, 4e-3, 0.029, 0.017, 4e-3, 2e-3, 2e-3, 5e-3, 0.038, 1e-3, 3e-3, 1e-4, 2e-3, 0.02, 2e-3, 0.054, 4e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.113, 2.813, 7e-3, 0.026, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 3e-3, 1e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.122, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pt": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.934, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.319, 4e-3, 0.372, 1e-3, 2e-3, 0.012, 4e-3, 0.016, 0.15, 0.15, 1e-3, 2e-3, 1.16, 0.21, 0.746, 0.022, 0.296, 0.361, 0.226, 0.106, 0.098, 0.105, 0.096, 0.094, 0.114, 0.207, 0.054, 0.022, 6e-3, 4e-3, 6e-3, 2e-3, 1e-4, 0.345, 0.166, 0.295, 0.143, 0.233, 0.136, 0.112, 0.077, 0.129, 0.093, 0.039, 0.119, 0.217, 0.135, 0.164, 0.222, 0.016, 0.14, 0.259, 0.142, 0.064, 0.078, 0.041, 0.021, 0.013, 0.012, 7e-3, 1e-4, 7e-3, 1e-4, 7e-3, 1e-4, 9.026, 0.717, 2.572, 4.173, 8.551, 0.751, 0.906, 0.629, 5.107, 0.172, 0.12, 2.357, 3.189, 4.024, 7.683, 1.87, 0.445, 5.017, 5.188, 3.559, 2.852, 0.875, 0.055, 0.186, 0.122, 0.257, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.034, 0.01, 3e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.014, 1e-3, 1e-3, 1e-3, 5e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 9e-3, 6e-3, 1e-4, 1e-4, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 7e-3, 7e-3, 1e-4, 1e-3, 0.079, 0.267, 0.045, 0.508, 2e-3, 1e-3, 1e-3, 0.424, 3e-3, 0.417, 0.113, 3e-3, 1e-3, 0.255, 1e-3, 1e-3, 5e-3, 3e-3, 0.015, 0.161, 0.032, 0.087, 3e-3, 1e-3, 2e-3, 1e-3, 0.095, 2e-3, 5e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.067, 2.471, 4e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 7e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.033, 2e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "it": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.828, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.918, 2e-3, 0.385, 1e-4, 1e-3, 7e-3, 3e-3, 0.383, 0.13, 0.131, 1e-4, 1e-3, 0.948, 0.103, 0.657, 0.014, 0.252, 0.332, 0.195, 0.093, 0.089, 0.095, 0.088, 0.084, 0.098, 0.183, 0.061, 0.035, 6e-3, 2e-3, 6e-3, 1e-3, 1e-4, 0.215, 0.131, 0.235, 0.125, 0.08, 0.104, 0.125, 0.057, 0.24, 0.04, 0.038, 0.208, 0.179, 0.133, 0.054, 0.164, 0.025, 0.114, 0.256, 0.12, 0.052, 0.079, 0.038, 0.021, 0.012, 0.012, 2e-3, 1e-4, 2e-3, 1e-4, 5e-3, 1e-4, 8.583, 0.65, 3.106, 3.081, 8.81, 0.801, 1.321, 0.694, 8.492, 0.02, 0.115, 5.238, 1.88, 5.659, 6.812, 1.981, 0.236, 4.962, 3.674, 5.112, 2.35, 1.107, 0.055, 0.027, 0.118, 0.709, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.022, 4e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.013, 1e-3, 1e-4, 1e-4, 1e-3, 4e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 6e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 5e-3, 1e-4, 1e-3, 5e-3, 5e-3, 1e-4, 1e-3, 0.153, 7e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 2e-3, 0.174, 0.033, 4e-3, 9e-3, 0.036, 4e-3, 1e-3, 1e-3, 6e-3, 3e-3, 0.097, 4e-3, 1e-3, 1e-3, 3e-3, 1e-3, 2e-3, 0.056, 9e-3, 7e-3, 4e-3, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.043, 0.574, 0.01, 9e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 7e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.021, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "zh": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.074, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.273, 3e-3, 0.045, 1e-4, 1e-3, 0.012, 1e-3, 4e-3, 0.032, 0.032, 1e-3, 3e-3, 0.032, 0.068, 0.063, 0.017, 0.386, 0.478, 0.308, 0.149, 0.134, 0.146, 0.127, 0.121, 0.136, 0.231, 0.018, 9e-3, 7e-3, 6e-3, 7e-3, 1e-4, 1e-4, 0.045, 0.029, 0.041, 0.028, 0.022, 0.017, 0.02, 0.019, 0.025, 0.01, 0.013, 0.02, 0.033, 0.021, 0.018, 0.028, 2e-3, 0.022, 0.045, 0.031, 0.01, 0.013, 0.012, 7e-3, 5e-3, 3e-3, 4e-3, 1e-4, 4e-3, 1e-4, 9e-3, 1e-4, 0.159, 0.026, 0.051, 0.047, 0.17, 0.025, 0.032, 0.057, 0.124, 3e-3, 0.021, 0.089, 0.049, 0.12, 0.129, 0.028, 2e-3, 0.124, 0.083, 0.1, 0.058, 0.016, 0.016, 8e-3, 0.03, 0.012, 6e-3, 4e-3, 6e-3, 1e-3, 1e-4, 2.707, 1.09, 1.398, 0.705, 1.23, 1.04, 0.715, 0.952, 1.455, 1.297, 0.845, 1.19, 2.403, 1.193, 0.813, 1.077, 0.889, 0.565, 0.387, 0.47, 0.931, 0.663, 1.035, 0.837, 0.77, 0.772, 1.434, 1.023, 1.668, 0.609, 0.437, 0.793, 0.535, 0.706, 0.48, 0.538, 0.785, 0.909, 0.7, 0.697, 1.017, 0.519, 0.441, 0.567, 0.626, 1.082, 0.814, 1.054, 1.074, 0.811, 0.556, 0.684, 0.903, 0.43, 0.642, 0.78, 2.083, 1.147, 2.006, 1.331, 2.547, 1.015, 0.911, 0.807, 1e-4, 1e-4, 0.069, 7e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.126, 1.369, 3.539, 8.968, 5.44, 4.358, 3.141, 2.48, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1.821, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "fa": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.841, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.03, 1e-3, 0.048, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 0.117, 0.117, 1e-3, 1e-3, 9e-3, 0.038, 0.486, 0.012, 7e-3, 9e-3, 7e-3, 5e-3, 3e-3, 4e-3, 3e-3, 3e-3, 3e-3, 4e-3, 0.048, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-4, 0.011, 6e-3, 0.011, 6e-3, 5e-3, 5e-3, 4e-3, 5e-3, 7e-3, 2e-3, 2e-3, 5e-3, 8e-3, 5e-3, 5e-3, 8e-3, 1e-3, 5e-3, 0.011, 8e-3, 2e-3, 3e-3, 4e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 2e-3, 1e-4, 7e-3, 1e-4, 0.058, 8e-3, 0.02, 0.02, 0.06, 0.011, 0.012, 0.017, 0.051, 1e-3, 9e-3, 0.031, 0.018, 0.042, 0.047, 0.015, 1e-3, 0.043, 0.03, 0.037, 0.022, 5e-3, 8e-3, 3e-3, 9e-3, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.678, 0.557, 0.438, 1e-3, 1.227, 2.118, 3.004, 2.445, 2.539, 1e-4, 3e-3, 0.021, 5.067, 2e-3, 7e-3, 6e-3, 0.015, 5e-3, 2e-3, 8e-3, 0.07, 1e-4, 1e-4, 1e-4, 0.053, 1e-3, 1e-4, 0.018, 1e-4, 1e-3, 1e-4, 2e-3, 2e-3, 6e-3, 0.337, 0.015, 6e-3, 1e-3, 0.059, 6.029, 1.704, 1.216, 2.096, 0.113, 0.433, 0.309, 0.439, 3.398, 0.192, 3.798, 0.977, 1.716, 1.137, 0.259, 0.129, 0.264, 0.12, 0.588, 0.085, 0.033, 1e-3, 1e-4, 0.327, 1e-4, 1e-4, 1e-4, 0.068, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 23.012, 12.666, 1.946, 5.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.676, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.97, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.695, 2e-3, 0.242, 1e-4, 1e-4, 7e-3, 2e-3, 0.011, 0.194, 0.194, 1e-4, 1e-3, 0.805, 0.129, 1.016, 0.02, 0.347, 0.542, 0.289, 0.14, 0.138, 0.144, 0.123, 0.13, 0.153, 0.343, 0.068, 0.014, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.17, 0.165, 0.143, 0.124, 0.066, 0.081, 0.113, 0.075, 0.141, 0.107, 0.18, 0.108, 0.192, 0.142, 0.119, 0.322, 4e-3, 0.139, 0.268, 0.117, 0.058, 0.041, 0.322, 0.032, 8e-3, 0.109, 1e-3, 1e-4, 1e-3, 1e-4, 6e-3, 1e-4, 6.697, 0.859, 2.856, 2.291, 5.604, 0.259, 1.117, 0.918, 6.017, 1.562, 2.537, 1.759, 1.903, 4.231, 5.86, 1.841, 6e-3, 3.854, 3.145, 2.863, 1.965, 0.061, 3.408, 0.016, 2.669, 3.631, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.208, 0.018, 1.343, 4e-3, 0.168, 0.653, 2e-3, 0.145, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 4e-3, 1e-3, 2e-3, 2e-3, 1e-3, 3e-3, 0.126, 2e-3, 1e-3, 2e-3, 2e-3, 1e-3, 0.65, 0.023, 0.378, 2e-3, 0.035, 0.035, 2e-3, 0.018, 0.011, 1e-3, 2e-3, 5e-3, 1e-3, 1e-3, 2e-3, 3e-3, 0.012, 1e-3, 2e-3, 1e-3, 5e-3, 1e-3, 1e-3, 0.01, 4e-3, 0.011, 0.641, 3e-3, 6e-3, 5e-3, 1e-3, 8e-3, 4e-3, 0.056, 0.014, 0.433, 7e-3, 8e-3, 2e-3, 1e-4, 1e-4, 0.025, 0.694, 1.442, 2.413, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 6e-3, 3e-3, 0.06, 0.02, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 3e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.205, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.91, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.447, 0.013, 0.297, 1e-4, 1e-3, 0.013, 3e-3, 0.465, 0.123, 0.123, 1e-3, 2e-3, 0.653, 0.111, 0.957, 0.015, 0.312, 0.387, 0.238, 0.107, 0.101, 0.108, 0.097, 0.095, 0.109, 0.217, 0.04, 0.028, 7e-3, 0.019, 7e-3, 2e-3, 1e-4, 0.336, 0.309, 0.117, 0.167, 0.132, 0.105, 0.13, 0.135, 0.063, 0.042, 0.261, 0.085, 0.236, 0.083, 0.095, 0.131, 4e-3, 0.092, 0.247, 0.219, 0.038, 0.052, 0.037, 8e-3, 0.095, 0.019, 7e-3, 1e-4, 7e-3, 1e-4, 5e-3, 1e-3, 8.533, 1.3, 0.65, 3.067, 6.656, 0.419, 0.804, 0.718, 6.178, 0.059, 2.986, 5.127, 2.286, 5.537, 2.04, 0.623, 6e-3, 5.247, 2.411, 2.743, 2.225, 0.903, 0.049, 0.018, 2.076, 0.792, 1e-4, 0.018, 1e-4, 1e-4, 1e-4, 0.096, 4e-3, 4e-3, 4e-3, 2e-3, 2e-3, 2e-3, 0.041, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 7e-3, 2e-3, 1e-3, 0.031, 1e-3, 3e-3, 0.065, 1e-3, 1e-3, 0.033, 9e-3, 0.047, 1.71, 0.04, 5e-3, 0.027, 2e-3, 3e-3, 1e-3, 1e-3, 0.647, 2e-3, 8e-3, 2e-3, 3e-3, 1e-3, 4e-3, 0.019, 2e-3, 0.132, 3.435, 5e-3, 4e-3, 3e-3, 3e-3, 0.525, 1e-3, 4e-3, 2e-3, 3e-3, 7e-3, 1.206, 3e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.046, 2.539, 4.197, 1.125, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 7e-3, 3e-3, 0.023, 9e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 0.01, 7e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 0.094, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.158, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.747, 2e-3, 0.267, 1e-4, 1e-3, 8e-3, 0.01, 0.052, 0.196, 0.196, 1e-4, 1e-3, 0.504, 0.205, 0.944, 0.013, 0.311, 0.428, 0.229, 0.104, 0.101, 0.109, 0.102, 0.102, 0.137, 0.252, 0.048, 0.012, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.205, 0.192, 0.181, 0.371, 0.131, 0.088, 0.11, 0.236, 0.167, 0.069, 0.091, 0.119, 0.172, 0.137, 0.117, 0.141, 5e-3, 0.112, 0.229, 0.137, 0.034, 0.123, 0.084, 6e-3, 0.011, 0.064, 1e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 6.042, 1.063, 1.294, 4.124, 13.689, 0.579, 2.105, 1.822, 5.542, 0.948, 1.42, 3.124, 1.72, 7.129, 4.759, 1.349, 0.015, 5.115, 3.623, 4.903, 1.642, 1.84, 1.06, 0.063, 0.226, 0.656, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.023, 3e-3, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 8e-3, 1e-3, 1e-4, 1e-3, 1e-3, 2e-3, 7e-3, 1e-3, 1e-3, 3e-3, 3e-3, 1e-3, 2e-3, 8e-3, 9e-3, 3e-3, 2e-3, 5e-3, 2e-3, 1e-3, 3e-3, 9e-3, 0.038, 1e-3, 0.051, 1e-3, 5e-3, 1e-3, 0.011, 4e-3, 3e-3, 0.013, 8e-3, 2e-3, 2e-3, 8e-3, 1e-3, 4e-3, 1e-3, 3e-3, 2e-3, 0.01, 3e-3, 3e-3, 1e-3, 1e-4, 1e-4, 0.02, 0.166, 7e-3, 0.01, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 0.016, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.022, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ko": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.893, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.919, 3e-3, 0.069, 1e-4, 1e-4, 7e-3, 2e-3, 0.048, 0.269, 0.269, 1e-4, 2e-3, 0.501, 0.04, 0.699, 0.01, 0.29, 0.417, 0.259, 0.125, 0.109, 0.112, 0.1, 0.094, 0.109, 0.192, 0.015, 2e-3, 6e-3, 2e-3, 6e-3, 3e-3, 1e-4, 0.038, 0.026, 0.038, 0.022, 0.02, 0.024, 0.015, 0.013, 0.023, 8e-3, 0.015, 0.017, 0.027, 0.016, 0.016, 0.023, 2e-3, 0.017, 0.041, 0.027, 0.011, 0.013, 0.01, 5e-3, 4e-3, 2e-3, 6e-3, 1e-4, 6e-3, 1e-4, 0.012, 1e-4, 0.108, 0.014, 0.037, 0.031, 0.116, 0.024, 0.022, 0.032, 0.084, 2e-3, 0.021, 0.064, 0.06, 0.077, 0.092, 0.02, 1e-3, 0.086, 0.056, 0.066, 0.046, 0.011, 8e-3, 4e-3, 0.019, 4e-3, 1e-4, 2e-3, 1e-4, 0.025, 1e-4, 2.21, 0.565, 0.766, 0.471, 3.043, 0.671, 0.334, 0.049, 1.404, 0.218, 1.17, 1.657, 1.23, 0.278, 0.091, 0.557, 1.645, 0.451, 0.058, 0.386, 1.38, 2.193, 0.506, 1.29, 2.708, 0.68, 0.385, 0.399, 2.758, 3.352, 0.954, 0.141, 1.848, 0.829, 0.071, 0.249, 1.741, 0.637, 0.43, 0.888, 0.537, 0.506, 0.243, 0.027, 1.4, 0.355, 0.026, 0.179, 2.38, 0.404, 0.739, 1.021, 2.205, 0.729, 0.454, 0.308, 1.635, 0.561, 0.035, 0.084, 1.612, 0.309, 0.024, 0.047, 1e-4, 1e-4, 0.034, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.039, 0.089, 0.025, 0.107, 0.071, 0.044, 0.037, 0.043, 3.199, 8.716, 12.558, 3.298, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "cs": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.804, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.066, 2e-3, 0.232, 1e-4, 1e-4, 8e-3, 2e-3, 9e-3, 0.188, 0.188, 7e-3, 2e-3, 0.814, 0.094, 1.008, 0.025, 0.299, 0.437, 0.233, 0.115, 0.111, 0.119, 0.106, 0.102, 0.129, 0.233, 0.051, 0.011, 2e-3, 2e-3, 2e-3, 2e-3, 1e-4, 0.143, 0.145, 0.103, 0.117, 0.06, 0.072, 0.055, 0.092, 0.08, 0.13, 0.142, 0.093, 0.169, 0.137, 0.088, 0.246, 3e-3, 0.104, 0.236, 0.127, 0.039, 0.213, 0.033, 7e-3, 7e-3, 0.069, 2e-3, 1e-4, 2e-3, 1e-4, 5e-3, 1e-4, 5.018, 1.137, 1.8, 2.299, 5.465, 0.243, 0.288, 1.623, 3.2, 1.177, 2.624, 3.218, 2.048, 4.447, 5.813, 1.952, 6e-3, 3.062, 3.218, 3.502, 2.227, 3.008, 0.043, 0.058, 1.313, 1.405, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.104, 3e-3, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 3e-3, 0.041, 1e-3, 1e-3, 1e-3, 0.049, 0.57, 1e-3, 0.012, 1e-3, 1e-3, 2e-3, 0.048, 2e-3, 1e-3, 1e-3, 2e-3, 0.011, 0.748, 0.01, 0.981, 0.025, 1e-3, 0.025, 2e-3, 0.191, 1.9, 3e-3, 1e-3, 5e-3, 0.024, 2e-3, 2e-3, 2e-3, 0.87, 1e-3, 1e-3, 1e-3, 1.984, 1e-3, 0.336, 6e-3, 2e-3, 4e-3, 0.031, 2e-3, 3e-3, 6e-3, 1e-3, 3e-3, 1e-3, 0.094, 2e-3, 7e-3, 0.671, 0.58, 1e-3, 1e-4, 1e-4, 0.173, 5.104, 1.615, 2.233, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 0.021, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 9e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.103, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ar": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.65, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.194, 2e-3, 0.102, 1e-4, 1e-4, 7e-3, 1e-3, 2e-3, 0.109, 0.108, 2e-3, 1e-3, 0.03, 0.046, 0.42, 0.018, 0.182, 0.202, 0.135, 0.063, 0.065, 0.061, 0.055, 0.053, 0.062, 0.113, 0.054, 1e-3, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.01, 6e-3, 9e-3, 7e-3, 5e-3, 4e-3, 4e-3, 4e-3, 5e-3, 2e-3, 2e-3, 5e-3, 7e-3, 5e-3, 4e-3, 7e-3, 1e-3, 5e-3, 9e-3, 6e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 7e-3, 1e-3, 7e-3, 1e-4, 4e-3, 1e-4, 0.052, 8e-3, 0.019, 0.018, 0.055, 8e-3, 0.011, 0.016, 0.045, 1e-3, 6e-3, 0.028, 0.016, 0.037, 0.04, 0.012, 1e-3, 0.038, 0.03, 0.035, 0.02, 6e-3, 6e-3, 2e-3, 9e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.055, 1.131, 0.874, 0.939, 4.804, 2.787, 2.235, 1.018, 2.407, 0.349, 3.542, 0.092, 0.4, 7e-3, 0.051, 0.053, 0.022, 0.061, 0.01, 8e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 8e-3, 1e-3, 1e-3, 1e-4, 2e-3, 0.013, 0.133, 0.049, 0.782, 0.037, 0.335, 0.157, 6.208, 1.599, 1.486, 1.889, 0.276, 0.607, 0.762, 0.341, 1.38, 0.239, 2.041, 0.293, 1.149, 0.411, 0.383, 0.246, 0.406, 0.094, 1.401, 0.223, 6e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.027, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 23.298, 20.414, 3e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.019, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "vi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.205, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.546, 2e-3, 0.241, 1e-4, 1e-3, 0.015, 0.013, 9e-3, 0.13, 0.13, 1e-4, 2e-3, 0.714, 0.089, 0.813, 0.02, 0.259, 0.361, 0.203, 0.104, 0.097, 0.104, 0.089, 0.089, 0.116, 0.194, 0.047, 0.017, 2e-3, 2e-3, 2e-3, 2e-3, 1e-4, 0.148, 0.175, 0.293, 0.111, 0.056, 0.04, 0.092, 0.206, 0.057, 0.03, 0.119, 0.232, 0.178, 0.247, 0.036, 0.156, 0.056, 0.062, 0.184, 0.397, 0.022, 0.114, 0.033, 0.033, 0.019, 9e-3, 5e-3, 1e-4, 5e-3, 1e-4, 3e-3, 1e-4, 2.683, 0.66, 3.149, 0.627, 1.148, 0.076, 2.542, 4.362, 3.528, 0.019, 0.59, 1.486, 1.611, 5.924, 2.001, 0.761, 0.201, 1.559, 1.014, 3.555, 1.77, 0.861, 0.05, 0.173, 0.826, 0.047, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.021, 0.214, 0.011, 0.478, 2e-3, 0.039, 1e-3, 0.324, 2e-3, 0.072, 1e-3, 0.198, 2e-3, 0.32, 2e-3, 0.048, 0.141, 1.485, 1e-3, 0.116, 0.015, 0.106, 1e-3, 0.025, 2e-3, 0.579, 4e-3, 0.289, 4e-3, 0.257, 5e-3, 0.174, 1.516, 1.221, 0.326, 0.818, 0.013, 0.337, 5e-3, 0.51, 0.014, 0.324, 0.408, 0.115, 0.147, 0.492, 2e-3, 0.218, 0.82, 0.26, 0.102, 0.383, 0.379, 0.016, 6e-3, 0.094, 5e-3, 0.132, 2.233, 4.628, 9e-3, 0.062, 3e-3, 0.385, 1e-4, 1e-4, 0.047, 4.542, 1.653, 0.065, 0.997, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.011, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 6.74, 0.019, 4e-3, 2e-3, 9e-3, 6e-3, 4e-3, 3e-3, 3e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "el": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.389, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.245, 3e-3, 0.167, 1e-3, 1e-4, 5e-3, 2e-3, 0.015, 0.1, 0.101, 1e-4, 1e-3, 0.487, 0.058, 0.449, 0.01, 0.151, 0.215, 0.114, 0.058, 0.055, 0.058, 0.052, 0.051, 0.065, 0.119, 0.032, 1e-3, 3e-3, 3e-3, 3e-3, 1e-4, 1e-4, 0.021, 0.016, 0.024, 0.014, 0.012, 0.012, 0.011, 0.013, 0.012, 5e-3, 6e-3, 0.013, 0.018, 0.01, 9e-3, 0.015, 1e-3, 0.013, 0.025, 0.017, 5e-3, 6e-3, 8e-3, 2e-3, 2e-3, 1e-3, 5e-3, 1e-4, 5e-3, 1e-4, 2e-3, 1e-4, 0.125, 0.018, 0.039, 0.039, 0.142, 0.017, 0.026, 0.036, 0.105, 2e-3, 0.017, 0.072, 0.036, 0.093, 0.102, 0.022, 2e-3, 0.099, 0.07, 0.077, 0.046, 0.014, 0.01, 5e-3, 0.02, 5e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1.502, 1.948, 1.522, 1.805, 3.613, 1.458, 0.354, 0.481, 0.073, 0.584, 0.024, 2e-3, 0.912, 0.435, 0.305, 1e-3, 6e-3, 0.156, 0.057, 0.068, 0.049, 0.097, 0.01, 0.064, 0.017, 0.048, 0.112, 0.037, 0.115, 0.048, 3e-3, 0.099, 0.122, 0.029, 1e-3, 0.129, 0.119, 0.011, 0.03, 0.034, 2e-3, 8e-3, 1e-4, 0.022, 0.85, 0.749, 0.601, 1.063, 4e-3, 3.95, 0.27, 0.716, 0.649, 2.656, 0.14, 1.63, 0.422, 2.831, 1.733, 1.214, 1.337, 2.636, 0.149, 3.615, 1e-4, 1e-4, 0.06, 7e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 28.675, 14.922, 0.013, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 0.013, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.282, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.667, 1e-3, 0.345, 1e-4, 1e-4, 7e-3, 2e-3, 0.013, 0.083, 0.083, 1e-4, 1e-4, 0.902, 0.146, 1.182, 7e-3, 0.152, 0.25, 0.108, 0.06, 0.06, 0.065, 0.065, 0.066, 0.089, 0.153, 0.044, 4e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.178, 0.164, 0.421, 0.354, 0.095, 0.078, 0.149, 0.127, 0.181, 0.06, 0.161, 0.209, 0.174, 0.099, 0.072, 0.149, 0.019, 0.12, 0.249, 0.206, 0.034, 0.058, 0.04, 6e-3, 0.012, 0.014, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 6.63, 0.945, 0.963, 3.448, 8.696, 0.922, 2.03, 1.373, 4.448, 0.429, 1.949, 3.417, 3.024, 6.448, 3.193, 1.076, 0.019, 6.923, 3.891, 5.562, 1.877, 1.653, 0.074, 0.114, 0.424, 0.075, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.022, 0.039, 2e-3, 3e-3, 7e-3, 0.074, 4e-3, 7e-3, 5e-3, 2e-3, 2e-3, 1e-4, 3e-3, 8e-3, 2e-3, 4e-3, 1e-3, 2e-3, 1e-4, 0.011, 1e-3, 1e-3, 0.012, 1e-3, 5e-3, 2e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 3e-3, 0.21, 0.017, 5e-3, 4e-3, 1.574, 0.853, 2e-3, 7e-3, 8e-3, 0.038, 4e-3, 0.047, 1e-3, 0.014, 2e-3, 9e-3, 0.187, 0.01, 4e-3, 0.012, 4e-3, 2e-3, 0.808, 1e-3, 8e-3, 2e-3, 4e-3, 2e-3, 6e-3, 2e-3, 3e-3, 1e-3, 1e-4, 1e-4, 0.393, 3.436, 0.069, 0.044, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 0.014, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.021, 0.021, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 6e-3, 0.019, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hu": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.827, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.714, 4e-3, 0.265, 1e-4, 1e-4, 7e-3, 1e-3, 7e-3, 0.159, 0.159, 1e-3, 2e-3, 1.016, 0.461, 0.937, 0.013, 0.261, 0.429, 0.206, 0.109, 0.106, 0.113, 0.103, 0.105, 0.137, 0.238, 0.073, 0.019, 4e-3, 4e-3, 4e-3, 2e-3, 1e-4, 0.469, 0.135, 0.097, 0.073, 0.142, 0.093, 0.075, 0.087, 0.095, 0.062, 0.133, 0.086, 0.175, 0.085, 0.042, 0.096, 3e-3, 0.071, 0.186, 0.107, 0.027, 0.069, 0.028, 9e-3, 8e-3, 0.025, 2e-3, 1e-4, 2e-3, 1e-4, 4e-3, 1e-4, 6.316, 1.591, 0.619, 1.364, 7.125, 0.648, 2.159, 0.946, 3.15, 0.796, 3.265, 4.526, 2.054, 3.978, 3.047, 0.846, 6e-3, 3.327, 4.35, 5.787, 0.902, 1.395, 0.037, 0.035, 1.463, 2.94, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.129, 0.02, 3e-3, 3e-3, 1e-3, 1e-3, 1e-3, 3e-3, 2e-3, 0.014, 1e-3, 1e-3, 1e-3, 6e-3, 1e-4, 1e-3, 4e-3, 0.667, 1e-3, 0.068, 1e-3, 1e-4, 5e-3, 1e-3, 1e-3, 9e-3, 7e-3, 2e-3, 3e-3, 0.026, 0.026, 2e-3, 0.024, 2.603, 2e-3, 1e-3, 3e-3, 1e-3, 2e-3, 2e-3, 3e-3, 2.374, 1e-3, 2e-3, 1e-3, 0.448, 1e-3, 1e-3, 5e-3, 0.169, 3e-3, 0.702, 2e-3, 2e-3, 0.76, 1e-3, 4e-3, 2e-3, 0.223, 2e-3, 0.382, 4e-3, 4e-3, 1e-3, 1e-4, 1e-4, 0.028, 7.544, 0.01, 0.845, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 0.021, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.128, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ro": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.044, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.178, 3e-3, 0.287, 1e-3, 1e-3, 0.038, 2e-3, 0.011, 0.2, 0.201, 1e-3, 2e-3, 1.114, 0.333, 0.783, 0.015, 0.314, 0.397, 0.224, 0.108, 0.105, 0.107, 0.098, 0.099, 0.123, 0.221, 0.062, 0.021, 7e-3, 6e-3, 7e-3, 2e-3, 1e-4, 0.27, 0.164, 0.289, 0.16, 0.109, 0.099, 0.098, 0.077, 0.163, 0.044, 0.047, 0.132, 0.205, 0.095, 0.07, 0.207, 4e-3, 0.158, 0.242, 0.12, 0.072, 0.085, 0.033, 0.021, 0.01, 0.019, 6e-3, 1e-4, 6e-3, 1e-4, 7e-3, 1e-4, 7.568, 0.638, 3.253, 2.492, 8.352, 0.862, 0.693, 0.377, 7.77, 0.16, 0.142, 3.906, 1.919, 5.009, 3.799, 1.948, 8e-3, 5.326, 2.857, 4.711, 4.259, 0.743, 0.045, 0.139, 0.103, 0.506, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 0.128, 4e-3, 4e-3, 1.675, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 0.104, 1e-3, 1e-3, 2e-3, 1e-3, 0.018, 3e-3, 1e-3, 1e-3, 1e-3, 0.016, 0.733, 7e-3, 0.695, 6e-3, 0.05, 0.046, 2e-3, 0.038, 0.012, 0.339, 2e-3, 3e-3, 1e-3, 1e-3, 2e-3, 4e-3, 0.016, 1e-3, 3e-3, 1e-3, 4e-3, 0.716, 1e-3, 7e-3, 3e-3, 4e-3, 5e-3, 3e-3, 2e-3, 5e-3, 1e-3, 3e-3, 1e-3, 2e-3, 3e-3, 7e-3, 3e-3, 3e-3, 1e-3, 1e-4, 1e-4, 0.048, 1.213, 1.681, 0.01, 1e-4, 3e-3, 1.446, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 3e-3, 0.016, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.127, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "id": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.029, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.265, 3e-3, 0.293, 1e-3, 2e-3, 8e-3, 4e-3, 0.02, 0.156, 0.156, 1e-3, 2e-3, 0.897, 0.232, 0.837, 0.025, 0.281, 0.301, 0.205, 0.089, 0.081, 0.088, 0.077, 0.074, 0.084, 0.156, 0.047, 0.017, 4e-3, 4e-3, 4e-3, 2e-3, 1e-4, 0.336, 0.259, 0.156, 0.221, 0.076, 0.084, 0.101, 0.111, 0.249, 0.128, 0.292, 0.143, 0.276, 0.131, 0.06, 0.365, 8e-3, 0.137, 0.448, 0.233, 0.076, 0.043, 0.063, 0.011, 0.049, 0.014, 0.01, 1e-4, 0.01, 1e-4, 2e-3, 1e-4, 14.771, 1.913, 0.506, 3.424, 6.588, 0.273, 2.854, 1.797, 6.389, 0.58, 3.078, 2.893, 3.104, 7.626, 2.047, 2.047, 0.011, 4.279, 3.371, 3.841, 3.795, 0.171, 0.34, 0.026, 1.249, 0.063, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.031, 5e-3, 4e-3, 3e-3, 3e-3, 2e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 4e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.012, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 5e-3, 1e-3, 1e-3, 6e-3, 6e-3, 1e-3, 2e-3, 0.051, 5e-3, 2e-3, 2e-3, 3e-3, 1e-3, 2e-3, 3e-3, 2e-3, 9e-3, 1e-3, 2e-3, 1e-3, 3e-3, 1e-3, 1e-3, 4e-3, 3e-3, 4e-3, 3e-3, 2e-3, 2e-3, 2e-3, 1e-3, 3e-3, 2e-3, 2e-3, 2e-3, 4e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.055, 0.03, 5e-3, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 3e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 6e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 0.03, 3e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sk": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.159, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.105, 2e-3, 0.192, 1e-4, 1e-4, 7e-3, 2e-3, 5e-3, 0.209, 0.21, 0.013, 2e-3, 0.819, 0.162, 1.046, 0.023, 0.302, 0.407, 0.233, 0.125, 0.121, 0.119, 0.111, 0.11, 0.127, 0.222, 0.055, 0.011, 2e-3, 3e-3, 2e-3, 1e-3, 1e-4, 0.172, 0.157, 0.128, 0.107, 0.068, 0.073, 0.08, 0.101, 0.088, 0.103, 0.136, 0.098, 0.191, 0.186, 0.106, 0.263, 4e-3, 0.11, 0.26, 0.138, 0.041, 0.2, 0.032, 6e-3, 8e-3, 0.071, 1e-3, 1e-4, 1e-3, 1e-4, 4e-3, 1e-4, 6.363, 1.243, 1.749, 2.177, 5.774, 0.29, 0.367, 1.611, 4.04, 1.457, 2.743, 2.816, 2.062, 4.279, 6.818, 1.868, 6e-3, 3.912, 3.184, 3.285, 2.066, 3.292, 0.044, 0.067, 1.073, 1.331, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.113, 6e-3, 4e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 0.077, 3e-3, 1e-4, 1e-3, 0.033, 0.618, 6e-3, 0.066, 1e-3, 1e-3, 1e-3, 0.046, 1e-3, 6e-3, 1e-3, 1e-3, 1e-3, 0.013, 9e-3, 7e-3, 0.027, 1e-3, 0.026, 1e-3, 0.106, 1.828, 1e-3, 1e-3, 0.067, 0.259, 1e-3, 2e-3, 6e-3, 0.586, 1e-3, 1e-3, 1e-3, 0.717, 1e-3, 2e-3, 5e-3, 2e-3, 4e-3, 0.16, 0.12, 2e-3, 5e-3, 0.038, 2e-3, 1e-3, 0.54, 2e-3, 6e-3, 0.806, 0.828, 1e-3, 1e-4, 1e-4, 0.114, 4.297, 1.036, 1.463, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 3e-3, 0.014, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.112, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "da": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.925, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.716, 2e-3, 0.323, 1e-3, 1e-3, 7e-3, 4e-3, 0.044, 0.149, 0.15, 1e-3, 1e-3, 0.888, 0.199, 1.047, 0.017, 0.356, 0.494, 0.245, 0.119, 0.115, 0.124, 0.118, 0.127, 0.168, 0.257, 0.046, 0.018, 1e-3, 2e-3, 1e-3, 2e-3, 1e-4, 0.185, 0.17, 0.132, 0.265, 0.124, 0.155, 0.096, 0.211, 0.151, 0.076, 0.153, 0.12, 0.178, 0.102, 0.069, 0.125, 5e-3, 0.111, 0.307, 0.131, 0.057, 0.087, 0.054, 5e-3, 0.012, 0.01, 2e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 4.818, 1.29, 0.375, 4.241, 11.595, 1.856, 2.915, 1.153, 4.647, 0.373, 2.179, 3.858, 2.304, 5.903, 3.8, 1.073, 8e-3, 6.456, 4.455, 5.128, 1.418, 1.705, 0.066, 0.033, 0.579, 0.056, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.052, 3e-3, 2e-3, 1e-3, 1e-3, 8e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.033, 3e-3, 1e-4, 1e-3, 1e-3, 0.013, 5e-3, 1e-4, 1e-3, 2e-3, 8e-3, 1e-3, 2e-3, 0.01, 6e-3, 1e-3, 1e-3, 0.01, 0.595, 0.559, 2e-3, 2e-3, 0.02, 1e-3, 4e-3, 1e-3, 4e-3, 1e-3, 1e-3, 5e-3, 2e-3, 3e-3, 5e-3, 1e-3, 1e-3, 0.011, 1e-3, 0.585, 1e-3, 2e-3, 3e-3, 0.011, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.02, 1.836, 4e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.052, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "fi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.851, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.647, 2e-3, 0.239, 1e-4, 1e-4, 6e-3, 3e-3, 9e-3, 0.115, 0.115, 1e-4, 4e-3, 0.594, 0.296, 1.014, 0.011, 0.404, 0.475, 0.268, 0.112, 0.107, 0.117, 0.106, 0.107, 0.133, 0.295, 0.069, 7e-3, 3e-3, 4e-3, 3e-3, 1e-3, 1e-4, 0.183, 0.111, 0.1, 0.068, 0.113, 0.064, 0.065, 0.195, 0.087, 0.098, 0.225, 0.146, 0.211, 0.097, 0.06, 0.172, 5e-3, 0.116, 0.314, 0.181, 0.037, 0.143, 0.044, 6e-3, 0.048, 9e-3, 1e-3, 1e-4, 1e-3, 1e-4, 4e-3, 1e-4, 9.681, 0.162, 0.176, 0.832, 6.272, 0.12, 0.289, 1.322, 8.475, 1.576, 3.754, 4.597, 2.281, 6.958, 4.47, 1.345, 7e-3, 2.326, 6.029, 6.589, 4.108, 1.653, 0.05, 0.021, 1.301, 0.041, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.101, 2e-3, 2e-3, 1e-3, 4e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.061, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 8e-3, 1e-4, 1e-3, 1e-3, 0.032, 1e-4, 1e-3, 0.032, 0.02, 1e-3, 1e-3, 2.624, 3e-3, 1e-3, 1e-3, 2e-3, 0.014, 1e-4, 2e-3, 1e-3, 0.01, 1e-3, 1e-3, 3e-3, 2e-3, 2e-3, 5e-3, 1e-3, 1e-3, 0.349, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 5e-3, 2e-3, 4e-3, 1e-3, 1e-4, 1e-4, 0.039, 3.028, 6e-3, 0.023, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 7e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.101, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "th": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.353, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.736, 1e-3, 0.084, 1e-4, 1e-4, 3e-3, 1e-3, 3e-3, 0.081, 0.081, 1e-4, 1e-3, 0.043, 0.029, 0.16, 5e-3, 0.088, 0.106, 0.121, 0.047, 0.051, 0.082, 0.032, 0.03, 0.033, 0.045, 8e-3, 4e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.013, 9e-3, 0.013, 8e-3, 8e-3, 6e-3, 6e-3, 6e-3, 8e-3, 3e-3, 3e-3, 6e-3, 0.01, 6e-3, 5e-3, 9e-3, 1e-3, 7e-3, 0.015, 0.012, 3e-3, 3e-3, 6e-3, 1e-3, 2e-3, 1e-3, 3e-3, 1e-4, 3e-3, 1e-4, 1e-3, 1e-4, 0.08, 0.011, 0.029, 0.025, 0.092, 0.012, 0.017, 0.027, 0.069, 1e-3, 9e-3, 0.042, 0.023, 0.063, 0.066, 0.017, 1e-3, 0.062, 0.045, 0.056, 0.028, 8e-3, 7e-3, 3e-3, 0.015, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1.311, 1.859, 0.629, 0.364, 0.845, 1e-3, 0.034, 1.547, 1.721, 0.971, 0.381, 0.156, 0.367, 0.089, 0.014, 0.016, 0.045, 9e-3, 0.014, 0.115, 0.776, 0.653, 0.138, 0.742, 0.12, 1.918, 0.573, 0.602, 0.112, 0.028, 0.443, 0.069, 0.115, 1.089, 0.883, 1.745, 0.026, 0.859, 1e-3, 0.829, 0.228, 0.108, 0.682, 0.53, 8e-3, 1.369, 0.031, 6e-3, 0.627, 1.083, 2.149, 0.218, 0.714, 0.916, 0.178, 0.322, 26.536, 5.927, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 7e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 31.884, 1e-3, 0.018, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bg": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.55, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.448, 1e-3, 0.106, 1e-4, 1e-4, 5e-3, 1e-3, 3e-3, 0.12, 0.12, 2e-3, 1e-3, 0.557, 0.131, 0.613, 0.011, 0.182, 0.272, 0.137, 0.074, 0.072, 0.075, 0.066, 0.065, 0.083, 0.144, 0.028, 9e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.013, 9e-3, 0.015, 8e-3, 7e-3, 6e-3, 6e-3, 6e-3, 0.041, 2e-3, 3e-3, 7e-3, 0.011, 6e-3, 5e-3, 0.01, 1e-3, 6e-3, 0.015, 0.011, 3e-3, 0.01, 5e-3, 7e-3, 1e-3, 1e-3, 3e-3, 1e-4, 3e-3, 1e-4, 2e-3, 1e-4, 0.088, 0.012, 0.031, 0.028, 0.092, 9e-3, 0.016, 0.024, 0.077, 2e-3, 0.014, 0.045, 0.037, 0.056, 0.066, 0.019, 1e-3, 0.063, 0.052, 0.05, 0.037, 8e-3, 6e-3, 3e-3, 0.013, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.651, 2.091, 3.127, 0.625, 0.166, 0.165, 0.297, 0.452, 0.133, 0.189, 0.677, 1e-3, 0.018, 1e-3, 0.079, 0.727, 0.091, 0.092, 0.108, 0.095, 0.081, 0.039, 9e-3, 0.034, 0.052, 0.011, 0.114, 0.044, 0.167, 0.089, 0.136, 0.155, 0.116, 0.171, 0.083, 0.024, 0.037, 0.04, 0.014, 0.018, 0.016, 9e-3, 1e-3, 1e-4, 1e-3, 2e-3, 0.012, 8e-3, 5.212, 0.516, 1.875, 0.701, 1.296, 3.589, 0.274, 0.882, 3.979, 0.288, 1.391, 1.465, 0.909, 3.169, 3.698, 1.109, 1e-4, 1e-4, 0.048, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 1e-4, 0.015, 6e-3, 31.942, 11.185, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.201, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "he": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.485, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.289, 1e-3, 0.262, 1e-4, 1e-4, 5e-3, 1e-3, 0.096, 0.104, 0.103, 1e-4, 1e-3, 0.64, 0.203, 0.573, 5e-3, 0.181, 0.234, 0.129, 0.06, 0.061, 0.062, 0.055, 0.054, 0.065, 0.138, 0.049, 0.013, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.016, 0.011, 0.014, 9e-3, 7e-3, 7e-3, 6e-3, 7e-3, 9e-3, 3e-3, 3e-3, 8e-3, 0.012, 7e-3, 5e-3, 0.01, 1e-3, 8e-3, 0.016, 0.012, 3e-3, 4e-3, 5e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 7e-3, 1e-4, 0.073, 8e-3, 0.021, 0.022, 0.081, 0.015, 0.013, 0.021, 0.056, 1e-3, 7e-3, 0.043, 0.024, 0.051, 0.061, 0.011, 1e-3, 0.058, 0.038, 0.043, 0.032, 7e-3, 5e-3, 3e-3, 0.012, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 3e-3, 2e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 2.008, 2.447, 0.696, 1.135, 3.773, 4.868, 0.394, 0.995, 0.678, 4.903, 0.173, 0.854, 2.776, 1.153, 2.22, 0.562, 1.585, 0.919, 1.159, 0.101, 0.969, 0.062, 0.568, 1.054, 2.634, 1.902, 2.428, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 9e-3, 2e-3, 2e-3, 2e-3, 6e-3, 4e-3, 5e-3, 5e-3, 8e-3, 5e-3, 1e-3, 2e-3, 0.01, 2e-3, 5e-3, 1e-3, 1e-4, 1e-4, 8e-3, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 0.015, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.044, 42.985, 6e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.013, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "uk": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.595, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.309, 1e-3, 0.06, 1e-4, 1e-3, 0.01, 1e-3, 0.059, 0.134, 0.135, 2e-3, 2e-3, 0.619, 0.137, 0.568, 0.01, 0.199, 0.281, 0.159, 0.081, 0.077, 0.082, 0.071, 0.067, 0.079, 0.158, 0.041, 0.017, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 0.014, 9e-3, 0.015, 9e-3, 7e-3, 6e-3, 7e-3, 6e-3, 0.029, 2e-3, 3e-3, 7e-3, 0.011, 6e-3, 5e-3, 0.01, 1e-3, 8e-3, 0.016, 0.01, 3e-3, 0.01, 4e-3, 0.011, 1e-3, 1e-3, 3e-3, 1e-4, 3e-3, 1e-4, 4e-3, 1e-4, 0.067, 8e-3, 0.022, 0.02, 0.069, 0.01, 0.012, 0.018, 0.056, 1e-3, 8e-3, 0.037, 0.02, 0.046, 0.054, 0.014, 1e-3, 0.051, 0.037, 0.039, 0.027, 7e-3, 6e-3, 3e-3, 0.012, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.481, 1.842, 2.043, 1.429, 0.162, 0.46, 0.448, 0.496, 0.265, 0.125, 1e-3, 3e-3, 0.806, 1e-3, 0.316, 0.84, 0.08, 0.077, 0.114, 0.065, 0.394, 0.018, 2.734, 0.422, 1e-3, 0.01, 0.11, 0.047, 0.088, 0.083, 0.052, 0.13, 0.228, 0.124, 0.058, 0.089, 0.032, 0.023, 0.02, 0.023, 0.023, 4e-3, 1e-4, 0.09, 1e-4, 1e-3, 8e-3, 0.014, 3.574, 0.601, 2.221, 0.664, 1.335, 1.986, 0.299, 0.851, 2.427, 0.557, 1.658, 1.688, 1.249, 3.061, 4.029, 1.082, 1e-4, 1e-4, 0.335, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.018, 1e-4, 2e-3, 1e-3, 28.71, 14.784, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.144, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lt": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.086, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.626, 2e-3, 0.167, 1e-3, 1e-4, 9e-3, 1e-3, 0.01, 0.234, 0.234, 1e-3, 2e-3, 1.069, 0.088, 1.436, 9e-3, 0.347, 0.549, 0.256, 0.135, 0.132, 0.151, 0.128, 0.13, 0.15, 0.368, 0.06, 0.018, 1e-3, 2e-3, 2e-3, 1e-3, 1e-4, 0.213, 0.143, 0.054, 0.128, 0.066, 0.049, 0.096, 0.041, 0.157, 0.121, 0.23, 0.188, 0.16, 0.109, 0.037, 0.238, 2e-3, 0.129, 0.21, 0.163, 0.036, 0.209, 0.013, 0.047, 0.01, 0.016, 2e-3, 1e-4, 2e-3, 1e-4, 3e-3, 1e-4, 8.107, 0.954, 0.391, 1.797, 4.13, 0.204, 1.223, 0.172, 9.411, 1.587, 2.883, 2.415, 2.501, 3.736, 4.946, 1.811, 3e-3, 4.047, 5.62, 3.782, 3.399, 1.76, 0.016, 8e-3, 1.047, 0.248, 1e-4, 0.015, 1e-4, 2e-3, 1e-4, 0.475, 5e-3, 3e-3, 2e-3, 2e-3, 0.411, 1e-3, 1e-3, 6e-3, 1e-3, 1e-3, 1e-3, 0.019, 0.313, 1e-4, 1e-3, 1e-3, 1e-3, 6e-3, 0.247, 1e-3, 1e-4, 1e-3, 1.225, 1e-3, 0.136, 1e-3, 1e-3, 0.108, 3e-3, 0.111, 1e-3, 0.364, 0.781, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 3e-3, 2e-3, 0.299, 1e-3, 4e-3, 0.013, 0.355, 7e-3, 2e-3, 7e-3, 0.931, 1e-3, 4e-3, 1e-3, 1e-3, 4e-3, 2e-3, 3e-3, 3e-3, 3e-3, 0.037, 0.575, 1e-3, 1e-4, 1e-4, 0.29, 0.016, 2.467, 2.697, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 0.033, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.477, 1e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.115, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.127, 2e-3, 0.244, 1e-4, 1e-4, 7e-3, 4e-3, 0.029, 0.125, 0.125, 1e-3, 1e-3, 0.736, 0.236, 1.026, 0.016, 0.357, 0.45, 0.2, 0.113, 0.108, 0.13, 0.122, 0.121, 0.148, 0.271, 0.033, 9e-3, 4e-3, 2e-3, 4e-3, 1e-3, 1e-4, 0.218, 0.193, 0.121, 0.247, 0.133, 0.148, 0.105, 0.221, 0.171, 0.071, 0.137, 0.127, 0.194, 0.145, 0.08, 0.133, 7e-3, 0.124, 0.352, 0.152, 0.062, 0.099, 0.053, 6e-3, 0.016, 0.016, 5e-3, 1e-4, 5e-3, 1e-4, 2e-3, 1e-3, 6.479, 0.879, 0.246, 3.008, 9.683, 1.285, 2.701, 0.948, 5.112, 0.784, 2.645, 3.726, 2.383, 5.836, 3.991, 1.273, 9e-3, 6.373, 4.403, 5.512, 1.465, 1.904, 0.067, 0.025, 0.761, 0.055, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.031, 0.01, 5e-3, 3e-3, 3e-3, 0.012, 2e-3, 3e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 0.02, 3e-3, 2e-3, 2e-3, 1e-3, 0.013, 5e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 3e-3, 0.042, 0.013, 2e-3, 2e-3, 0.016, 0.934, 0.093, 4e-3, 0.01, 0.021, 4e-3, 0.076, 2e-3, 0.01, 1e-3, 2e-3, 0.012, 7e-3, 0.039, 0.01, 4e-3, 6e-3, 0.015, 2e-3, 0.552, 4e-3, 6e-3, 0.078, 0.011, 6e-3, 7e-3, 3e-3, 1e-4, 1e-4, 0.197, 1.726, 9e-3, 8e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 0.017, 7e-3, 0.044, 0.016, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 0.01, 9e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 2e-3, 0.027, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.893, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.172, 2e-3, 0.34, 1e-4, 1e-3, 0.011, 2e-3, 0.016, 0.182, 0.182, 1e-3, 2e-3, 0.943, 0.135, 1.23, 0.019, 0.3, 0.38, 0.204, 0.106, 0.1, 0.109, 0.096, 0.094, 0.112, 0.22, 0.065, 0.02, 9e-3, 4e-3, 9e-3, 2e-3, 1e-4, 0.156, 0.17, 0.109, 0.14, 0.063, 0.069, 0.111, 0.12, 0.137, 0.079, 0.163, 0.086, 0.175, 0.178, 0.118, 0.22, 4e-3, 0.116, 0.267, 0.137, 0.108, 0.095, 0.03, 8e-3, 9e-3, 0.078, 0.011, 1e-4, 0.011, 1e-4, 2e-3, 1e-4, 8.648, 1.028, 0.78, 2.344, 6.653, 0.218, 1.346, 0.572, 7.393, 3.932, 2.783, 2.724, 2.195, 4.91, 6.755, 1.994, 7e-3, 4.039, 3.61, 3.329, 3.254, 2.478, 0.043, 0.016, 0.083, 1.288, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 0.039, 5e-3, 4e-3, 3e-3, 2e-3, 1e-3, 3e-3, 0.353, 2e-3, 1e-3, 1e-3, 1e-3, 0.016, 0.678, 1e-3, 1e-3, 4e-3, 0.158, 1e-3, 0.011, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 9e-3, 5e-3, 8e-3, 1e-3, 0.033, 0.524, 3e-3, 2e-3, 3e-3, 1e-3, 1e-3, 2e-3, 2e-3, 0.01, 1e-3, 5e-3, 1e-3, 4e-3, 1e-3, 1e-3, 8e-3, 4e-3, 5e-3, 5e-3, 2e-3, 4e-3, 4e-3, 1e-3, 4e-3, 2e-3, 4e-3, 6e-3, 6e-3, 0.016, 0.36, 2e-3, 1e-4, 1e-4, 0.021, 0.044, 1.208, 0.914, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.011, 5e-3, 0.028, 0.01, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.038, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "no": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.028, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.853, 2e-3, 0.247, 1e-4, 1e-3, 6e-3, 4e-3, 0.016, 0.159, 0.158, 1e-3, 1e-3, 0.698, 0.213, 1.037, 0.017, 0.377, 0.496, 0.255, 0.116, 0.113, 0.123, 0.117, 0.116, 0.152, 0.295, 0.042, 0.013, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 0.196, 0.176, 0.125, 0.246, 0.126, 0.148, 0.099, 0.211, 0.167, 0.071, 0.132, 0.135, 0.185, 0.133, 0.091, 0.127, 6e-3, 0.11, 0.321, 0.146, 0.058, 0.092, 0.051, 7e-3, 0.014, 0.011, 2e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 4.956, 1.168, 0.243, 2.996, 11.38, 1.384, 2.632, 1.02, 4.719, 0.546, 2.591, 3.946, 2.341, 6.218, 3.979, 1.354, 9e-3, 6.417, 4.712, 5.821, 1.424, 1.732, 0.061, 0.029, 0.639, 0.049, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.041, 6e-3, 3e-3, 2e-3, 2e-3, 9e-3, 2e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.034, 2e-3, 1e-3, 2e-3, 1e-3, 0.014, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 0.028, 9e-3, 1e-3, 2e-3, 0.012, 0.765, 0.126, 3e-3, 3e-3, 0.021, 1e-3, 0.062, 1e-3, 6e-3, 1e-3, 1e-3, 7e-3, 3e-3, 6e-3, 6e-3, 2e-3, 3e-3, 0.012, 1e-3, 0.598, 2e-3, 4e-3, 0.062, 9e-3, 4e-3, 4e-3, 2e-3, 1e-4, 1e-4, 0.152, 1.588, 7e-3, 7e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 4e-3, 0.022, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 0.039, 1e-3, 1e-3, 4e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.872, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.68, 1e-3, 0.1, 1e-4, 1e-4, 9e-3, 1e-4, 5e-3, 0.176, 0.176, 1e-4, 3e-3, 0.5, 0.178, 0.762, 0.011, 0.275, 0.318, 0.214, 0.099, 0.096, 0.093, 0.078, 0.075, 0.084, 0.129, 0.031, 8e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 0.017, 0.01, 0.025, 0.013, 7e-3, 6e-3, 0.019, 7e-3, 0.026, 3e-3, 8e-3, 7e-3, 0.014, 0.016, 0.013, 0.016, 1e-3, 9e-3, 0.02, 0.011, 6e-3, 8e-3, 3e-3, 4e-3, 1e-3, 3e-3, 2e-3, 1e-4, 2e-3, 1e-4, 0.018, 1e-4, 0.453, 0.047, 0.05, 0.128, 0.37, 0.027, 0.066, 0.039, 0.393, 0.16, 0.152, 0.148, 0.154, 0.268, 0.352, 0.1, 1e-3, 0.219, 0.193, 0.185, 0.165, 0.107, 3e-3, 2e-3, 7e-3, 0.07, 0.053, 1e-3, 0.053, 1e-4, 1e-4, 2.152, 2.07, 1.61, 1.756, 0.112, 0.204, 0.344, 0.339, 0.366, 3e-3, 7e-3, 1e-3, 1e-3, 0.031, 1e-4, 7e-3, 0.082, 0.095, 0.143, 0.054, 0.071, 0.047, 6e-3, 0.035, 1.459, 0.284, 0.347, 0.2, 0.143, 0.119, 0.086, 0.186, 0.072, 0.175, 0.071, 0.052, 0.034, 0.041, 0.014, 0.02, 0.016, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 4.933, 0.477, 1.401, 0.663, 1.33, 3.708, 0.225, 0.704, 3.913, 1e-3, 1.472, 1.2, 1.198, 2.623, 3.682, 1.022, 1e-4, 1e-4, 0.018, 3e-3, 0.054, 0.041, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 30.181, 10.982, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.062, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ca": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.816, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.948, 2e-3, 0.294, 1e-3, 0.011, 0.035, 1e-3, 0.634, 0.154, 0.154, 1e-3, 2e-3, 1.001, 0.144, 0.747, 0.01, 0.301, 0.411, 0.25, 0.137, 0.131, 0.135, 0.12, 0.123, 0.144, 0.212, 0.051, 0.029, 2e-3, 3e-3, 3e-3, 1e-3, 1e-4, 0.252, 0.125, 0.23, 0.119, 0.296, 0.09, 0.091, 0.066, 0.12, 0.061, 0.034, 0.213, 0.174, 0.072, 0.049, 0.171, 0.012, 0.097, 0.192, 0.11, 0.053, 0.092, 0.024, 0.034, 0.01, 9e-3, 2e-3, 1e-4, 2e-3, 1e-4, 4e-3, 1e-4, 9.132, 1.004, 2.746, 3.236, 9.343, 0.681, 0.95, 0.465, 5.412, 0.169, 0.095, 4.932, 2.114, 4.848, 3.551, 1.884, 0.571, 5.202, 5.696, 4.416, 2.672, 1.094, 0.036, 0.312, 0.252, 0.123, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.044, 4e-3, 4e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.015, 1e-3, 1e-3, 1e-3, 5e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 6e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.021, 1e-3, 1e-3, 3e-3, 3e-3, 1e-3, 1e-3, 0.327, 0.012, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 0.088, 0.218, 0.355, 1e-3, 0.01, 3e-3, 0.236, 1e-3, 0.038, 5e-3, 7e-3, 0.161, 0.374, 2e-3, 3e-3, 3e-3, 0.047, 3e-3, 2e-3, 0.063, 0.01, 0.034, 3e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.099, 1.903, 5e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 4e-3, 0.012, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 5e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.039, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.06, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.437, 0.024, 0.237, 1e-3, 1e-3, 7e-3, 2e-3, 0.011, 0.174, 0.174, 0.021, 2e-3, 1.072, 0.17, 1.037, 0.022, 0.277, 0.429, 0.215, 0.122, 0.124, 0.121, 0.109, 0.108, 0.134, 0.239, 0.061, 0.025, 5e-3, 6e-3, 5e-3, 2e-3, 1e-4, 0.162, 0.141, 0.1, 0.122, 0.063, 0.075, 0.091, 0.086, 0.111, 0.082, 0.154, 0.138, 0.185, 0.145, 0.099, 0.224, 4e-3, 0.106, 0.263, 0.133, 0.042, 0.163, 0.031, 7e-3, 7e-3, 0.087, 0.013, 1e-4, 0.014, 1e-4, 6e-3, 1e-4, 7.7, 1.204, 0.709, 2.364, 7.782, 0.229, 1.139, 0.879, 6.985, 3.327, 2.701, 3.64, 2.037, 5.283, 6.653, 2.232, 6e-3, 4.152, 3.513, 3.409, 1.654, 3.049, 0.039, 0.016, 0.079, 1.473, 1e-4, 0.01, 1e-4, 1e-4, 1e-4, 0.054, 4e-3, 3e-3, 2e-3, 2e-3, 1e-3, 1e-3, 0.011, 2e-3, 2e-3, 1e-4, 1e-3, 0.021, 0.847, 1e-3, 1e-4, 1e-3, 2e-3, 2e-3, 0.027, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 0.056, 0.644, 7e-3, 1e-3, 3e-3, 1e-3, 1e-3, 2e-3, 3e-3, 0.013, 1e-3, 0.027, 1e-3, 5e-3, 1e-3, 1e-3, 7e-3, 3e-3, 4e-3, 5e-3, 2e-3, 3e-3, 6e-3, 1e-3, 4e-3, 2e-3, 4e-3, 0.028, 8e-3, 0.018, 0.391, 2e-3, 1e-4, 1e-4, 0.071, 0.059, 0.881, 1.071, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.01, 5e-3, 0.024, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.054, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.879, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.099, 4e-3, 0.432, 1e-4, 1e-4, 0.013, 2e-3, 7e-3, 0.207, 0.208, 1e-4, 3e-3, 0.965, 0.082, 1.276, 0.01, 0.332, 0.476, 0.254, 0.122, 0.117, 0.123, 0.105, 0.106, 0.127, 0.271, 0.045, 0.023, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 0.208, 0.134, 0.062, 0.128, 0.074, 0.067, 0.074, 0.058, 0.112, 0.068, 0.189, 0.194, 0.144, 0.089, 0.055, 0.234, 2e-3, 0.136, 0.249, 0.163, 0.042, 0.182, 0.012, 7e-3, 3e-3, 0.051, 1e-3, 1e-4, 1e-3, 1e-4, 3e-3, 1e-4, 8.58, 1.078, 0.806, 2.221, 4.451, 0.231, 1.228, 0.175, 6.667, 1.704, 2.603, 2.424, 2.389, 3.209, 2.883, 1.908, 3e-3, 4.056, 5.825, 4.121, 3.633, 1.801, 0.012, 9e-3, 0.029, 1.289, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.124, 2.988, 3e-3, 2e-3, 1e-3, 6e-3, 0.331, 1e-3, 2e-3, 1e-3, 1e-4, 1e-3, 0.015, 0.083, 1e-4, 1e-3, 1e-3, 1e-3, 7e-3, 1.174, 0.07, 1e-4, 1e-3, 1e-3, 2e-3, 3e-3, 1e-3, 1e-3, 5e-3, 0.012, 9e-3, 1e-3, 0.06, 0.627, 4e-3, 0.097, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 6e-3, 1.565, 1e-4, 2e-3, 1e-4, 1e-4, 0.01, 2e-3, 5e-3, 2e-3, 2e-3, 5e-3, 0.01, 0.106, 6e-3, 2e-3, 3e-3, 0.01, 0.298, 0.012, 0.176, 2e-3, 1e-4, 1e-4, 0.03, 0.013, 6.068, 1.452, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 0.051, 0.018, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.11, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "et": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.183, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.759, 3e-3, 0.281, 1e-4, 1e-4, 0.013, 1e-3, 0.037, 0.198, 0.199, 1e-3, 3e-3, 0.786, 0.203, 1.175, 0.017, 0.35, 0.548, 0.272, 0.142, 0.137, 0.143, 0.127, 0.129, 0.154, 0.323, 0.059, 0.022, 0.017, 3e-3, 0.017, 3e-3, 1e-4, 0.235, 0.096, 0.074, 0.061, 0.173, 0.056, 0.064, 0.105, 0.122, 0.088, 0.255, 0.166, 0.186, 0.114, 0.065, 0.208, 3e-3, 0.138, 0.296, 0.251, 0.046, 0.167, 0.033, 0.011, 8e-3, 0.01, 8e-3, 1e-4, 8e-3, 1e-4, 4e-3, 1e-4, 9.665, 0.664, 0.152, 2.822, 7.678, 0.189, 1.393, 1.095, 7.816, 1.25, 3.234, 4.738, 2.585, 4.03, 3.549, 1.167, 5e-3, 3.003, 6.68, 5.333, 4.153, 1.613, 0.043, 0.017, 0.074, 0.045, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.13, 0.015, 0.01, 6e-3, 4e-3, 3e-3, 3e-3, 4e-3, 2e-3, 2e-3, 1e-3, 2e-3, 3e-3, 5e-3, 1e-3, 3e-3, 2e-3, 2e-3, 3e-3, 0.102, 2e-3, 8e-3, 3e-3, 3e-3, 2e-3, 4e-3, 2e-3, 1e-3, 0.044, 5e-3, 6e-3, 3e-3, 0.016, 0.035, 3e-3, 2e-3, 0.833, 2e-3, 1e-3, 2e-3, 2e-3, 0.01, 1e-3, 6e-3, 1e-3, 5e-3, 1e-3, 1e-3, 0.017, 4e-3, 0.012, 7e-3, 5e-3, 0.763, 0.179, 3e-3, 0.015, 5e-3, 8e-3, 7e-3, 0.518, 0.012, 0.028, 3e-3, 1e-4, 1e-4, 0.02, 2.358, 0.019, 0.061, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 4e-3, 0.104, 0.037, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 0.123, 1e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.374, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.123, 2e-3, 0.071, 1e-4, 1e-3, 4e-3, 1e-4, 0.023, 0.08, 0.08, 1e-4, 1e-3, 0.255, 0.072, 0.052, 6e-3, 0.068, 0.07, 0.044, 0.02, 0.019, 0.023, 0.019, 0.019, 0.021, 0.04, 0.021, 6e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 8e-3, 4e-3, 7e-3, 4e-3, 5e-3, 3e-3, 4e-3, 3e-3, 6e-3, 1e-3, 2e-3, 3e-3, 5e-3, 4e-3, 3e-3, 5e-3, 1e-4, 3e-3, 8e-3, 5e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 7e-3, 1e-4, 8e-3, 1e-4, 1e-3, 1e-4, 0.049, 7e-3, 0.017, 0.016, 0.052, 8e-3, 0.01, 0.017, 0.038, 1e-3, 4e-3, 0.024, 0.015, 0.034, 0.035, 0.012, 1e-3, 0.033, 0.03, 0.034, 0.015, 5e-3, 5e-3, 2e-3, 8e-3, 1e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 1.039, 0.443, 1.278, 0.061, 1e-4, 0.273, 0.146, 1.879, 0.535, 0.214, 0.013, 0.729, 0.054, 1.826, 1e-4, 0.253, 0.014, 0.012, 1e-4, 0.042, 0.14, 2.07, 0.133, 0.43, 0.035, 4e-3, 0.215, 0.046, 0.503, 0.014, 0.016, 0.269, 0.037, 0.213, 0.023, 0.155, 24.777, 7.162, 0.554, 0.224, 1.23, 9e-3, 0.8, 0.117, 0.393, 0.245, 0.995, 0.828, 2.018, 1e-3, 0.771, 1e-3, 1e-3, 0.707, 0.299, 0.18, 1.226, 0.94, 1e-4, 1e-4, 0.133, 1e-3, 2.558, 1.303, 1e-4, 1e-4, 8e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.261, 1e-4, 0.024, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4]
};
var EXTENSIVE_LANG_FREQS = Object.assign({}, COMMON_LANG_FREQS, {
  "aa": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.161, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.548, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.29, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.29, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.452, 0.645, 0.645, 2.581, 9.032, 1e-4, 5.161, 3.871, 5.806, 1e-4, 1.935, 2.581, 1.29, 5.161, 2.581, 1.29, 1e-4, 4.516, 0.645, 3.226, 0.645, 1e-4, 1.29, 1e-4, 0.645, 1.29, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.581, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.29, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 1e-4, 1e-4, 1.29, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 0.645, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.871, 0.645, 2.581, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ab": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.925, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.477, 3e-3, 0.06, 1e-4, 1e-4, 5e-3, 1e-4, 0.013, 0.269, 0.273, 1e-3, 1e-3, 0.518, 0.306, 0.76, 6e-3, 0.291, 0.709, 0.42, 0.294, 0.242, 0.237, 0.242, 0.222, 0.25, 0.32, 0.04, 0.028, 8e-3, 1e-4, 8e-3, 2e-3, 1e-4, 4e-3, 4e-3, 4e-3, 6e-3, 1e-3, 2e-3, 1e-3, 1e-3, 0.033, 0.012, 1e-3, 1e-3, 2e-3, 1e-3, 0.011, 3e-3, 1e-4, 2e-3, 9e-3, 2e-3, 2e-3, 7e-3, 6e-3, 0.01, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.679, 0.013, 0.02, 0.028, 0.073, 2e-3, 6e-3, 0.01, 0.057, 1e-3, 5e-3, 0.035, 0.039, 0.025, 0.031, 0.027, 0.011, 0.045, 0.036, 0.027, 0.037, 9e-3, 2e-3, 0.01, 0.027, 4e-3, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 3.029, 1.109, 1.569, 1.131, 0.085, 0.805, 0.262, 0.083, 0.992, 2e-3, 3e-3, 2.495, 0.791, 3e-3, 6e-3, 0.03, 0.654, 0.059, 0.04, 0.137, 0.332, 0.075, 0.041, 0.012, 0.142, 2.586, 0.087, 1.002, 0.086, 0.047, 0.045, 0.323, 0.073, 0.328, 0.016, 0.067, 0.011, 0.052, 0.054, 0.455, 0.024, 0.199, 1e-4, 0.026, 0.015, 0.539, 1e-3, 1e-3, 7.771, 0.517, 0.209, 1.034, 0.683, 1.368, 0.238, 0.686, 3.093, 0.042, 0.729, 1.305, 0.754, 1.868, 1.136, 0.676, 1e-4, 1e-4, 0.065, 0.019, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 1e-3, 0.155, 1e-4, 5e-3, 2e-3, 22.83, 11.878, 3.39, 2.86, 0.019, 7e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.386, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ace": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.36, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.198, 1e-4, 0.137, 1e-4, 1e-3, 7e-3, 1e-4, 0.256, 0.125, 0.125, 1e-4, 1e-4, 1.042, 0.179, 1.302, 0.01, 0.401, 0.568, 0.284, 0.118, 0.113, 0.112, 0.099, 0.093, 0.097, 0.13, 0.041, 7e-3, 3e-3, 1e-3, 3e-3, 1e-3, 1e-4, 0.777, 0.587, 0.153, 0.133, 0.028, 0.036, 0.256, 0.095, 0.205, 0.159, 0.483, 0.331, 0.444, 0.183, 0.028, 0.481, 0.019, 0.179, 0.473, 0.324, 0.101, 0.026, 0.042, 6e-3, 0.021, 9e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 11.224, 1.773, 0.851, 1.583, 5.304, 0.086, 3.693, 3.458, 3.728, 0.528, 2.425, 2.037, 2.4, 8.165, 2.618, 1.607, 0.015, 2.485, 1.74, 2.806, 6.018, 0.112, 0.344, 0.01, 1.486, 0.04, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.039, 8e-3, 5e-3, 9e-3, 0.016, 7e-3, 6e-3, 6e-3, 0.01, 4e-3, 8e-3, 3e-3, 2e-3, 4e-3, 0.012, 4e-3, 7e-3, 3e-3, 4e-3, 0.014, 2e-3, 1e-3, 1e-3, 2e-3, 4e-3, 0.016, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 7e-3, 7e-3, 6e-3, 3e-3, 8e-3, 5e-3, 2e-3, 1e-3, 0.019, 1.193, 0.401, 7e-3, 0.574, 3e-3, 6e-3, 2e-3, 6e-3, 0.025, 0.011, 6e-3, 8e-3, 0.873, 4e-3, 0.151, 2e-3, 5e-3, 5e-3, 8e-3, 7e-3, 4e-3, 1e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.025, 3.205, 0.014, 0.012, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 4e-3, 1e-3, 0.012, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.061, 0.078, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 0.011, 0.039, 1e-3, 1e-3, 5e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ady": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.142, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.359, 1e-3, 0.089, 1e-4, 1e-4, 3e-3, 1e-4, 6e-3, 0.111, 0.11, 1e-3, 1e-3, 0.645, 0.309, 0.862, 7e-3, 0.118, 0.279, 0.082, 0.059, 0.052, 0.055, 0.051, 0.045, 0.057, 0.071, 0.053, 0.011, 3e-3, 3e-3, 3e-3, 1e-3, 1e-4, 8e-3, 7e-3, 3e-3, 3e-3, 2e-3, 3e-3, 1e-4, 2e-3, 1.228, 4e-3, 1e-3, 3e-3, 4e-3, 2e-3, 4e-3, 5e-3, 1e-4, 1e-3, 6e-3, 3e-3, 2e-3, 4e-3, 2e-3, 8e-3, 1e-4, 1e-4, 5e-3, 1e-4, 5e-3, 1e-4, 1e-3, 1e-4, 0.05, 9e-3, 0.016, 0.02, 0.067, 9e-3, 0.011, 0.022, 0.046, 1e-3, 6e-3, 0.031, 0.02, 0.036, 0.037, 0.013, 1e-4, 0.038, 0.031, 0.043, 0.016, 4e-3, 8e-3, 3e-3, 0.011, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.778, 0.778, 1.192, 2.098, 0.406, 1.886, 0.203, 0.188, 0.585, 0.672, 2.887, 2.927, 0.717, 6.004, 0.019, 0.21, 0.317, 0.122, 0.019, 0.226, 0.145, 0.045, 0.02, 0.041, 0.09, 5e-3, 0.262, 0.059, 0.092, 0.079, 0.053, 0.07, 0.076, 0.092, 0.086, 0.055, 0.029, 0.124, 0.039, 0.031, 0.045, 0.011, 1e-4, 0.031, 1e-4, 0.018, 5e-3, 0.018, 2.762, 0.645, 0.171, 1.681, 0.855, 1.134, 0.39, 0.89, 1.618, 0.147, 1.755, 1.169, 1.845, 1.192, 0.989, 0.792, 1e-4, 1e-4, 0.094, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 6e-3, 1e-4, 3e-3, 4e-3, 1e-4, 1e-4, 20.033, 23.044, 1e-3, 0.227, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 0.229, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "af": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.732, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.494, 2e-3, 0.361, 1e-4, 1e-3, 8e-3, 1e-3, 0.297, 0.136, 0.136, 2e-3, 1e-3, 0.651, 0.269, 0.893, 0.01, 0.25, 0.371, 0.17, 0.095, 0.09, 0.104, 0.09, 0.086, 0.122, 0.213, 0.049, 0.019, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 0.241, 0.154, 0.103, 0.382, 0.093, 0.072, 0.119, 0.168, 0.14, 0.087, 0.137, 0.088, 0.157, 0.131, 0.103, 0.129, 4e-3, 0.104, 0.29, 0.11, 0.03, 0.115, 0.083, 6e-3, 8e-3, 0.015, 2e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 6.202, 1.128, 0.17, 4.12, 13.284, 0.609, 2.484, 1.201, 6.602, 0.17, 2.299, 2.976, 1.671, 6.221, 4.571, 1.147, 6e-3, 5.197, 4.908, 4.263, 1.7, 1.691, 1.336, 0.018, 0.832, 0.043, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.182, 5e-3, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 0.024, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 0.118, 1e-3, 1e-3, 0.017, 0.016, 1e-3, 1e-3, 0.076, 0.018, 1e-3, 5e-3, 4e-3, 2e-3, 2e-3, 3e-3, 3e-3, 0.032, 0.053, 0.119, 1e-3, 4e-3, 1e-3, 0.014, 7e-3, 3e-3, 4e-3, 7e-3, 2e-3, 3e-3, 5e-3, 1e-3, 5e-3, 2e-3, 3e-3, 3e-3, 7e-3, 3e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.084, 0.264, 4e-3, 5e-3, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 3e-3, 1e-3, 1e-4, 9e-3, 4e-3, 0.022, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 3e-3, 0.181, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ak": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.856, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 17.14, 1e-3, 0.181, 1e-4, 2e-3, 4e-3, 1e-3, 0.124, 0.134, 0.137, 1e-3, 1e-4, 0.719, 0.119, 1.218, 0.014, 0.179, 0.257, 0.137, 0.052, 0.061, 0.075, 0.065, 0.054, 0.059, 0.197, 0.031, 0.029, 2e-3, 0.015, 2e-3, 0.018, 1e-4, 0.566, 0.167, 0.173, 0.118, 0.172, 0.085, 0.258, 0.093, 0.098, 0.056, 0.193, 0.111, 0.204, 0.399, 0.102, 0.121, 0.012, 0.083, 0.271, 0.145, 0.084, 0.04, 0.206, 0.011, 0.078, 0.02, 0.025, 1e-4, 0.025, 1e-4, 1e-4, 1e-4, 10.911, 1.752, 0.404, 1.704, 5.791, 1.18, 0.501, 1.542, 4.479, 0.04, 1.975, 0.667, 3.211, 7.434, 5.302, 0.888, 0.03, 2.693, 2.695, 1.838, 2.674, 0.126, 2.695, 0.023, 2.4, 0.077, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.046, 0.01, 2e-3, 5e-3, 2e-3, 6e-3, 0.095, 3e-3, 0.01, 3e-3, 6e-3, 0.011, 2e-3, 0.017, 2e-3, 4e-3, 0.052, 0.011, 1e-3, 2e-3, 1.774, 2e-3, 2e-3, 1e-3, 1e-4, 0.02, 1e-4, 1.749, 0.01, 0.01, 1e-4, 1e-4, 0.151, 4e-3, 1e-3, 2e-3, 6e-3, 0.022, 1e-3, 3e-3, 5e-3, 0.01, 2e-3, 3e-3, 2e-3, 5e-3, 1e-3, 3e-3, 0.01, 6e-3, 5e-3, 0.012, 0.015, 0.552, 7e-3, 3e-3, 8e-3, 6e-3, 6e-3, 0.392, 0.013, 5e-3, 7e-3, 4e-3, 1e-4, 1e-4, 0.146, 0.054, 4e-3, 4e-3, 0.139, 1e-4, 1e-4, 3.532, 2e-3, 8e-3, 3e-3, 0.34, 0.547, 1e-4, 0.045, 0.018, 1e-4, 1e-4, 0.018, 0.055, 8e-3, 2e-3, 0.016, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.048, 0.037, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "als": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.981, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.805, 3e-3, 0.368, 1e-4, 1e-4, 0.09, 1e-3, 0.06, 0.177, 0.177, 9e-3, 1e-3, 0.909, 0.215, 1.001, 0.022, 0.318, 0.46, 0.232, 0.128, 0.122, 0.132, 0.116, 0.119, 0.142, 0.206, 0.063, 0.024, 4e-3, 3e-3, 4e-3, 1e-3, 1e-4, 0.315, 0.452, 0.163, 0.512, 0.205, 0.236, 0.319, 0.219, 0.188, 0.156, 0.222, 0.212, 0.32, 0.172, 0.112, 0.199, 0.01, 0.225, 0.653, 0.132, 0.131, 0.173, 0.23, 4e-3, 0.019, 0.129, 9e-3, 1e-4, 9e-3, 1e-4, 3e-3, 1e-3, 3.964, 1.276, 2.626, 3.453, 8.363, 1.057, 2.308, 3.744, 6.377, 0.069, 0.66, 2.78, 2.213, 4.452, 3.12, 0.516, 0.012, 5.572, 4.629, 4.341, 2.669, 0.935, 0.979, 0.046, 0.315, 0.925, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.124, 3e-3, 2e-3, 2e-3, 0.034, 1e-3, 1e-3, 1e-3, 5e-3, 3e-3, 1e-4, 1e-4, 4e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 0.023, 2e-3, 1e-3, 0.01, 1e-3, 3e-3, 0.02, 3e-3, 2e-3, 0.048, 1e-3, 0.034, 0.042, 0.156, 5e-3, 5e-3, 3e-3, 1.018, 3e-3, 1e-3, 3e-3, 0.354, 0.039, 2e-3, 0.022, 0.079, 4e-3, 1e-3, 2e-3, 4e-3, 3e-3, 0.015, 3e-3, 0.029, 0.017, 0.333, 1e-3, 2e-3, 0.045, 4e-3, 0.015, 0.5, 4e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.108, 2.635, 6e-3, 5e-3, 1e-4, 5e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.011, 5e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 5e-3, 0.12, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "am": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.067, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.441, 5e-3, 0.08, 1e-3, 1e-4, 3e-3, 1e-4, 0.013, 0.12, 0.121, 2e-3, 1e-3, 0.021, 0.111, 0.25, 0.041, 0.102, 0.167, 0.089, 0.049, 0.044, 0.048, 0.044, 0.043, 0.057, 0.081, 0.018, 1e-3, 0.048, 0.019, 0.048, 8e-3, 1e-4, 9e-3, 5e-3, 7e-3, 5e-3, 5e-3, 4e-3, 3e-3, 3e-3, 4e-3, 4e-3, 2e-3, 3e-3, 6e-3, 3e-3, 2e-3, 4e-3, 1e-3, 3e-3, 7e-3, 5e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 0.017, 1e-4, 0.02, 1e-4, 7e-3, 1e-4, 0.059, 0.06, 0.021, 0.018, 0.066, 9e-3, 0.014, 0.02, 0.05, 1e-3, 5e-3, 0.029, 0.021, 0.042, 0.045, 0.014, 1e-3, 0.09, 0.032, 0.04, 0.026, 5e-3, 7e-3, 3e-3, 0.012, 2e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 0.402, 0.178, 0.052, 0.194, 0.053, 0.478, 0.259, 3e-3, 10.51, 5.557, 5.996, 6.414, 2.305, 3.741, 0.258, 0.015, 0.706, 0.091, 0.071, 0.613, 0.064, 1.598, 0.107, 8e-3, 0.907, 0.126, 0.312, 0.688, 0.12, 0.989, 0.129, 9e-3, 2.006, 0.213, 0.679, 0.599, 0.206, 1.204, 0.134, 0.012, 1.72, 0.213, 0.231, 1.059, 0.087, 1.793, 0.284, 0.013, 1.151, 0.255, 0.312, 0.726, 0.115, 2.127, 0.177, 0.025, 0.19, 0.059, 0.032, 0.208, 0.015, 0.466, 0.016, 3e-3, 1e-4, 1e-4, 0.096, 4e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 5e-3, 9e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 0.017, 0.046, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 29.467, 0.047, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 1e-3, 1e-4, 0.017, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "an": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.253, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.49, 5e-3, 0.725, 1e-4, 1e-4, 5e-3, 1e-3, 0.998, 0.246, 0.246, 2e-3, 2e-3, 1.083, 0.164, 0.685, 0.057, 0.291, 0.382, 0.213, 0.125, 0.12, 0.124, 0.115, 0.119, 0.131, 0.221, 0.057, 0.029, 7e-3, 0.01, 6e-3, 1e-3, 1e-4, 0.411, 0.169, 0.298, 0.091, 0.216, 0.095, 0.1, 0.059, 0.154, 0.037, 0.024, 0.177, 0.199, 0.072, 0.146, 0.19, 0.011, 0.122, 0.227, 0.128, 0.065, 0.101, 0.021, 0.037, 0.032, 0.028, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 9.483, 1.074, 3.3, 3.436, 7.765, 0.618, 0.822, 0.72, 5.365, 0.027, 0.17, 3.124, 1.916, 5.869, 6.23, 1.654, 0.435, 4.741, 4.813, 3.981, 2.96, 0.573, 0.028, 0.256, 1.248, 0.309, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 0.014, 7e-3, 3e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 7e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 2e-3, 0.028, 0.174, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 8e-3, 0.012, 0.227, 2e-3, 0.014, 2e-3, 0.209, 1e-3, 2e-3, 4e-3, 0.013, 0.086, 0.54, 2e-3, 2e-3, 3e-3, 2e-3, 4e-3, 2e-3, 0.027, 0.014, 0.019, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.127, 1.249, 7e-3, 7e-3, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 9e-3, 5e-3, 0.014, 5e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 2e-3, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 0.013, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ang": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.542, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.629, 1e-3, 0.406, 1e-3, 1e-3, 5e-3, 1e-3, 0.041, 0.166, 0.166, 1e-3, 1e-3, 0.772, 0.085, 0.973, 7e-3, 0.229, 0.292, 0.152, 0.081, 0.082, 0.095, 0.083, 0.089, 0.101, 0.139, 0.058, 0.032, 0.011, 1e-3, 0.011, 1e-3, 1e-4, 0.204, 0.193, 0.317, 0.089, 0.179, 0.148, 0.229, 0.279, 0.189, 0.034, 0.031, 0.128, 0.195, 0.168, 0.087, 0.103, 7e-3, 0.125, 0.419, 0.122, 0.043, 0.034, 0.145, 6e-3, 0.012, 7e-3, 0.02, 1e-4, 0.02, 1e-4, 1e-4, 1e-4, 5.666, 0.997, 2.318, 3.22, 8.139, 1.491, 2.061, 1.574, 3.89, 0.022, 0.109, 2.731, 2.332, 6.4, 3.389, 0.62, 0.014, 4.435, 4.532, 3.015, 1.701, 0.127, 1.341, 0.09, 0.658, 0.04, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 0.032, 0.62, 6e-3, 6e-3, 4e-3, 3e-3, 0.052, 2e-3, 1e-3, 1e-3, 2e-3, 0.033, 8e-3, 0.478, 2e-3, 2e-3, 0.01, 3e-3, 0.05, 1.069, 4e-3, 1e-3, 4e-3, 2e-3, 3e-3, 3e-3, 0.011, 0.012, 9e-3, 0.068, 0.141, 3e-3, 9e-3, 0.037, 0.013, 0.751, 6e-3, 2e-3, 1.085, 3e-3, 2e-3, 0.01, 0.039, 0.996, 2e-3, 8e-3, 2e-3, 2e-3, 0.371, 7e-3, 5e-3, 0.069, 2e-3, 3e-3, 2e-3, 8e-3, 6e-3, 3e-3, 5e-3, 4e-3, 5e-3, 4e-3, 2.003, 0.078, 1e-4, 1e-4, 9e-3, 3.7, 2.566, 0.742, 0.075, 0.766, 0.127, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 0.012, 6e-3, 0.017, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 6e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 0.024, 0.022, 3e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "arc": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.038, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.39, 1e-3, 0.055, 1e-4, 1e-4, 7e-3, 1e-4, 5e-3, 0.294, 0.294, 1e-4, 1e-4, 0.039, 0.041, 0.295, 0.017, 0.207, 0.161, 0.078, 0.046, 0.044, 0.053, 0.042, 0.044, 0.043, 0.091, 0.189, 6e-3, 3e-3, 4e-3, 3e-3, 1e-4, 1e-4, 0.01, 0.01, 0.013, 7e-3, 4e-3, 4e-3, 6e-3, 5e-3, 7e-3, 3e-3, 5e-3, 8e-3, 0.011, 8e-3, 4e-3, 8e-3, 1e-3, 7e-3, 0.013, 4e-3, 3e-3, 5e-3, 4e-3, 1e-3, 1e-3, 2e-3, 5e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.107, 0.013, 0.023, 0.039, 0.088, 0.011, 0.022, 0.025, 0.081, 3e-3, 0.021, 0.05, 0.023, 0.07, 0.066, 0.018, 2e-3, 0.062, 0.042, 0.051, 0.032, 0.013, 0.011, 6e-3, 0.012, 6e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.359, 0.027, 0.139, 0.022, 0.095, 0.021, 0.095, 0.051, 0.776, 5e-3, 0.029, 2e-3, 0.032, 3e-3, 0.011, 5e-3, 6.959, 8e-3, 1.918, 0.561, 0.013, 2.47, 3e-3, 1.261, 3.75, 0.282, 0.787, 0.504, 0.018, 4.683, 9e-3, 0.786, 1.796, 2.249, 2.761, 0.874, 9e-3, 1.007, 0.747, 0.053, 0.199, 0.858, 2.538, 1.15, 2.879, 0.016, 9e-3, 0.021, 0.023, 0.056, 0.023, 0.019, 0.01, 0.046, 7e-3, 0.011, 0.024, 0.035, 0.015, 0.012, 0.048, 0.023, 8e-3, 0.047, 1e-4, 1e-4, 4e-3, 0.019, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.832, 1e-3, 0.126, 0.053, 0.042, 0.017, 1e-3, 1e-4, 1e-4, 9e-3, 0.024, 0.108, 0.212, 0.141, 1e-3, 4e-3, 41.501, 0.031, 1e-4, 1e-4, 2e-3, 0.019, 0.018, 1e-4, 1e-3, 4e-3, 4e-3, 1e-4, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "arz": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.02, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.739, 3e-3, 0.126, 1e-4, 1e-4, 4e-3, 1e-3, 3e-3, 0.118, 0.124, 2e-3, 1e-3, 0.064, 0.045, 0.405, 0.01, 0.141, 0.269, 0.129, 0.067, 0.063, 0.072, 0.064, 0.065, 0.08, 0.165, 0.039, 2e-3, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.012, 9e-3, 0.011, 8e-3, 5e-3, 5e-3, 5e-3, 6e-3, 6e-3, 5e-3, 4e-3, 9e-3, 0.011, 5e-3, 3e-3, 7e-3, 1e-4, 6e-3, 0.013, 9e-3, 1e-3, 4e-3, 4e-3, 1e-3, 1e-3, 1e-3, 6e-3, 1e-3, 6e-3, 1e-4, 2e-3, 1e-4, 0.091, 0.01, 0.025, 0.026, 0.093, 0.01, 0.015, 0.024, 0.072, 2e-3, 0.01, 0.045, 0.023, 0.064, 0.06, 0.013, 1e-3, 0.06, 0.046, 0.047, 0.027, 9e-3, 7e-3, 4e-3, 0.017, 5e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.111, 1.136, 0.763, 1.043, 4.458, 2.752, 2.413, 1.721, 2.708, 1.077, 3.156, 0.021, 0.238, 2e-3, 0.017, 0.028, 8e-3, 0.018, 6e-3, 4e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 3e-3, 3e-3, 4e-3, 1e-4, 3e-3, 0.019, 0.06, 0.018, 0.274, 0.041, 0.116, 0.08, 6.51, 1.771, 0.79, 1.749, 0.151, 0.593, 0.743, 0.294, 1.313, 0.079, 2.202, 0.292, 1.274, 0.493, 0.453, 0.187, 0.361, 0.078, 1.267, 0.19, 5e-3, 2e-3, 2e-3, 0.011, 2e-3, 1e-4, 1e-4, 0.025, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 4e-3, 0.01, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 4e-3, 21.565, 21.383, 0.022, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.029, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "as": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.296, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.811, 1e-3, 0.086, 1e-4, 1e-4, 5e-3, 1e-4, 0.083, 0.075, 0.077, 1e-4, 1e-3, 0.203, 0.086, 0.044, 6e-3, 8e-3, 9e-3, 6e-3, 4e-3, 3e-3, 3e-3, 2e-3, 2e-3, 3e-3, 4e-3, 0.022, 7e-3, 2e-3, 3e-3, 2e-3, 1e-3, 1e-4, 0.015, 9e-3, 0.013, 7e-3, 6e-3, 5e-3, 5e-3, 6e-3, 0.011, 3e-3, 3e-3, 5e-3, 0.01, 7e-3, 4e-3, 0.011, 1e-3, 8e-3, 0.013, 0.013, 3e-3, 2e-3, 4e-3, 1e-4, 1e-3, 1e-3, 0.01, 1e-4, 0.01, 1e-4, 1e-3, 1e-4, 0.213, 0.031, 0.074, 0.083, 0.255, 0.044, 0.045, 0.095, 0.18, 4e-3, 0.017, 0.099, 0.058, 0.166, 0.164, 0.046, 2e-3, 0.151, 0.14, 0.179, 0.063, 0.023, 0.027, 5e-3, 0.036, 3e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.537, 0.769, 0.261, 0.102, 1e-3, 0.242, 0.382, 1.586, 0.215, 0.133, 2e-3, 0.429, 0.033, 1.928, 0.026, 0.213, 4e-3, 1e-4, 1e-4, 0.14, 3e-3, 1.299, 0.21, 0.401, 0.056, 0.073, 0.394, 0.328, 0.382, 6e-3, 0.051, 0.353, 0.081, 0.128, 0.02, 0.231, 1.75, 0.525, 21.552, 9.182, 1.32, 0.031, 0.846, 0.112, 0.982, 0.29, 0.858, 1.027, 2.855, 0.297, 0.931, 1e-4, 1e-4, 1e-4, 0.293, 0.318, 0.674, 0.559, 1e-3, 1e-4, 0.584, 1e-4, 2.717, 1.766, 1e-4, 1e-4, 9e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.161, 1e-4, 0.072, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ast": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.724, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.007, 2e-3, 0.424, 2e-3, 1e-3, 0.01, 3e-3, 0.548, 0.156, 0.156, 2e-3, 3e-3, 1.046, 0.096, 0.743, 0.015, 0.245, 0.288, 0.158, 0.086, 0.078, 0.093, 0.076, 0.077, 0.093, 0.166, 0.056, 0.032, 2e-3, 5e-3, 2e-3, 2e-3, 1e-4, 0.218, 0.121, 0.236, 0.117, 0.257, 0.089, 0.088, 0.078, 0.115, 0.051, 0.038, 0.23, 0.167, 0.117, 0.051, 0.161, 7e-3, 0.094, 0.198, 0.134, 0.043, 0.06, 0.041, 0.061, 0.037, 0.011, 0.014, 1e-4, 0.014, 1e-4, 1e-3, 1e-4, 8.074, 0.835, 3.151, 3.345, 9.578, 0.701, 0.803, 0.452, 5.046, 0.025, 0.11, 4.637, 2.087, 5.542, 5.253, 1.877, 0.488, 4.828, 5.384, 3.477, 3.909, 0.672, 0.055, 0.4, 0.967, 0.259, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 0.04, 0.01, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 0.01, 0.01, 1e-3, 1e-4, 1e-3, 2e-3, 9e-3, 1e-3, 1e-3, 5e-3, 6e-3, 1e-4, 1e-3, 0.026, 0.531, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 2e-3, 2e-3, 0.291, 1e-3, 0.019, 1e-3, 0.46, 1e-3, 1e-3, 5e-3, 0.157, 4e-3, 0.608, 2e-3, 2e-3, 3e-3, 2e-3, 4e-3, 2e-3, 0.119, 0.021, 0.027, 2e-3, 1e-3, 3e-3, 1e-4, 1e-4, 0.073, 2.207, 3e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.012, 5e-3, 7e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 0.039, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "atj": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.34, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.835, 1e-4, 0.034, 1e-4, 1e-4, 1e-3, 1e-4, 5e-3, 0.045, 0.047, 1e-4, 1e-4, 0.548, 0.045, 1.11, 6e-3, 0.039, 0.075, 0.033, 0.013, 0.017, 0.015, 0.02, 0.018, 0.017, 0.061, 0.024, 3e-3, 0.015, 1e-4, 0.015, 2e-3, 1e-4, 0.175, 0.012, 0.062, 0.025, 0.193, 0.022, 0.01, 6e-3, 0.035, 0.021, 0.212, 0.019, 0.332, 0.208, 0.141, 0.099, 7e-3, 0.017, 0.034, 0.12, 1e-3, 3e-3, 0.089, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 11.805, 0.044, 6.264, 0.083, 5.028, 8e-3, 0.026, 0.952, 15.443, 4e-3, 9.886, 0.134, 2.846, 5.167, 5.337, 2.131, 0.022, 2.079, 2.27, 7.277, 0.131, 0.025, 4.581, 5e-3, 0.015, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 9e-3, 0.046, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.015, 0.069, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "av": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.031, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.23, 1e-3, 0.083, 1e-4, 1e-4, 7e-3, 1e-3, 1e-3, 0.166, 0.166, 1e-3, 1e-3, 0.458, 0.25, 0.562, 0.01, 0.133, 0.234, 0.149, 0.084, 0.058, 0.065, 0.053, 0.053, 0.06, 0.094, 0.055, 0.017, 1e-3, 3e-3, 1e-3, 3e-3, 1e-4, 0.011, 6e-3, 0.01, 3e-3, 3e-3, 3e-3, 3e-3, 2e-3, 0.777, 1e-3, 2e-3, 2e-3, 6e-3, 3e-3, 3e-3, 2e-3, 1e-4, 2e-3, 7e-3, 8e-3, 3e-3, 6e-3, 1e-3, 0.011, 1e-3, 1e-4, 7e-3, 1e-4, 7e-3, 1e-4, 9e-3, 1e-4, 0.075, 8e-3, 0.02, 0.025, 0.067, 7e-3, 0.015, 0.018, 0.067, 1e-3, 8e-3, 0.038, 0.014, 0.043, 0.038, 0.019, 1e-3, 0.041, 0.043, 0.036, 0.031, 0.01, 6e-3, 3e-3, 0.01, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.671, 1.227, 0.995, 2.675, 0.059, 0.905, 0.851, 0.335, 0.128, 0.084, 1.771, 0.03, 0.884, 0.039, 0.044, 0.818, 0.134, 0.075, 0.027, 0.273, 0.227, 0.015, 0.029, 0.016, 0.039, 6e-3, 0.125, 0.043, 0.127, 0.032, 0.014, 0.032, 0.185, 0.089, 0.062, 0.016, 0.021, 0.082, 0.047, 0.033, 0.042, 6e-3, 2e-3, 0.039, 2e-3, 0.019, 5e-3, 0.013, 7.089, 1.927, 0.825, 1.964, 1.317, 1.929, 0.263, 0.636, 2.852, 0.187, 1.471, 3.734, 0.878, 1.983, 1.647, 0.208, 1e-4, 1e-4, 0.195, 6e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 0.022, 1e-4, 1e-3, 1e-4, 30.778, 12.343, 1e-4, 0.534, 1e-4, 2e-3, 1e-4, 1e-3, 0.025, 0.022, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.177, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ay": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.037, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.588, 5e-3, 0.247, 1e-4, 1e-4, 1e-4, 0.027, 1.72, 0.603, 0.602, 0.046, 1e-3, 1.21, 0.158, 1.031, 0.021, 0.387, 0.817, 0.515, 0.316, 0.306, 0.36, 0.273, 0.279, 0.341, 0.428, 0.504, 0.129, 0.064, 5e-3, 0.064, 0.147, 1e-4, 0.442, 0.126, 0.339, 0.185, 0.072, 0.071, 0.077, 0.1, 0.109, 0.302, 0.254, 0.268, 0.282, 0.145, 0.064, 0.43, 0.127, 0.121, 0.288, 0.2, 0.25, 0.05, 0.191, 0.012, 0.11, 0.013, 7e-3, 1e-4, 8e-3, 1e-4, 2e-3, 4e-3, 14.491, 0.243, 1.49, 0.745, 1.57, 0.085, 0.27, 2.104, 6.268, 1.613, 3.058, 2.342, 2.397, 3.14, 1.316, 1.65, 1.821, 3.874, 4.07, 2.906, 5.224, 0.153, 1.248, 0.859, 2.145, 0.119, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.211, 9e-3, 3e-3, 4e-3, 2e-3, 1e-3, 2e-3, 2e-3, 3e-3, 2e-3, 1e-3, 2e-3, 2e-3, 3e-3, 2e-3, 2e-3, 4e-3, 8e-3, 1e-3, 0.016, 6e-3, 2e-3, 1e-3, 1e-3, 5e-3, 0.126, 2e-3, 2e-3, 8e-3, 0.019, 1e-3, 1e-3, 0.061, 0.068, 1e-3, 3e-3, 0.22, 2e-3, 2e-3, 4e-3, 4e-3, 0.062, 2e-3, 3e-3, 1e-3, 0.11, 3e-3, 0.049, 0.044, 0.259, 0.029, 0.076, 0.026, 4e-3, 4e-3, 7e-3, 9e-3, 3e-3, 0.038, 0.01, 0.012, 3e-3, 5e-3, 6e-3, 1e-4, 1e-4, 0.133, 0.88, 3e-3, 4e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-3, 3e-3, 2e-3, 1e-4, 6e-3, 2e-3, 0.031, 0.01, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 4e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.01, 3e-3, 0.207, 1e-3, 4e-3, 8e-3, 5e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "az": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.803, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.785, 3e-3, 0.222, 1e-4, 1e-3, 9e-3, 1e-3, 7e-3, 0.139, 0.141, 1e-3, 2e-3, 0.64, 0.404, 0.91, 0.014, 0.244, 0.339, 0.188, 0.096, 0.09, 0.102, 0.087, 0.087, 0.102, 0.202, 0.038, 0.019, 4e-3, 2e-3, 4e-3, 4e-3, 1e-4, 0.276, 0.242, 0.068, 0.094, 0.057, 0.061, 0.057, 0.095, 0.062, 8e-3, 0.127, 0.055, 0.202, 0.081, 0.086, 0.077, 0.107, 0.098, 0.172, 0.115, 0.037, 0.055, 5e-3, 0.062, 0.066, 0.023, 6e-3, 1e-4, 6e-3, 1e-4, 4e-3, 1e-3, 7.007, 1.378, 0.673, 3.497, 1.722, 0.535, 0.389, 0.748, 6.853, 0.041, 1.544, 4.525, 2.336, 5.203, 1.602, 0.396, 1.07, 4.974, 2.444, 2.338, 1.812, 1.06, 8e-3, 0.478, 1.947, 0.87, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.147, 0.01, 9e-3, 5e-3, 5e-3, 9e-3, 3e-3, 0.033, 2e-3, 1e-3, 1e-3, 3e-3, 2e-3, 1e-3, 2e-3, 0.082, 4e-3, 1e-3, 2e-3, 0.028, 0.04, 1e-3, 0.012, 1e-3, 2e-3, 6.259, 1e-3, 1e-3, 0.046, 0.034, 0.075, 1.454, 0.026, 3e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.485, 1e-3, 1e-3, 1e-3, 0.011, 2e-3, 0.016, 1e-3, 1e-3, 0.187, 2.533, 9e-3, 4e-3, 5e-3, 0.028, 0.457, 3e-3, 0.014, 3e-3, 0.01, 0.017, 1.158, 0.011, 0.03, 4e-3, 1e-4, 1e-4, 0.067, 2.145, 2.985, 1.196, 0.079, 1e-4, 1e-4, 6.24, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 0.207, 0.052, 1e-4, 0.018, 1e-4, 1e-4, 1e-4, 1e-3, 8e-3, 9e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.14, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "azb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.225, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.112, 2e-3, 0.032, 1e-4, 1e-4, 3e-3, 1e-4, 2e-3, 0.275, 0.275, 2e-3, 1e-3, 0.028, 0.165, 0.744, 0.053, 0.037, 0.078, 0.041, 0.038, 0.027, 0.033, 0.024, 0.023, 0.03, 0.03, 0.059, 3e-3, 4e-3, 1e-3, 3e-3, 1e-4, 1e-4, 5e-3, 4e-3, 7e-3, 4e-3, 2e-3, 2e-3, 2e-3, 3e-3, 8e-3, 2e-3, 2e-3, 4e-3, 4e-3, 3e-3, 1e-3, 7e-3, 1e-3, 4e-3, 0.011, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 5e-3, 1e-4, 5e-3, 1e-4, 0.022, 1e-4, 0.096, 9e-3, 0.017, 0.038, 0.09, 0.012, 0.02, 0.043, 0.1, 1e-4, 0.026, 0.053, 0.017, 0.052, 0.064, 0.04, 1e-3, 0.055, 0.055, 0.106, 0.015, 3e-3, 0.052, 4e-3, 0.018, 9e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.77, 0.455, 0.528, 0.028, 2.648, 1.417, 3.922, 1.536, 3.205, 4e-3, 0.23, 4e-3, 7.975, 1e-3, 0.011, 0.01, 2e-3, 0.06, 0.27, 0.013, 4e-3, 1e-3, 1e-4, 1e-4, 0.033, 2e-3, 1e-4, 0.023, 1e-3, 1e-3, 1e-4, 2e-3, 0.02, 7e-3, 0.378, 4e-3, 0.281, 2e-3, 0.413, 5.027, 1.244, 0.85, 1.199, 0.132, 0.444, 0.158, 0.386, 2.668, 0.253, 3.47, 0.613, 1.73, 0.767, 0.17, 0.092, 0.269, 0.09, 0.326, 0.153, 0.08, 1e-3, 1e-3, 0.271, 2e-3, 1e-4, 1e-4, 0.181, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 18.661, 14.13, 1.511, 8.604, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 1e-4, 0.763, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ba": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.692, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.933, 2e-3, 0.044, 1e-4, 1e-4, 5e-3, 1e-4, 1e-3, 0.147, 0.147, 1e-4, 4e-3, 0.482, 0.143, 0.604, 0.015, 0.158, 0.244, 0.135, 0.077, 0.08, 0.076, 0.061, 0.06, 0.081, 0.125, 0.052, 0.011, 8e-3, 3e-3, 8e-3, 1e-3, 1e-4, 3e-3, 3e-3, 6e-3, 2e-3, 2e-3, 1e-3, 2e-3, 2e-3, 0.025, 1e-3, 2e-3, 2e-3, 3e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-3, 4e-3, 5e-3, 4e-3, 7e-3, 1e-3, 0.012, 1e-4, 1e-3, 6e-3, 1e-4, 6e-3, 1e-4, 2e-3, 1e-4, 0.021, 3e-3, 0.012, 0.011, 0.026, 4e-3, 4e-3, 6e-3, 0.021, 1e-3, 3e-3, 0.02, 7e-3, 0.023, 0.02, 5e-3, 1e-4, 0.016, 0.01, 0.014, 0.014, 2e-3, 3e-3, 1e-3, 9e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.739, 1.424, 2.096, 1.348, 0.183, 0.244, 0.115, 0.088, 0.621, 6e-3, 0.016, 3.259, 0.202, 0.093, 0.068, 0.404, 0.112, 0.175, 0.076, 1, 0.273, 0.018, 5e-3, 0.012, 0.081, 3.093, 0.13, 0.026, 0.084, 0.041, 0.082, 0.063, 0.299, 0.879, 0.098, 0.434, 0.038, 0.036, 5e-3, 0.017, 0.043, 0.504, 1e-4, 0.196, 1e-3, 0.016, 0.036, 0.445, 4.844, 0.952, 0.303, 0.533, 0.952, 2.488, 0.102, 0.15, 1.49, 1.18, 1.231, 3.558, 1.237, 2.847, 1.277, 0.365, 1e-4, 1e-4, 0.244, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 4e-3, 1e-4, 2e-3, 1e-3, 24.156, 12.667, 4.154, 3.011, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.235, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bar": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.604, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.871, 4e-3, 0.418, 1e-4, 1e-4, 8e-3, 2e-3, 0.216, 0.21, 0.21, 9e-3, 1e-3, 0.803, 0.202, 1.146, 0.023, 0.266, 0.394, 0.199, 0.121, 0.109, 0.119, 0.109, 0.117, 0.138, 0.187, 0.117, 0.02, 4e-3, 5e-3, 4e-3, 3e-3, 1e-4, 0.352, 0.447, 0.201, 0.532, 0.247, 0.245, 0.332, 0.228, 0.204, 0.156, 0.293, 0.235, 0.338, 0.204, 0.224, 0.214, 0.034, 0.205, 0.697, 0.181, 0.119, 0.18, 0.276, 5e-3, 0.01, 0.114, 0.021, 1e-4, 0.021, 1e-4, 3e-3, 3e-3, 8.177, 1.169, 1.993, 4.065, 6.625, 1.095, 2.102, 3.003, 6.12, 0.162, 0.941, 2, 2.327, 6.606, 4.578, 0.55, 0.014, 3.249, 4.677, 4.042, 3.018, 0.854, 1.171, 0.071, 0.239, 0.864, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.102, 3e-3, 3e-3, 2e-3, 4e-3, 4e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 0.014, 1e-3, 1e-3, 0.016, 1e-3, 2e-3, 9e-3, 1e-3, 1e-3, 0.039, 1e-3, 0.036, 0.116, 0.061, 7e-3, 3e-3, 1e-3, 0.274, 0.073, 2e-3, 2e-3, 4e-3, 0.027, 2e-3, 2e-3, 2e-3, 4e-3, 1e-3, 1e-3, 4e-3, 2e-3, 0.01, 0.016, 6e-3, 1e-3, 0.154, 2e-3, 5e-3, 1e-3, 2e-3, 2e-3, 0.176, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.07, 0.891, 7e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 7e-3, 4e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.103, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bcl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.379, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.071, 2e-3, 0.217, 1e-3, 3e-3, 5e-3, 2e-3, 0.116, 0.161, 0.16, 1e-4, 1e-3, 0.914, 0.25, 0.911, 0.022, 0.337, 0.439, 0.274, 0.132, 0.116, 0.128, 0.121, 0.133, 0.144, 0.229, 0.055, 0.02, 0.017, 1e-3, 0.017, 0.022, 1e-4, 0.585, 0.233, 0.246, 0.128, 0.11, 0.148, 0.111, 0.118, 0.238, 0.077, 0.175, 0.149, 0.27, 0.198, 0.07, 0.296, 0.013, 0.12, 0.508, 0.14, 0.057, 0.048, 0.04, 4e-3, 0.02, 0.015, 0.025, 1e-4, 0.025, 1e-4, 1e-4, 1e-4, 15.454, 1.486, 0.494, 1.897, 2.968, 0.126, 4.169, 0.861, 6.432, 0.033, 2.688, 2.392, 2.068, 10.392, 5.039, 1.872, 0.022, 3.21, 4.66, 2.796, 1.875, 0.174, 0.643, 0.021, 1.752, 0.121, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 0.039, 6e-3, 3e-3, 3e-3, 5e-3, 4e-3, 2e-3, 3e-3, 9e-3, 2e-3, 4e-3, 2e-3, 3e-3, 4e-3, 3e-3, 2e-3, 7e-3, 3e-3, 2e-3, 9e-3, 4e-3, 2e-3, 1e-3, 2e-3, 2e-3, 8e-3, 4e-3, 3e-3, 0.013, 0.011, 3e-3, 1e-3, 0.027, 0.035, 0.013, 4e-3, 5e-3, 3e-3, 3e-3, 6e-3, 4e-3, 6e-3, 4e-3, 3e-3, 7e-3, 0.019, 5e-3, 3e-3, 5e-3, 0.018, 0.01, 0.022, 0.014, 3e-3, 4e-3, 3e-3, 0.01, 4e-3, 6e-3, 4e-3, 5e-3, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.019, 0.136, 5e-3, 6e-3, 1e-4, 1e-4, 1e-4, 0.011, 4e-3, 0.01, 2e-3, 1e-4, 6e-3, 3e-3, 0.016, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 0.017, 0.012, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 7e-3, 0.034, 1e-3, 8e-3, 0.01, 6e-3, 4e-3, 2e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "be": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.607, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.35, 1e-3, 0.055, 1e-4, 1e-4, 6e-3, 1e-4, 0.05, 0.155, 0.156, 1e-3, 2e-3, 0.628, 0.121, 0.612, 9e-3, 0.188, 0.295, 0.148, 0.088, 0.085, 0.087, 0.076, 0.074, 0.089, 0.156, 0.032, 0.017, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 9e-3, 6e-3, 0.026, 4e-3, 5e-3, 3e-3, 0.019, 3e-3, 0.047, 1e-3, 2e-3, 4e-3, 9e-3, 0.01, 4e-3, 0.01, 1e-4, 5e-3, 0.013, 5e-3, 3e-3, 0.013, 4e-3, 0.018, 1e-3, 2e-3, 2e-3, 1e-4, 2e-3, 1e-4, 3e-3, 1e-4, 0.046, 6e-3, 0.014, 0.013, 0.042, 7e-3, 7e-3, 0.01, 0.04, 1e-3, 6e-3, 0.023, 0.014, 0.029, 0.035, 9e-3, 1e-3, 0.032, 0.024, 0.024, 0.019, 4e-3, 3e-3, 2e-3, 6e-3, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.314, 1.922, 1.481, 1.13, 0.14, 0.481, 1.007, 0.569, 0.351, 1e-3, 1e-3, 1.93, 0.479, 0.541, 0.221, 1.357, 0.128, 0.261, 0.085, 0.08, 0.203, 0.012, 2.438, 0.059, 1e-3, 0.01, 0.103, 0.048, 0.097, 0.076, 0.995, 0.141, 0.181, 0.137, 0.046, 0.12, 0.029, 0.02, 0.016, 0.019, 0.023, 1e-3, 1e-4, 0.081, 1e-4, 0.017, 7e-3, 0.023, 7.12, 0.583, 1.325, 0.884, 1.382, 1.613, 0.241, 1.022, 0.011, 0.528, 1.726, 1.757, 1.251, 2.924, 1.397, 1.062, 1e-4, 1e-4, 0.283, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.021, 1e-4, 2e-3, 1e-3, 26.294, 17.28, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.156, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bh": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.941, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.272, 1e-4, 0.067, 1e-4, 1e-3, 0.014, 1e-4, 6e-3, 0.074, 0.074, 1e-4, 1e-3, 0.205, 0.047, 0.036, 5e-3, 0.139, 0.215, 0.134, 0.072, 0.07, 0.074, 0.065, 0.069, 0.075, 0.087, 0.017, 7e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 6e-3, 4e-3, 5e-3, 2e-3, 3e-3, 2e-3, 4e-3, 2e-3, 7e-3, 1e-3, 2e-3, 3e-3, 3e-3, 3e-3, 2e-3, 4e-3, 1e-4, 2e-3, 6e-3, 6e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 9e-3, 1e-4, 0.1, 0.014, 0.029, 0.038, 0.115, 0.019, 0.024, 0.049, 0.081, 1e-3, 7e-3, 0.043, 0.023, 0.079, 0.071, 0.019, 1e-3, 0.072, 0.065, 0.081, 0.029, 0.011, 0.014, 2e-3, 0.014, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.902, 0.534, 1.035, 0.031, 1e-4, 0.22, 0.29, 2.243, 0.258, 0.137, 0.021, 0.553, 0.066, 1.318, 1e-4, 0.336, 9e-3, 9e-3, 1e-4, 0.03, 0.023, 1.891, 0.248, 0.639, 0.037, 0.011, 0.202, 0.05, 0.683, 0.024, 0.014, 0.375, 0.074, 0.252, 0.031, 0.13, 24.792, 6.19, 0.487, 0.175, 1.097, 1e-3, 0.677, 0.098, 0.808, 0.311, 0.975, 0.521, 2.028, 1e-4, 1.424, 1e-4, 1e-4, 0.605, 0.237, 0.107, 1.177, 0.742, 1e-4, 1e-4, 0.117, 3e-3, 3.031, 1.138, 1e-4, 1e-4, 0.016, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 29.692, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.859, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.276, 3e-3, 0.256, 1e-4, 1e-4, 3e-3, 3e-3, 0.016, 0.486, 0.484, 1e-3, 1e-4, 0.638, 0.156, 1.372, 0.022, 0.455, 0.969, 0.456, 0.237, 0.231, 0.247, 0.248, 0.25, 0.297, 0.612, 0.044, 0.019, 5e-3, 1e-4, 4e-3, 4e-3, 1e-4, 0.449, 0.264, 0.227, 0.165, 0.234, 0.192, 0.164, 0.234, 0.179, 0.456, 0.316, 0.231, 0.458, 0.197, 0.135, 0.315, 5e-3, 0.168, 0.606, 0.235, 0.049, 0.123, 0.109, 8e-3, 0.231, 0.017, 5e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 8.019, 2.445, 0.575, 1.178, 6.318, 0.449, 2.782, 1.275, 5.992, 0.203, 1.688, 4.658, 3.419, 6.494, 6.015, 1.447, 0.023, 2.565, 2.973, 3.583, 1.992, 0.459, 0.92, 0.044, 0.557, 0.136, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.108, 0.019, 0.014, 5e-3, 5e-3, 4e-3, 6e-3, 0.01, 5e-3, 8e-3, 2e-3, 2e-3, 0.012, 0.031, 2e-3, 1e-3, 2e-3, 4e-3, 3e-3, 0.089, 7e-3, 3e-3, 3e-3, 4e-3, 4e-3, 2e-3, 1e-3, 1e-3, 7e-3, 4e-3, 2e-3, 4e-3, 0.052, 0.019, 3e-3, 5e-3, 0.023, 9e-3, 0.014, 0.014, 8e-3, 0.023, 3e-3, 0.01, 5e-3, 0.015, 3e-3, 4e-3, 0.019, 0.013, 0.011, 0.022, 6e-3, 0.01, 7e-3, 4e-3, 0.018, 0.01, 9e-3, 9e-3, 0.011, 9e-3, 0.011, 9e-3, 1e-4, 1e-4, 0.048, 0.113, 0.02, 0.046, 1e-4, 2e-3, 1e-4, 5e-3, 1e-3, 2e-3, 1e-4, 1e-3, 0.032, 0.011, 0.078, 0.027, 1e-3, 1e-4, 1e-3, 0.018, 2e-3, 1e-4, 0.017, 9e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.037, 5e-3, 0.097, 1e-4, 1e-4, 7e-3, 3e-3, 1e-3, 3e-3, 1e-3, 2e-3, 1e-3, 6e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bjn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.274, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.352, 2e-3, 0.406, 1e-4, 1e-3, 0.013, 1e-3, 0.109, 0.199, 0.198, 2e-3, 1e-3, 0.988, 0.406, 0.819, 0.036, 0.185, 0.196, 0.136, 0.076, 0.062, 0.071, 0.054, 0.058, 0.057, 0.091, 0.102, 0.025, 2e-3, 3e-3, 2e-3, 5e-3, 1e-4, 0.244, 0.391, 0.098, 0.173, 0.034, 0.031, 0.106, 0.136, 0.207, 0.121, 0.411, 0.116, 0.312, 0.12, 0.035, 0.341, 3e-3, 0.133, 0.409, 0.258, 0.061, 0.026, 0.09, 2e-3, 0.038, 7e-3, 0.012, 1e-4, 0.012, 1e-4, 1e-4, 1e-4, 19.717, 2.113, 0.418, 2.814, 2.089, 0.126, 3.097, 2.135, 6.446, 0.654, 2.733, 2.879, 2.871, 8.542, 1.048, 1.844, 7e-3, 3.384, 2.985, 3.613, 4.514, 0.083, 0.972, 9e-3, 1.107, 0.035, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.03, 8e-3, 5e-3, 7e-3, 6e-3, 6e-3, 6e-3, 4e-3, 6e-3, 4e-3, 8e-3, 3e-3, 3e-3, 7e-3, 1e-3, 1e-3, 2e-3, 2e-3, 2e-3, 8e-3, 3e-3, 2e-3, 2e-3, 4e-3, 2e-3, 0.014, 1e-3, 2e-3, 5e-3, 5e-3, 2e-3, 2e-3, 0.012, 2e-3, 2e-3, 4e-3, 0.012, 5e-3, 4e-3, 0.011, 7e-3, 0.182, 6e-3, 5e-3, 4e-3, 4e-3, 3e-3, 5e-3, 9e-3, 8e-3, 5e-3, 5e-3, 3e-3, 2e-3, 1e-3, 3e-3, 6e-3, 4e-3, 4e-3, 3e-3, 3e-3, 3e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.019, 0.193, 7e-3, 9e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 5e-3, 2e-3, 5e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 0.035, 0.03, 4e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 0.019, 8e-3, 0.026, 6e-3, 3e-3, 8e-3, 5e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bm": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.129, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.167, 7e-3, 0.144, 1e-4, 1e-3, 0.013, 2e-3, 0.256, 0.237, 0.237, 7e-3, 3e-3, 0.973, 0.158, 0.97, 7e-3, 0.243, 0.224, 0.128, 0.052, 0.064, 0.06, 0.072, 0.055, 0.07, 0.12, 0.287, 0.015, 1e-4, 0.01, 1e-4, 5e-3, 1e-4, 0.444, 0.348, 0.111, 0.212, 0.105, 0.277, 0.105, 0.044, 0.094, 0.171, 0.429, 0.132, 0.368, 0.21, 0.091, 0.065, 3e-3, 0.072, 0.446, 0.184, 0.079, 0.027, 0.078, 4e-3, 0.046, 0.018, 0.018, 1e-4, 0.014, 1e-4, 0.017, 1e-4, 12.037, 2.27, 0.406, 1.816, 3.589, 1.305, 1.615, 0.299, 5.301, 0.672, 3.384, 3.18, 2.268, 7.22, 3.282, 0.194, 0.029, 2.428, 2.045, 1.645, 2.796, 0.059, 0.96, 0.016, 1.69, 0.107, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.237, 3e-3, 1e-3, 0.017, 0.017, 7e-3, 0.015, 3e-3, 8e-3, 0.011, 0.026, 0.017, 1e-3, 1e-4, 0.018, 5e-3, 0.013, 2e-3, 4e-3, 0.018, 1.999, 1e-4, 1e-4, 1e-4, 2e-3, 0.172, 1e-4, 1.879, 0.012, 0.017, 4e-3, 1e-4, 0.054, 2e-3, 1e-3, 1e-3, 2e-3, 3e-3, 5e-3, 0.027, 0.322, 0.21, 5e-3, 0.017, 7e-3, 2e-3, 1e-3, 0.011, 2e-3, 0.012, 0.238, 0.014, 0.415, 0.435, 1e-3, 7e-3, 5e-3, 9e-3, 0.01, 0.017, 3e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 0.064, 1.039, 2e-3, 0.033, 0.027, 1e-4, 1e-4, 4.089, 0.016, 2e-3, 3e-3, 1e-4, 0.433, 1e-4, 0.024, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.065, 0.05, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.015, 1e-4, 3e-3, 0.233, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.319, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.406, 1e-3, 0.076, 1e-4, 1e-4, 0.012, 1e-4, 0.015, 0.057, 0.058, 1e-4, 1e-3, 0.196, 0.086, 0.029, 5e-3, 5e-3, 6e-3, 4e-3, 2e-3, 2e-3, 2e-3, 2e-3, 1e-3, 2e-3, 2e-3, 0.016, 9e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 5e-3, 3e-3, 4e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 3e-3, 2e-3, 1e-3, 2e-3, 3e-3, 2e-3, 2e-3, 3e-3, 1e-4, 2e-3, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 4e-3, 1e-3, 1e-3, 1e-4, 0.043, 7e-3, 0.016, 0.016, 0.05, 9e-3, 9e-3, 0.017, 0.038, 1e-3, 4e-3, 0.022, 0.013, 0.034, 0.034, 0.01, 1e-3, 0.031, 0.027, 0.033, 0.016, 5e-3, 5e-3, 2e-3, 8e-3, 1e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 0.359, 0.551, 0.299, 0.082, 2e-3, 0.229, 0.186, 2.436, 0.034, 0.152, 2e-3, 0.333, 0.036, 2.245, 0.026, 0.384, 8e-3, 1e-3, 1e-3, 0.181, 2e-3, 1.31, 0.16, 0.34, 0.043, 0.053, 0.26, 0.209, 0.4, 0.015, 0.042, 0.46, 0.067, 0.212, 8e-3, 0.16, 1.542, 0.621, 24.834, 6.808, 1.602, 0.04, 0.792, 0.149, 1.148, 0.261, 0.867, 1.261, 2.631, 1e-3, 0.874, 1e-3, 1e-3, 1e-3, 0.381, 0.232, 0.963, 0.451, 1e-3, 1e-3, 0.701, 1e-4, 2.837, 1.811, 1e-4, 1e-4, 0.013, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 0.017, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.991, 1e-4, 0.03, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.169, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.69, 1e-4, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.01, 0.01, 1e-4, 1e-4, 2e-3, 3e-3, 5e-3, 1e-3, 3e-3, 4e-3, 3e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 0.012, 2e-3, 4e-3, 4e-3, 0.015, 3e-3, 3e-3, 6e-3, 0.011, 1e-4, 1e-3, 5e-3, 3e-3, 0.01, 0.01, 3e-3, 1e-4, 8e-3, 8e-3, 0.01, 4e-3, 1e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.3, 0.21, 1.61, 4e-3, 1.096, 0.171, 0.232, 0.056, 6e-3, 0.125, 9e-3, 7.85, 0.044, 0.821, 0.01, 0.147, 0.305, 1.571, 0.233, 1.086, 0.826, 0.17, 1.379, 0.052, 0.974, 0.101, 0.175, 0.065, 5e-3, 8e-3, 0.253, 0.318, 0.893, 0.39, 1.207, 0.915, 0.217, 0.014, 2.41, 0.028, 0.071, 0.06, 2e-3, 0.023, 1e-3, 0.018, 1e-3, 1e-3, 3e-3, 0.913, 2.028, 0.112, 1.086, 5e-3, 1e-3, 0.055, 5e-3, 3e-3, 0.951, 5e-3, 10.217, 21.49, 2.602, 0.016, 1e-4, 1e-4, 0.014, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 32.905, 1e-4, 0.024, 9e-3, 2e-3, 6e-3, 4e-3, 5e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bpy": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.902, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.282, 1e-4, 9e-3, 1e-4, 1e-4, 0.224, 1e-4, 2e-3, 0.281, 0.281, 1e-4, 1e-4, 0.306, 0.253, 0.183, 0.08, 5e-3, 9e-3, 2e-3, 4e-3, 2e-3, 3e-3, 3e-3, 3e-3, 3e-3, 3e-3, 0.197, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.016, 8e-3, 0.017, 5e-3, 5e-3, 2e-3, 4e-3, 2e-3, 3e-3, 3e-3, 5e-3, 3e-3, 7e-3, 7e-3, 1e-3, 7e-3, 1e-4, 4e-3, 0.019, 4e-3, 0.016, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.014, 1e-4, 0.118, 0.01, 0.016, 0.026, 0.05, 6e-3, 0.015, 0.031, 0.057, 4e-3, 9e-3, 0.031, 0.017, 0.064, 0.06, 0.015, 1e-3, 0.059, 0.03, 0.047, 0.04, 5e-3, 5e-3, 1e-3, 0.018, 2e-3, 1e-4, 0.016, 1e-4, 1e-4, 1e-4, 0.094, 0.582, 0.295, 4e-3, 1e-3, 0.199, 0.278, 1.651, 6e-3, 0.325, 1e-3, 0.49, 0.119, 1.057, 3e-3, 0.285, 1e-4, 1e-4, 1e-4, 0.034, 0.032, 0.592, 0.143, 0.798, 0.084, 0.129, 0.075, 0.036, 0.484, 4e-3, 0.03, 0.329, 0.051, 0.128, 7e-3, 0.019, 1.405, 0.659, 24.309, 6.387, 2.166, 0.231, 0.814, 0.355, 0.961, 0.379, 1.131, 0.99, 2.941, 0.034, 0.919, 4e-3, 1e-3, 1e-3, 0.243, 0.193, 0.791, 1.05, 1e-4, 1e-4, 0.626, 1e-4, 4.392, 1.335, 1e-4, 1e-4, 0.04, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.31, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "br": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.678, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.255, 4e-3, 0.515, 1e-4, 1e-4, 7e-3, 2e-3, 0.663, 0.246, 0.246, 1e-3, 2e-3, 0.881, 0.746, 0.901, 0.014, 0.258, 0.444, 0.187, 0.109, 0.115, 0.122, 0.109, 0.12, 0.152, 0.228, 0.115, 0.024, 0.015, 4e-3, 0.016, 3e-3, 1e-4, 0.347, 0.279, 0.201, 0.205, 0.261, 0.098, 0.212, 0.134, 0.164, 0.075, 0.201, 0.168, 0.253, 0.109, 0.059, 0.199, 6e-3, 0.146, 0.289, 0.136, 0.097, 0.091, 0.051, 0.019, 0.032, 0.015, 0.024, 1e-4, 0.024, 1e-4, 1e-3, 1e-4, 9.146, 1.127, 0.833, 2.777, 10.42, 0.294, 1.799, 2.456, 3.655, 0.167, 1.352, 2.97, 1.505, 5.492, 4.696, 0.867, 0.019, 5.665, 2.33, 3.448, 2.744, 1.784, 0.434, 0.03, 0.247, 2.302, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 0.1, 0.012, 8e-3, 7e-3, 5e-3, 4e-3, 3e-3, 3e-3, 4e-3, 5e-3, 2e-3, 2e-3, 4e-3, 5e-3, 3e-3, 2e-3, 3e-3, 2e-3, 2e-3, 0.011, 5e-3, 2e-3, 2e-3, 2e-3, 2e-3, 0.074, 2e-3, 3e-3, 5e-3, 5e-3, 1e-3, 4e-3, 0.021, 0.015, 9e-3, 5e-3, 7e-3, 3e-3, 4e-3, 9e-3, 0.013, 0.045, 0.076, 0.018, 3e-3, 0.013, 3e-3, 5e-3, 0.011, 0.591, 9e-3, 0.012, 0.018, 7e-3, 6e-3, 4e-3, 9e-3, 0.467, 8e-3, 0.021, 0.017, 8e-3, 5e-3, 6e-3, 1e-4, 1e-4, 0.048, 1.28, 0.01, 0.011, 1e-4, 1e-3, 1e-4, 4e-3, 2e-3, 2e-3, 2e-3, 1e-4, 0.032, 0.015, 0.039, 0.015, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 6e-3, 9e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 9e-3, 0.096, 3e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bs": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.108, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.139, 2e-3, 0.313, 1e-3, 1e-3, 0.017, 2e-3, 0.011, 0.204, 0.204, 1e-3, 6e-3, 0.915, 0.157, 1.176, 0.034, 0.332, 0.467, 0.264, 0.159, 0.151, 0.151, 0.132, 0.126, 0.142, 0.226, 0.068, 0.015, 6e-3, 7e-3, 6e-3, 1e-3, 1e-4, 0.156, 0.174, 0.174, 0.143, 0.072, 0.074, 0.155, 0.136, 0.152, 0.073, 0.147, 0.082, 0.163, 0.218, 0.118, 0.225, 3e-3, 0.11, 0.283, 0.122, 0.105, 0.088, 0.031, 7e-3, 7e-3, 0.073, 0.025, 1e-4, 0.025, 1e-4, 8e-3, 1e-4, 8.723, 0.95, 0.762, 2.331, 6.777, 0.26, 1.369, 0.582, 7.412, 3.867, 2.673, 2.682, 2.205, 4.994, 6.632, 1.941, 5e-3, 3.955, 3.612, 3.234, 3.103, 2.415, 0.036, 0.017, 0.061, 1.207, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 0.038, 4e-3, 3e-3, 2e-3, 2e-3, 1e-3, 3e-3, 0.388, 2e-3, 1e-3, 1e-3, 1e-3, 0.016, 0.618, 1e-3, 1e-4, 3e-3, 0.172, 2e-3, 0.018, 1e-3, 1e-4, 1e-3, 1e-3, 2e-3, 3e-3, 1e-3, 1e-3, 6e-3, 3e-3, 4e-3, 2e-3, 0.035, 0.482, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-3, 8e-3, 1e-3, 2e-3, 1e-3, 3e-3, 1e-3, 1e-3, 7e-3, 4e-3, 3e-3, 4e-3, 2e-3, 3e-3, 4e-3, 2e-3, 4e-3, 2e-3, 2e-3, 3e-3, 6e-3, 0.012, 0.366, 2e-3, 1e-4, 1e-4, 0.02, 0.032, 1.199, 0.874, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 0.014, 6e-3, 0.021, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.037, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bug": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.068, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.164, 1e-4, 0.016, 1e-4, 1e-4, 3e-3, 1e-3, 0.137, 0.016, 0.016, 1e-4, 1e-3, 0.196, 1.935, 1.044, 4e-3, 0.035, 0.02, 0.023, 0.01, 9e-3, 7e-3, 7e-3, 6e-3, 7e-3, 0.013, 7e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.516, 0.311, 0.434, 0.185, 0.139, 0.134, 0.304, 0.324, 0.039, 0.055, 0.029, 0.369, 0.412, 0.063, 0.111, 1.316, 0.017, 0.157, 0.558, 0.13, 0.016, 0.233, 0.012, 2e-3, 0.073, 2e-3, 7e-3, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 9.887, 0.241, 1.633, 1.832, 7.179, 0.088, 0.757, 0.513, 7.161, 0.111, 1.126, 1.683, 2.724, 6.291, 2.861, 1.308, 0.04, 7.537, 3.873, 3.7, 4.723, 0.375, 1.036, 0.149, 1.531, 0.172, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.047, 9e-3, 5e-3, 4e-3, 9e-3, 7e-3, 6e-3, 4e-3, 9e-3, 0.039, 0.01, 0.038, 3e-3, 5e-3, 2e-3, 1e-3, 4e-3, 0.012, 7e-3, 0.011, 0.011, 0.02, 1e-3, 0.02, 0.012, 0.019, 0.011, 0.012, 2e-3, 1e-3, 6e-3, 3e-3, 4e-3, 3e-3, 0.047, 2e-3, 0.016, 5e-3, 4e-3, 0.01, 0.405, 2.36, 0.01, 0.013, 3e-3, 1e-3, 8e-3, 4e-3, 8e-3, 4e-3, 8e-3, 5e-3, 0.176, 5e-3, 2e-3, 3e-3, 0.012, 5e-3, 8e-3, 7e-3, 3e-3, 3e-3, 4e-3, 3e-3, 1e-4, 1e-4, 7e-3, 2.887, 2e-3, 0.04, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 3e-3, 0.023, 0.014, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 8e-3, 7e-3, 1e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.048, 0.15, 0.04, 1e-4, 1e-4, 2e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "bxr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.49, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.129, 1e-3, 0.08, 1e-4, 1e-4, 0.012, 1e-4, 1e-3, 0.147, 0.147, 1e-4, 2e-3, 0.553, 0.131, 0.523, 4e-3, 0.151, 0.243, 0.109, 0.074, 0.068, 0.074, 0.065, 0.062, 0.079, 0.12, 0.022, 0.018, 3e-3, 1e-3, 2e-3, 1e-3, 1e-4, 4e-3, 2e-3, 7e-3, 1e-3, 2e-3, 2e-3, 2e-3, 4e-3, 0.037, 1e-3, 1e-3, 2e-3, 3e-3, 3e-3, 3e-3, 3e-3, 1e-4, 2e-3, 4e-3, 3e-3, 1e-3, 0.011, 1e-3, 0.019, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 0.037, 5e-3, 0.011, 9e-3, 0.029, 5e-3, 7e-3, 0.031, 0.027, 1e-3, 5e-3, 0.019, 0.012, 0.022, 0.025, 8e-3, 1e-3, 0.023, 0.018, 0.017, 0.016, 3e-3, 2e-3, 1e-3, 5e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.392, 0.859, 1.489, 1.628, 0.046, 1.574, 0.057, 0.037, 0.549, 2e-3, 3e-3, 0.546, 0.265, 4.264, 0.148, 0.174, 0.118, 0.207, 0.029, 0.069, 0.123, 0.028, 0.013, 0.033, 0.034, 5e-3, 0.055, 0.03, 0.09, 0.073, 0.049, 0.037, 0.094, 0.079, 0.088, 0.076, 0.026, 0.12, 0.011, 0.016, 0.032, 0.306, 1e-3, 0.058, 1e-3, 0.071, 0.033, 1.461, 5.842, 1.346, 0.152, 2.003, 2.072, 0.704, 0.52, 0.475, 1.576, 1.562, 0.254, 3.078, 0.893, 3.534, 3.045, 0.105, 1e-4, 1e-4, 0.188, 5e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 6e-3, 2e-3, 27.741, 14.028, 2.178, 0.307, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 3e-3, 0.075, 2e-3, 1e-3, 4e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "cdo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.899, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.597, 1e-3, 0.273, 1e-4, 1e-4, 4e-3, 1e-4, 4e-3, 0.549, 0.551, 1e-4, 1e-3, 0.624, 3.929, 0.732, 0.03, 0.251, 0.611, 0.29, 0.189, 0.163, 0.163, 0.16, 0.156, 0.166, 0.215, 0.133, 0.012, 1e-3, 1e-4, 1e-3, 2e-3, 1e-4, 0.053, 0.117, 0.299, 0.251, 0.017, 0.027, 0.504, 0.23, 0.082, 0.03, 0.071, 0.135, 0.356, 0.159, 0.039, 0.068, 4e-3, 0.027, 0.229, 0.101, 0.044, 0.025, 0.062, 1e-3, 0.013, 3e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.822, 0.392, 1.504, 1.05, 0.748, 0.033, 6.691, 1.959, 3.832, 6e-3, 1.877, 0.724, 0.396, 5.597, 0.623, 0.123, 5e-3, 0.411, 2.143, 0.557, 2.118, 0.037, 0.065, 0.039, 0.184, 0.014, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.562, 0.653, 0.229, 0.604, 0.418, 0.298, 0.318, 0.129, 0.175, 0.171, 0.118, 0.212, 0.31, 0.409, 0.113, 0.98, 0.125, 0.066, 0.036, 0.255, 0.106, 0.397, 0.142, 0.124, 0.138, 0.172, 0.096, 0.139, 0.338, 0.116, 0.144, 0.186, 0.41, 1.078, 0.77, 0.114, 1.515, 0.081, 0.097, 0.077, 0.628, 0.714, 1.044, 0.603, 1.183, 1.024, 0.119, 0.129, 0.135, 0.183, 0.537, 1.615, 1.19, 0.067, 0.211, 0.1, 0.216, 1.217, 0.179, 0.199, 0.306, 0.119, 0.135, 0.091, 1e-4, 1e-4, 0.041, 7.531, 2.472, 1.618, 1e-3, 1e-3, 1e-4, 2e-3, 2e-3, 1e-3, 2.018, 1e-4, 0.014, 6e-3, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 0.757, 0.108, 0.212, 0.359, 1.361, 0.793, 0.503, 0.549, 0.397, 2e-3, 3e-3, 4e-3, 1e-3, 1e-4, 0.218, 0.03, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ce": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.477, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.593, 1e-4, 3e-3, 1e-4, 1e-4, 0.014, 1e-4, 1e-4, 0.462, 0.462, 1e-4, 0.166, 0.461, 0.186, 0.813, 2e-3, 0.175, 0.094, 0.109, 0.14, 0.045, 0.029, 0.022, 0.02, 0.031, 0.028, 0.033, 1e-3, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.145, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 4e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 0.145, 0.144, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.704, 1.438, 1.762, 1.875, 0.015, 2.329, 0.449, 0.169, 0.835, 9e-3, 0.342, 0.05, 1.751, 0.164, 0.611, 0.21, 0.068, 0.113, 0.056, 0.04, 0.434, 0.02, 6e-3, 0.019, 0.028, 2e-3, 0.404, 0.034, 0.196, 0.056, 0.049, 0.075, 0.184, 0.229, 0.057, 0.026, 0.146, 0.02, 0.017, 0.02, 0.129, 2e-3, 1e-4, 4e-3, 1e-4, 8e-3, 9e-3, 0.018, 7.603, 0.877, 1.017, 0.93, 0.629, 1.84, 0.05, 0.386, 1.788, 1.009, 1.778, 2.253, 0.873, 3.199, 2.291, 0.075, 1e-4, 1e-4, 0.018, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 28.632, 13.675, 1e-4, 0.638, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.405, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ceb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.228, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.341, 1e-4, 0.15, 1e-4, 1e-4, 2e-3, 1e-4, 0.016, 0.068, 0.068, 1e-4, 1e-4, 1.15, 0.441, 1.259, 1e-3, 0.028, 0.059, 0.035, 0.022, 0.021, 0.022, 0.021, 0.021, 0.026, 0.036, 0.037, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.098, 0.168, 0.578, 0.161, 0.203, 0.063, 0.093, 0.198, 0.052, 0.044, 0.126, 0.151, 0.236, 0.118, 0.082, 0.261, 0.02, 0.131, 0.295, 0.118, 0.081, 0.041, 0.087, 5e-3, 0.015, 0.017, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 15.378, 2.318, 0.367, 1.953, 2.974, 0.093, 5.126, 1.479, 4.851, 0.069, 2.449, 3.4, 2.839, 8.407, 4.701, 1.442, 0.019, 2.43, 4.783, 3.214, 2.941, 0.169, 0.623, 0.03, 1.539, 0.068, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 0.059, 4e-3, 5e-3, 4e-3, 4e-3, 3e-3, 8e-3, 5e-3, 3e-3, 2e-3, 1e-3, 4e-3, 9e-3, 2e-3, 4e-3, 2e-3, 3e-3, 1e-4, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.01, 5e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 6e-3, 0.184, 0.019, 7e-3, 5e-3, 8e-3, 0.019, 3e-3, 9e-3, 7e-3, 0.025, 4e-3, 0.049, 1e-3, 0.018, 2e-3, 8e-3, 0.279, 0.015, 4e-3, 0.013, 4e-3, 3e-3, 7e-3, 1e-3, 0.046, 6e-3, 7e-3, 5e-3, 6e-3, 4e-3, 6e-3, 1e-3, 1e-4, 1e-4, 0.452, 0.166, 0.097, 0.047, 1e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.031, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.019, 0.018, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.017, 0.012, 8e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ch": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.587, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.467, 8e-3, 0.286, 1e-4, 1e-4, 0.018, 1e-4, 1.077, 0.189, 0.189, 1e-4, 1e-4, 1.14, 0.532, 1.257, 7e-3, 0.648, 0.639, 0.504, 0.182, 0.3, 0.173, 0.195, 0.169, 0.204, 0.218, 0.042, 0.013, 1e-4, 1e-3, 1e-4, 5e-3, 1e-4, 0.26, 0.146, 0.257, 0.104, 0.401, 0.111, 0.564, 0.173, 0.223, 0.038, 0.106, 0.097, 0.317, 0.12, 0.025, 0.199, 0.01, 0.074, 0.256, 0.153, 0.279, 0.066, 0.06, 2e-3, 0.047, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 10.968, 0.472, 0.524, 1.575, 4.239, 0.44, 3.776, 1.808, 6.943, 0.028, 1.21, 2.019, 1.749, 8.291, 5.798, 1.592, 0.018, 1.795, 5.81, 3.872, 3.565, 0.141, 0.106, 0.012, 0.845, 0.055, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.016, 8e-3, 3e-3, 1e-3, 2e-3, 0.01, 1e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 1e-4, 1e-4, 6e-3, 1e-3, 1e-4, 5e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1e-4, 0.011, 1e-4, 3e-3, 1e-3, 1e-4, 2e-3, 1e-3, 1e-4, 0.02, 2e-3, 3e-3, 1e-3, 0.974, 1e-4, 4e-3, 3e-3, 0.012, 1e-4, 1e-4, 1e-3, 9e-3, 1e-4, 1e-4, 2e-3, 0.432, 1e-4, 0.044, 1e-4, 1e-3, 3e-3, 1e-3, 2e-3, 2e-3, 6e-3, 7e-3, 2e-3, 2e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1.51, 4e-3, 0.013, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 2e-3, 1e-4, 1e-4, 5e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 2e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 0.012, 1e-4, 1e-4, 3e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-3, 2e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "cho": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.477, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.446, 0.089, 1.242, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.621, 0.621, 1e-4, 1e-4, 0.799, 1e-4, 0.532, 1e-4, 1e-4, 0.177, 0.089, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.355, 0.266, 1e-4, 1e-4, 1e-4, 0.089, 1e-4, 0.444, 1e-4, 1.154, 1e-4, 1e-4, 1e-4, 0.089, 0.799, 0.177, 1e-4, 0.177, 1e-4, 0.355, 0.177, 0.177, 0.444, 1e-4, 1e-4, 0.355, 1e-4, 1e-4, 0.089, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.955, 1.154, 0.799, 1e-4, 2.839, 0.177, 0.621, 7.365, 8.252, 1e-4, 5.146, 2.662, 3.549, 3.727, 5.413, 1.597, 1e-4, 0.799, 3.638, 5.146, 1.597, 1.065, 0.089, 1e-4, 1.331, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.154, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.266, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.177, 1e-4, 1e-4, 1e-4, 1.154, 1e-4, 0.089, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "chr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.394, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.115, 2e-3, 0.174, 1e-4, 1e-3, 5e-3, 1e-3, 0.018, 0.095, 0.095, 1e-4, 1e-3, 0.499, 0.081, 0.439, 9e-3, 0.086, 0.076, 0.045, 0.025, 0.02, 0.027, 0.02, 0.018, 0.025, 0.029, 0.03, 0.019, 2e-3, 1e-3, 3e-3, 2e-3, 1e-4, 0.037, 0.02, 0.038, 0.014, 0.023, 0.017, 0.012, 0.014, 0.019, 0.011, 0.01, 0.013, 0.028, 0.014, 0.01, 0.02, 2e-3, 0.016, 0.034, 0.027, 0.013, 8e-3, 0.015, 2e-3, 5e-3, 3e-3, 0.065, 1e-4, 0.065, 1e-4, 4e-3, 1e-4, 0.692, 0.092, 0.264, 0.31, 0.823, 0.092, 0.184, 0.209, 0.663, 0.01, 0.064, 0.374, 0.188, 0.502, 0.498, 0.163, 0.016, 0.479, 0.482, 0.523, 0.235, 0.107, 0.076, 0.023, 0.123, 0.021, 1e-4, 0.028, 1e-4, 1e-4, 1e-4, 0.027, 0.355, 0.722, 0.213, 0.313, 0.628, 0.115, 0.06, 0.021, 0.056, 0.084, 0.04, 0.154, 1.876, 13.554, 13.952, 0.082, 0.032, 0.441, 0.837, 0.268, 0.161, 0.041, 1.986, 0.138, 0.561, 0.191, 0.664, 0.014, 0.045, 5e-3, 0.13, 2.057, 0.126, 1.445, 0.138, 1.031, 0.39, 0.904, 0.381, 0.457, 1.048, 0.569, 0.458, 0.748, 0.433, 0.062, 1.427, 0.213, 0.207, 0.29, 0.574, 0.831, 0.687, 0.218, 0.077, 0.387, 0.051, 0.016, 0.01, 4e-3, 4e-3, 1.405, 0.134, 1e-4, 1e-4, 9e-3, 6e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 3e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 27.238, 0.017, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "chy": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.992, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.662, 2e-3, 0.655, 1e-4, 1e-4, 1e-4, 1e-4, 4.281, 0.488, 0.49, 0.012, 0.039, 1.209, 0.935, 1.193, 9e-3, 0.099, 0.186, 0.07, 0.039, 0.048, 0.046, 0.051, 0.032, 0.087, 0.113, 0.294, 0.06, 0.044, 0.012, 0.043, 9e-3, 1e-4, 0.28, 0.143, 0.271, 0.068, 0.058, 0.046, 0.056, 0.705, 0.041, 0.084, 0.094, 0.075, 0.71, 0.203, 0.133, 0.21, 0.01, 0.123, 0.333, 0.369, 0.109, 0.326, 0.043, 0.02, 0.015, 0.015, 0.017, 1e-4, 0.017, 1e-4, 1e-4, 5e-3, 5.694, 0.454, 0.435, 0.594, 8.431, 0.195, 0.654, 4.544, 1.753, 0.053, 1.313, 1.118, 1.931, 4.523, 6.14, 0.553, 0.043, 1.203, 5.097, 4.735, 0.637, 1.842, 0.224, 0.461, 0.27, 0.08, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.024, 0.014, 9e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 2e-3, 0.113, 1e-4, 2e-3, 7e-3, 5e-3, 1e-4, 1e-4, 5e-3, 2e-3, 1e-4, 0.058, 0.012, 1e-4, 3e-3, 0.029, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 2e-3, 2e-3, 0.044, 1.384, 0.696, 9e-3, 0.027, 2e-3, 2e-3, 0.039, 5e-3, 3.484, 0.98, 0.162, 3e-3, 9e-3, 2e-3, 0.017, 9e-3, 3e-3, 5e-3, 1.282, 0.993, 3e-3, 0.142, 1e-4, 0.017, 1e-4, 2e-3, 9e-3, 7e-3, 1e-4, 7e-3, 5e-3, 1e-4, 1e-4, 0.014, 8.846, 0.043, 0.545, 1e-4, 5e-3, 0.046, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.031, 9e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.019, 3e-3, 0.017, 1e-4, 1e-4, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ckb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.676, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.035, 2e-3, 0.062, 1e-4, 1e-4, 3e-3, 1e-4, 2e-3, 0.131, 0.13, 1e-3, 1e-3, 0.011, 0.034, 0.374, 0.013, 0.01, 0.014, 8e-3, 5e-3, 4e-3, 4e-3, 4e-3, 4e-3, 5e-3, 7e-3, 0.05, 1e-4, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 9e-3, 6e-3, 7e-3, 6e-3, 4e-3, 4e-3, 4e-3, 4e-3, 5e-3, 2e-3, 3e-3, 4e-3, 7e-3, 5e-3, 3e-3, 7e-3, 1e-3, 5e-3, 0.01, 7e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-4, 4e-3, 1e-4, 3e-3, 1e-4, 0.058, 8e-3, 0.018, 0.017, 0.063, 9e-3, 0.012, 0.017, 0.048, 1e-3, 8e-3, 0.031, 0.019, 0.043, 0.045, 0.012, 1e-3, 0.045, 0.029, 0.036, 0.019, 6e-3, 8e-3, 3e-3, 0.011, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.386, 0.193, 0.124, 0.067, 1.187, 1.207, 3.947, 0.41, 3.556, 0.028, 0.015, 2e-3, 5.576, 3e-3, 1.191, 5e-3, 6e-3, 5e-3, 2e-3, 4e-3, 1e-3, 6.665, 1e-3, 2e-3, 0.236, 1e-3, 2e-3, 8e-3, 2e-3, 2e-3, 1e-3, 6e-3, 0.161, 0.192, 0.114, 0.062, 0.112, 0.064, 0.707, 4.366, 1.564, 2.13, 1.551, 0.015, 0.253, 0.092, 0.303, 2.261, 8e-3, 2.411, 0.524, 1.151, 0.651, 0.531, 1e-3, 4e-3, 3e-3, 0.092, 0.048, 0.036, 3e-3, 3e-3, 0.823, 3e-3, 1e-4, 1e-4, 0.028, 7e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 15.514, 10.978, 4.45, 13.188, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.375, 2e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 0.063, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "co": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.449, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.862, 8e-3, 0.387, 1e-4, 1e-4, 6e-3, 1e-3, 0.763, 0.212, 0.212, 3e-3, 1e-3, 0.925, 0.075, 0.859, 0.019, 0.189, 0.28, 0.146, 0.097, 0.087, 0.101, 0.081, 0.085, 0.107, 0.132, 0.097, 0.026, 9e-3, 3e-3, 0.01, 4e-3, 1e-4, 0.325, 0.102, 0.335, 0.094, 0.091, 0.089, 0.126, 0.077, 0.208, 0.025, 0.02, 0.156, 0.189, 0.082, 0.052, 0.201, 0.016, 0.093, 0.268, 0.121, 0.17, 0.078, 0.019, 0.022, 5e-3, 0.013, 0.032, 1e-4, 0.032, 1e-4, 0.016, 1e-4, 8.602, 0.557, 3.322, 3.101, 4.329, 0.784, 1.174, 1.381, 10.092, 0.419, 0.069, 2.83, 1.864, 5.457, 2.618, 1.888, 0.179, 4.342, 3.458, 4.676, 6.626, 0.877, 0.033, 0.017, 0.063, 0.595, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.058, 6e-3, 4e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 1e-3, 1e-4, 2e-3, 2e-3, 1e-3, 1e-4, 2e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 0.039, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 0.789, 5e-3, 2e-3, 2e-3, 4e-3, 1e-3, 2e-3, 4e-3, 0.94, 0.016, 1e-3, 7e-3, 0.251, 4e-3, 1e-3, 2e-3, 5e-3, 6e-3, 0.189, 0.011, 5e-3, 3e-3, 2e-3, 0.024, 3e-3, 0.252, 4e-3, 7e-3, 6e-3, 5e-3, 2e-3, 4e-3, 1e-4, 1e-4, 0.05, 2.469, 6e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.032, 0.015, 8e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 4e-3, 0.04, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "cr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.443, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.088, 4e-3, 0.073, 1e-4, 1e-4, 0.02, 1e-4, 0.023, 0.121, 0.12, 1e-4, 2e-3, 0.629, 0.081, 0.971, 0.012, 0.119, 0.193, 0.101, 0.064, 0.076, 0.066, 0.061, 0.066, 0.062, 0.105, 0.063, 0.027, 1e-4, 1e-4, 1e-4, 0.015, 1e-4, 0.161, 0.04, 0.143, 0.045, 0.195, 0.034, 0.029, 0.053, 0.081, 0.084, 0.151, 0.056, 0.235, 0.167, 0.103, 0.138, 9e-3, 0.033, 0.115, 0.119, 0.03, 0.034, 0.067, 0.012, 0.01, 4e-3, 0.05, 1e-4, 0.047, 1e-4, 0.014, 1e-4, 9.914, 0.233, 4.69, 1.145, 5.906, 0.235, 0.326, 1.052, 10.924, 0.134, 6.149, 1.256, 2.551, 4.689, 5.033, 1.928, 0.073, 2.706, 3.099, 5.744, 0.924, 0.192, 2.967, 0.038, 0.312, 0.067, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.088, 0.031, 0.077, 0.099, 0.046, 0.115, 7e-3, 0.048, 0.054, 0.011, 0.091, 0.103, 0.074, 0.037, 0.073, 5e-3, 0.766, 0.405, 0.312, 0.295, 0.175, 0.052, 0.036, 9e-3, 0.01, 0.038, 1e-3, 5e-3, 2e-3, 1e-4, 1e-3, 0.021, 0.037, 0.111, 0.205, 0.026, 0.084, 0.087, 0.065, 0.093, 0.076, 0.063, 0.057, 0.032, 2e-3, 0.144, 0.111, 0.096, 0.017, 0.078, 0.065, 0.232, 0.037, 5e-3, 1e-4, 1e-4, 0.021, 5e-3, 0.022, 0.02, 0.014, 2e-3, 5e-3, 5e-3, 1e-4, 1e-4, 0.046, 0.821, 0.023, 0.077, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1.861, 0.08, 5e-3, 2e-3, 9e-3, 5e-3, 1e-4, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "crh": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.666, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.545, 3e-3, 0.2, 1e-4, 3e-3, 6e-3, 1e-4, 0.011, 0.498, 0.498, 1e-3, 3e-3, 0.581, 0.375, 1.265, 0.029, 0.54, 0.844, 0.447, 0.25, 0.254, 0.244, 0.225, 0.224, 0.237, 0.353, 0.036, 0.017, 0.017, 2e-3, 0.017, 3e-3, 1e-4, 0.292, 0.227, 0.115, 0.122, 0.258, 0.045, 0.081, 0.079, 0.299, 0.014, 0.172, 0.079, 0.19, 0.068, 0.102, 0.074, 0.317, 0.092, 0.196, 0.162, 0.157, 0.161, 3e-3, 0.13, 0.089, 0.035, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 7.42, 1.383, 0.39, 2.173, 6.493, 0.253, 0.439, 0.324, 6.527, 0.039, 1.974, 3.301, 1.629, 5.164, 1.476, 0.486, 0.955, 4.625, 3.637, 2.416, 1.149, 1.071, 0.013, 4e-3, 1.959, 0.598, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.415, 0.022, 0.015, 0.022, 8e-3, 7e-3, 5e-3, 0.065, 8e-3, 5e-3, 4e-3, 8e-3, 7e-3, 7e-3, 3e-3, 8e-3, 5e-3, 4e-3, 4e-3, 0.069, 0.234, 4e-3, 0.026, 4e-3, 6e-3, 8e-3, 8e-3, 5e-3, 0.067, 0.049, 0.094, 1.497, 0.026, 0.01, 0.278, 6e-3, 8e-3, 6e-3, 5e-3, 0.416, 4e-3, 6e-3, 5e-3, 0.014, 4e-3, 7e-3, 6e-3, 6e-3, 0.149, 5.025, 0.014, 0.011, 0.012, 0.067, 0.295, 6e-3, 0.022, 0.01, 0.019, 0.017, 0.605, 0.022, 0.039, 6e-3, 1e-4, 1e-4, 0.035, 2.796, 4.495, 1.1, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 3e-3, 2e-3, 0.256, 0.079, 4e-3, 2e-3, 1e-4, 4e-3, 8e-3, 0.013, 0.021, 0.017, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 0.015, 9e-3, 0.398, 7e-3, 4e-3, 0.019, 9e-3, 5e-3, 4e-3, 4e-3, 3e-3, 2e-3, 4e-3, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "csb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.825, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.296, 2e-3, 0.584, 1e-4, 1e-4, 3e-3, 1e-3, 9e-3, 0.331, 0.334, 2e-3, 1e-4, 0.877, 0.236, 1.256, 0.065, 0.271, 0.637, 0.291, 0.193, 0.181, 0.174, 0.153, 0.187, 0.256, 0.339, 0.093, 0.04, 0.024, 4e-3, 0.024, 3e-3, 1e-4, 0.093, 0.136, 0.203, 0.135, 0.053, 0.045, 0.141, 0.038, 0.163, 0.132, 0.28, 0.122, 0.184, 0.116, 0.024, 0.275, 2e-3, 0.1, 0.23, 0.118, 0.014, 0.056, 0.218, 0.119, 3e-3, 0.085, 6e-3, 1e-4, 7e-3, 1e-4, 2e-3, 1e-4, 4.612, 0.986, 3.096, 2.007, 3.546, 0.161, 1.136, 0.946, 4.255, 1.343, 2.142, 1.634, 1.571, 3.378, 2.668, 1.384, 4e-3, 3.469, 3.152, 2.405, 0.834, 0.037, 2.89, 0.011, 0.614, 4.079, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.169, 0.025, 0.879, 3e-3, 0.332, 0.515, 0.031, 5e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 5e-3, 1e-3, 0.013, 0.102, 0.134, 5e-3, 2e-3, 1e-3, 1e-3, 3e-3, 0.049, 5e-3, 0.012, 6e-3, 0.026, 0.025, 3e-3, 0.016, 6e-3, 6e-3, 0.677, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1.17, 1e-3, 2.19, 1e-3, 3e-3, 1e-4, 2e-3, 9e-3, 3e-3, 2.322, 0.76, 1.31, 3e-3, 4e-3, 1e-3, 7e-3, 0.615, 5e-3, 0.077, 0.465, 7e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.14, 9.122, 0.543, 1.724, 1e-4, 1e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 6e-3, 2e-3, 0.024, 0.023, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 5e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 0.197, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "cu": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.095, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.137, 1e-4, 0.05, 1e-4, 1e-3, 1e-3, 1e-4, 2e-3, 0.026, 0.026, 1e-3, 1e-4, 0.049, 0.014, 0.024, 0.015, 0.131, 0.259, 0.12, 0.082, 0.083, 0.082, 0.076, 0.078, 0.096, 0.129, 9e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 3e-3, 1e-3, 6e-3, 1e-3, 1e-3, 1e-3, 1e-4, 6e-3, 4e-3, 1e-4, 1e-3, 1e-3, 2e-3, 2e-3, 4e-3, 1e-3, 1e-4, 2e-3, 4e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 3e-3, 1e-4, 0.023, 2e-3, 8e-3, 7e-3, 0.018, 1e-3, 5e-3, 4e-3, 0.017, 5e-3, 9e-3, 0.01, 3e-3, 0.016, 0.015, 3e-3, 1e-3, 0.01, 0.011, 9e-3, 0.011, 4e-3, 1e-4, 2e-3, 2e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.938, 4.019, 2.29, 0.582, 0.265, 0.184, 0.28, 0.33, 0.175, 0.126, 2.698, 2e-3, 1.962, 2e-3, 0.135, 1e-4, 0.124, 0.906, 0.12, 0.072, 1.561, 1e-4, 0.139, 0.857, 0.034, 2.179, 0.103, 0.119, 0.097, 0.099, 0.095, 0.124, 0.126, 0.438, 0.049, 1.297, 0.06, 0.96, 0.01, 0.295, 0.011, 0.359, 5e-3, 0.236, 2e-3, 0.101, 0.019, 0.025, 3.114, 0.623, 1.373, 0.62, 1.221, 0.086, 0.518, 0.573, 2.627, 2e-3, 1.325, 1.567, 0.924, 2.121, 2.823, 0.585, 1e-4, 1e-4, 0.514, 3e-3, 6e-3, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-3, 0.408, 1e-4, 0.016, 0.012, 21.25, 18.718, 0.249, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.51, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1.747, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "cv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.247, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.093, 1e-3, 0.059, 1e-4, 1e-4, 7e-3, 1e-4, 3e-3, 0.152, 0.151, 1e-4, 2e-3, 0.478, 0.273, 0.79, 0.011, 0.204, 0.309, 0.183, 0.104, 0.101, 0.1, 0.081, 0.081, 0.096, 0.17, 0.076, 8e-3, 2e-3, 2e-3, 2e-3, 3e-3, 1e-4, 4e-3, 3e-3, 5e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 0.019, 1e-3, 1e-3, 2e-3, 3e-3, 2e-3, 2e-3, 3e-3, 1e-4, 3e-3, 5e-3, 3e-3, 2e-3, 6e-3, 1e-3, 0.01, 1e-3, 1e-4, 0.013, 1e-4, 0.013, 1e-4, 1e-3, 1e-4, 0.027, 4e-3, 7e-3, 8e-3, 0.027, 4e-3, 6e-3, 7e-3, 0.02, 1e-3, 4e-3, 0.016, 9e-3, 0.019, 0.018, 6e-3, 1e-4, 0.019, 0.014, 0.015, 0.011, 3e-3, 2e-3, 2e-3, 4e-3, 1e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 3.257, 1.78, 2.381, 2.851, 0.156, 1.36, 0.178, 0.773, 1.001, 6e-3, 6e-3, 0.869, 0.319, 0.035, 0.373, 0.165, 0.161, 0.088, 0.098, 0.049, 0.312, 2.25, 7e-3, 0.017, 0.069, 7e-3, 0.174, 0.039, 0.101, 0.06, 0.095, 0.155, 0.212, 0.157, 0.129, 0.054, 0.061, 0.066, 5e-3, 1.16, 0.101, 2e-3, 1e-4, 0.045, 1e-3, 0.021, 0.156, 0.041, 4.16, 0.372, 1.295, 0.368, 0.304, 3.139, 0.041, 0.13, 2.185, 0.64, 1.311, 1.785, 0.994, 3.619, 1.18, 1.135, 1e-4, 1e-4, 0.101, 1.175, 3.79, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 1e-4, 2e-3, 1e-3, 24.733, 13.586, 4e-3, 0.088, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.282, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "cy": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.628, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.48, 3e-3, 0.545, 1e-4, 1e-3, 7e-3, 2e-3, 0.872, 0.259, 0.258, 1e-3, 1e-3, 0.777, 0.194, 0.96, 0.016, 0.363, 0.487, 0.244, 0.138, 0.133, 0.135, 0.125, 0.126, 0.164, 0.239, 0.149, 0.081, 0.022, 1e-3, 0.022, 3e-3, 1e-4, 0.36, 0.242, 0.56, 0.267, 0.155, 0.163, 0.331, 0.126, 0.112, 0.06, 0.033, 0.279, 0.433, 0.133, 0.073, 0.238, 4e-3, 0.18, 0.303, 0.196, 0.061, 0.026, 0.092, 3e-3, 0.167, 6e-3, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 7.082, 0.905, 1.506, 6.475, 6.263, 2.165, 2.494, 2.4, 4.773, 0.015, 0.114, 3.901, 1.419, 6.217, 4.277, 0.556, 8e-3, 5.57, 2.092, 2.13, 1.941, 0.086, 2.82, 0.025, 5.712, 0.034, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.074, 5e-3, 3e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.021, 2e-3, 1e-3, 1e-4, 1e-3, 2e-3, 0.033, 1e-3, 1e-3, 7e-3, 9e-3, 1e-3, 1e-3, 0.033, 7e-3, 0.059, 3e-3, 3e-3, 1e-3, 1e-3, 3e-3, 4e-3, 0.015, 0.016, 4e-3, 1e-3, 4e-3, 0.01, 0.012, 4e-3, 3e-3, 3e-3, 4e-3, 0.074, 0.043, 5e-3, 0.016, 3e-3, 6e-3, 3e-3, 2e-3, 4e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.036, 0.221, 3e-3, 0.06, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 7e-3, 4e-3, 0.014, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 0.072, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "din": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.698, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.927, 1e-4, 0.06, 1e-4, 3e-3, 0.013, 1e-4, 0.015, 0.171, 0.17, 1e-4, 1e-4, 0.878, 0.077, 0.901, 0.027, 0.297, 0.229, 0.151, 0.055, 0.064, 0.078, 0.053, 0.048, 0.049, 0.126, 0.018, 0.013, 2e-3, 1e-4, 2e-3, 5e-3, 1e-4, 0.424, 0.153, 0.093, 0.101, 0.075, 0.019, 0.074, 0.021, 0.051, 0.069, 0.324, 0.085, 0.16, 0.163, 0.021, 0.306, 2e-3, 0.087, 0.062, 0.288, 0.034, 7e-3, 0.069, 1e-4, 0.136, 3e-3, 0.027, 1e-4, 0.027, 1e-4, 1e-4, 1e-4, 5.438, 0.999, 2.9, 1.603, 4.394, 0.024, 0.521, 1.912, 3.749, 0.362, 4.818, 2.02, 1.512, 4.26, 1.668, 1.035, 3e-3, 2.29, 0.155, 3.595, 3.428, 0.022, 0.527, 0.011, 2.005, 0.013, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.036, 1e-3, 1e-3, 1e-4, 0.027, 1e-4, 0.026, 1e-4, 1.487, 1e-4, 5e-3, 1.04, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 2.319, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-4, 1.678, 6e-3, 6e-3, 1e-4, 1e-4, 0.01, 1e-4, 1e-4, 0.222, 1.181, 1e-4, 1e-4, 1e-3, 4e-3, 1e-3, 1e-4, 3.25, 1e-4, 1e-3, 6e-3, 1.508, 3e-3, 2e-3, 6e-3, 2e-3, 1e-4, 0.011, 1.021, 1e-3, 4e-3, 2e-3, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 0.016, 6.971, 1e-4, 1.041, 0.02, 1e-4, 1e-4, 4.193, 1e-4, 1e-4, 1.487, 1e-4, 0.027, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 0.062, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "diq": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.719, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.354, 8e-3, 0.4, 1e-4, 1e-4, 9e-3, 1e-4, 0.031, 0.299, 0.3, 1e-3, 3e-3, 0.98, 0.165, 1.27, 0.045, 0.227, 0.302, 0.162, 0.087, 0.08, 0.089, 0.076, 0.082, 0.096, 0.17, 0.156, 0.035, 0.026, 8e-3, 0.027, 0.01, 1e-4, 0.309, 0.187, 0.135, 0.206, 0.243, 0.108, 0.12, 0.188, 0.05, 0.033, 0.209, 0.106, 0.271, 0.167, 0.06, 0.167, 0.062, 0.13, 0.271, 0.259, 0.059, 0.085, 0.06, 0.052, 0.088, 0.128, 0.014, 1e-4, 0.014, 1e-4, 2e-3, 1e-3, 7.586, 1.293, 0.911, 2.514, 8.148, 0.439, 0.62, 0.759, 4.61, 0.11, 2.125, 1.599, 2.095, 4.93, 3.468, 0.588, 0.377, 4.808, 2.018, 2.359, 1.695, 0.626, 1.106, 0.479, 3.36, 1.081, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.078, 0.018, 0.011, 0.012, 0.02, 0.015, 0.019, 0.078, 0.016, 4e-3, 0.018, 2e-3, 0.014, 4e-3, 0.014, 3e-3, 6e-3, 5e-3, 3e-3, 0.011, 5e-3, 6e-3, 5e-3, 2e-3, 9e-3, 0.023, 2e-3, 4e-3, 0.022, 0.016, 0.065, 0.865, 0.032, 0.01, 0.013, 5e-3, 7e-3, 4e-3, 6e-3, 0.242, 0.014, 0.032, 2.716, 0.012, 7e-3, 8e-3, 0.29, 0.015, 0.191, 2.379, 0.013, 0.015, 0.01, 6e-3, 0.021, 4e-3, 9e-3, 0.01, 7e-3, 0.128, 0.093, 9e-3, 8e-3, 6e-3, 1e-4, 1e-4, 0.039, 3.563, 2.668, 0.816, 1e-4, 1e-3, 1e-4, 5e-3, 3e-3, 2e-3, 2e-3, 1e-4, 0.03, 0.013, 0.034, 0.014, 1e-3, 1e-4, 1e-3, 0.012, 5e-3, 0.037, 0.126, 0.091, 7e-3, 0.013, 3e-3, 1e-4, 1e-4, 1e-4, 0.019, 0.012, 0.072, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "dsb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.783, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.853, 3e-3, 0.608, 1e-4, 1e-4, 7e-3, 2e-3, 0.016, 0.311, 0.311, 0.022, 2e-3, 0.839, 0.138, 1.194, 0.023, 0.287, 0.411, 0.214, 0.128, 0.124, 0.131, 0.109, 0.104, 0.125, 0.201, 0.084, 0.035, 6e-3, 7e-3, 7e-3, 3e-3, 1e-4, 0.155, 0.168, 0.123, 0.122, 0.077, 0.058, 0.102, 0.068, 0.054, 0.115, 0.164, 0.108, 0.197, 0.144, 0.038, 0.256, 4e-3, 0.113, 0.246, 0.119, 0.042, 0.025, 0.244, 5e-3, 7e-3, 0.075, 8e-3, 1e-4, 8e-3, 1e-4, 2e-3, 1e-4, 6.833, 1.047, 1.719, 1.818, 5.619, 0.234, 0.977, 0.835, 3.647, 3.795, 2.962, 1.965, 2.079, 4.006, 5.923, 1.615, 8e-3, 3.224, 3.399, 2.803, 2.458, 0.071, 3.327, 0.021, 1.623, 1.195, 1e-4, 3e-3, 1e-4, 1e-3, 1e-4, 0.148, 0.049, 0.931, 0.01, 0.22, 6e-3, 5e-3, 0.266, 5e-3, 2e-3, 2e-3, 2e-3, 0.017, 0.029, 2e-3, 2e-3, 7e-3, 3e-3, 4e-3, 0.026, 4e-3, 0.064, 4e-3, 4e-3, 9e-3, 0.024, 8e-3, 1.886, 0.043, 9e-3, 0.04, 9e-3, 0.064, 0.625, 8e-3, 4e-3, 0.017, 3e-3, 3e-3, 4e-3, 6e-3, 0.017, 3e-3, 4e-3, 1e-3, 8e-3, 1e-3, 2e-3, 0.019, 8e-3, 0.014, 1.225, 5e-3, 9e-3, 0.011, 5e-3, 0.012, 0.012, 0.395, 9e-3, 0.027, 0.02, 0.616, 0.016, 1e-4, 1e-4, 0.039, 1.311, 1.431, 3.692, 1e-4, 1e-4, 1e-3, 4e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.017, 9e-3, 0.074, 0.029, 1e-3, 1e-4, 1e-4, 2e-3, 7e-3, 0.043, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 0.012, 0.141, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "dty": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.724, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.716, 1e-3, 0.019, 1e-4, 1e-4, 3e-3, 1e-4, 8e-3, 0.063, 0.066, 1e-3, 1e-4, 0.189, 0.033, 0.052, 8e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.027, 4e-3, 0.012, 1e-3, 0.012, 1e-3, 1e-4, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.017, 0.012, 4e-3, 5e-3, 0.014, 2e-3, 3e-3, 6e-3, 0.016, 1e-3, 4e-3, 7e-3, 8e-3, 0.013, 0.011, 3e-3, 1e-4, 0.019, 8e-3, 9e-3, 4e-3, 1e-3, 3e-3, 1e-4, 3e-3, 1e-3, 1e-4, 0.015, 1e-4, 1e-4, 1e-4, 0.87, 0.744, 0.354, 0.069, 1e-4, 0.295, 0.114, 1.106, 0.404, 0.216, 6e-3, 1.008, 0.08, 2.434, 1e-4, 0.171, 9e-3, 1e-3, 1e-3, 0.025, 0.014, 1.53, 0.174, 0.539, 0.045, 0.068, 0.25, 0.269, 0.443, 0.023, 0.04, 0.304, 0.083, 0.214, 0.028, 0.182, 24.937, 7.5, 0.641, 0.298, 1.687, 0.033, 0.816, 0.129, 0.459, 0.371, 1.179, 1.062, 2.109, 2e-3, 1.084, 1e-4, 1e-4, 0.578, 0.275, 0.191, 1.004, 0.659, 1e-3, 1e-4, 0.01, 0.01, 3.197, 1.534, 1e-4, 1e-4, 4e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.897, 1e-4, 0.034, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "dv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.449, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.782, 3e-3, 0.057, 1e-4, 1e-4, 5e-3, 1e-4, 5e-3, 0.068, 0.068, 1e-4, 1e-3, 0.01, 0.02, 0.58, 3e-3, 0.08, 0.111, 0.068, 0.041, 0.031, 0.037, 0.03, 0.031, 0.035, 0.052, 0.01, 1e-3, 3e-3, 2e-3, 3e-3, 1e-4, 1e-4, 3e-3, 1e-3, 5e-3, 2e-3, 2e-3, 2e-3, 1e-3, 3e-3, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 3e-3, 1e-4, 2e-3, 3e-3, 5e-3, 1e-3, 1e-3, 3e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 4e-3, 1e-4, 0.069, 0.013, 0.026, 0.027, 0.096, 0.015, 0.017, 0.033, 0.065, 1e-3, 6e-3, 0.037, 0.021, 0.063, 0.061, 0.016, 1e-3, 0.05, 0.05, 0.064, 0.025, 9e-3, 0.011, 2e-3, 0.014, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.961, 0.592, 2.65, 1.657, 0.723, 0.269, 1.597, 3.461, 1.72, 1.651, 0.757, 0.977, 1.223, 0.768, 1.538, 0.011, 0.778, 0.359, 0.094, 0.266, 0.255, 0.126, 0.187, 0.051, 6e-3, 0.076, 0.047, 4e-3, 4e-3, 0.086, 0.041, 8e-3, 0.02, 3e-3, 0.091, 8e-3, 0.069, 3e-3, 5.331, 1.558, 2.986, 0.988, 3.164, 0.17, 3.662, 0.439, 0.51, 0.17, 3.636, 6e-3, 0.014, 3e-3, 2e-3, 2e-3, 1e-3, 0.014, 1e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 5e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.201, 0.101, 1e-4, 2e-3, 1e-4, 1e-4, 45.417, 1e-4, 2e-3, 1e-4, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.02, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "dz": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.39, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.815, 1e-4, 4e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 0.023, 0.023, 1e-4, 2e-3, 3e-3, 0.013, 8e-3, 1e-3, 0.017, 0.015, 0.012, 6e-3, 5e-3, 4e-3, 5e-3, 4e-3, 4e-3, 4e-3, 1e-3, 1e-4, 7e-3, 1e-4, 7e-3, 1e-3, 1e-4, 2e-3, 4e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 3e-3, 1e-3, 1e-4, 4e-3, 1e-4, 2e-3, 3e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.03, 0.011, 6e-3, 8e-3, 0.024, 2e-3, 6e-3, 9e-3, 0.021, 2e-3, 4e-3, 0.014, 0.011, 0.019, 0.021, 4e-3, 1e-4, 0.02, 0.011, 0.013, 0.01, 2e-3, 2e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.269, 0.247, 1.794, 2e-3, 1.18, 0.189, 0.19, 0.052, 2e-3, 0.102, 0.016, 7.859, 0.051, 0.549, 8e-3, 0.12, 0.301, 1.592, 0.28, 1.053, 0.694, 0.157, 1.278, 0.061, 0.824, 0.093, 0.2, 0.068, 6e-3, 0.019, 0.267, 0.283, 0.898, 0.517, 1.238, 0.954, 0.214, 0.015, 2.251, 0.029, 0.117, 0.081, 1e-3, 0.058, 1e-4, 0.012, 2e-3, 1e-4, 2e-3, 0.89, 2.149, 0.094, 1.08, 1e-3, 1e-4, 0.053, 1e-3, 1e-4, 0.926, 1e-3, 10.076, 21.494, 2.583, 2e-3, 1e-4, 1e-4, 2e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 32.733, 1e-4, 0.016, 5e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ee": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.047, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.659, 1e-3, 0.347, 1e-4, 1e-3, 4e-3, 4e-3, 0.044, 0.199, 0.199, 1e-3, 1e-4, 0.713, 0.054, 1.348, 5e-3, 0.312, 0.38, 0.219, 0.115, 0.09, 0.132, 0.118, 0.118, 0.109, 0.211, 0.064, 6e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.552, 0.172, 0.134, 0.182, 0.397, 0.085, 0.215, 0.112, 0.083, 0.04, 0.209, 0.217, 0.202, 0.168, 0.043, 0.117, 6e-3, 0.112, 0.229, 0.176, 0.053, 0.059, 0.177, 0.021, 0.139, 0.02, 3e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 7.214, 1.62, 0.258, 2.122, 10.212, 0.557, 1.427, 0.62, 4.11, 0.028, 2.137, 3.419, 2.267, 3.348, 4.663, 0.886, 7e-3, 1.264, 2.303, 2.327, 2.541, 0.557, 2.031, 0.389, 1.697, 0.84, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.058, 0.011, 0.016, 0.109, 4e-3, 2e-3, 9e-3, 1e-3, 3e-3, 0.01, 0.044, 0.61, 5e-3, 2e-3, 1e-4, 3e-3, 0.018, 0.018, 1.229, 9e-3, 2.883, 3e-3, 1.23, 1e-3, 2e-3, 8e-3, 3e-3, 0.085, 0.02, 0.018, 1e-3, 1e-3, 0.052, 0.01, 4e-3, 0.485, 2e-3, 1e-4, 2e-3, 4e-3, 5e-3, 0.042, 3e-3, 2e-3, 3e-3, 0.025, 2e-3, 2e-3, 7e-3, 9e-3, 0.047, 0.01, 5e-3, 3e-3, 5e-3, 3e-3, 6e-3, 5e-3, 0.14, 7e-3, 5e-3, 0.138, 8e-3, 4e-3, 1e-4, 1e-4, 0.039, 0.487, 0.018, 0.548, 1.276, 1e-4, 4e-3, 4.335, 0.128, 4e-3, 0.106, 0.013, 0.028, 0.013, 0.041, 0.016, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.018, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.138, 0.051, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "eml": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.684, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.039, 4e-3, 0.415, 1e-4, 1e-4, 4e-3, 1e-3, 1.632, 0.216, 0.216, 1e-3, 1e-3, 0.746, 0.069, 0.997, 0.011, 0.415, 0.659, 0.408, 0.216, 0.231, 0.235, 0.226, 0.213, 0.215, 0.256, 0.061, 0.026, 0.05, 6e-3, 0.05, 3e-3, 1e-4, 0.44, 0.139, 0.4, 0.112, 0.078, 0.095, 0.114, 0.018, 0.424, 0.019, 0.012, 0.251, 0.226, 0.059, 0.026, 0.233, 0.016, 0.153, 0.231, 0.099, 0.036, 0.164, 0.011, 0.127, 3e-3, 0.015, 4e-3, 1e-4, 4e-3, 1e-4, 2e-3, 1e-4, 7.63, 0.549, 2.301, 3.601, 3.529, 0.617, 1.263, 0.808, 5.22, 0.113, 0.052, 4.92, 1.657, 5.406, 1.72, 1.353, 0.118, 3.957, 2.689, 3.146, 2.026, 0.904, 0.024, 0.02, 0.047, 0.34, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.239, 3e-3, 6e-3, 3e-3, 4e-3, 0.052, 2e-3, 3e-3, 8e-3, 3e-3, 6e-3, 1e-3, 2e-3, 0.193, 2e-3, 1e-3, 2e-3, 2e-3, 3e-3, 0.098, 2e-3, 1e-3, 1e-3, 1e-3, 0.033, 0.188, 3e-3, 0.047, 6e-3, 6e-3, 1e-3, 0.078, 0.562, 0.025, 0.617, 0.129, 0.182, 0.072, 3e-3, 5e-3, 1.444, 0.829, 0.895, 0.057, 0.235, 0.011, 0.346, 1e-3, 4e-3, 3e-3, 0.664, 0.345, 0.314, 7e-3, 0.019, 1e-3, 3e-3, 0.275, 4e-3, 0.186, 0.062, 2e-3, 2e-3, 6e-3, 1e-4, 1e-4, 0.011, 6.936, 0.1, 0.325, 1e-4, 4e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 3e-3, 2e-3, 7e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 0.192, 0.237, 3e-3, 2e-3, 5e-3, 3e-3, 3e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "eo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.154, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.737, 6e-3, 0.429, 1e-4, 1e-4, 0.01, 1e-3, 0.015, 0.235, 0.235, 1e-3, 3e-3, 0.936, 0.306, 0.916, 0.015, 0.284, 0.481, 0.226, 0.14, 0.134, 0.143, 0.121, 0.123, 0.155, 0.273, 0.072, 0.027, 0.012, 7e-3, 0.013, 2e-3, 1e-4, 0.209, 0.154, 0.114, 0.106, 0.232, 0.094, 0.127, 0.102, 0.106, 0.077, 0.183, 0.354, 0.184, 0.118, 0.083, 0.187, 4e-3, 0.116, 0.241, 0.149, 0.061, 0.074, 0.035, 4e-3, 9e-3, 0.024, 0.021, 1e-4, 0.021, 1e-4, 4e-3, 1e-4, 9.544, 0.784, 0.841, 2.534, 6.934, 0.706, 0.989, 0.423, 6.212, 2.407, 2.868, 4.302, 1.963, 5.456, 7.143, 1.699, 9e-3, 4.617, 4.113, 4.222, 2.31, 1.083, 0.045, 0.017, 0.108, 0.46, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.058, 0.01, 9e-3, 8e-3, 4e-3, 4e-3, 2e-3, 3e-3, 0.037, 0.239, 1e-3, 1e-3, 4e-3, 7e-3, 1e-3, 2e-3, 2e-3, 7e-3, 2e-3, 0.018, 8e-3, 1e-3, 2e-3, 2e-3, 2e-3, 0.012, 3e-3, 5e-3, 0.093, 0.609, 8e-3, 5e-3, 0.021, 0.066, 5e-3, 3e-3, 0.01, 0.029, 2e-3, 5e-3, 5e-3, 0.035, 2e-3, 7e-3, 2e-3, 0.34, 1e-3, 2e-3, 0.012, 7e-3, 0.011, 0.025, 6e-3, 0.093, 0.016, 3e-3, 7e-3, 3e-3, 8e-3, 9e-3, 0.016, 9e-3, 9e-3, 3e-3, 1e-4, 1e-4, 0.038, 0.2, 0.946, 0.502, 1e-4, 1e-3, 5e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.012, 6e-3, 0.045, 0.015, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 3e-3, 6e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 3e-3, 0.056, 2e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "eu": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.418, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.177, 1e-3, 0.297, 1e-4, 1e-4, 6e-3, 1e-3, 0.01, 0.167, 0.167, 1e-4, 1e-3, 1.097, 0.307, 1.039, 6e-3, 0.582, 0.665, 0.539, 0.263, 0.232, 0.207, 0.196, 0.233, 0.193, 0.297, 0.077, 0.037, 0.019, 4e-3, 0.019, 1e-3, 1e-4, 0.228, 0.197, 0.105, 0.074, 0.177, 0.09, 0.111, 0.131, 0.123, 0.048, 0.077, 0.106, 0.134, 0.065, 0.059, 0.121, 5e-3, 0.05, 0.134, 0.08, 0.034, 0.046, 0.019, 0.022, 8e-3, 0.029, 5e-3, 1e-4, 5e-3, 1e-4, 2e-3, 1e-4, 11.924, 1.97, 0.229, 2.409, 9.817, 0.3, 1.545, 0.915, 6.874, 0.162, 4.015, 2.508, 1.08, 6.457, 4.385, 0.883, 0.011, 6.261, 2.025, 5.706, 3.55, 0.077, 0.032, 0.337, 0.117, 3.463, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.014, 3e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 3e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 3e-3, 3e-3, 1e-4, 1e-3, 8e-3, 9e-3, 2e-3, 2e-3, 4e-3, 1e-3, 1e-3, 3e-3, 9e-3, 0.023, 1e-3, 0.012, 1e-3, 0.01, 1e-3, 1e-3, 3e-3, 0.012, 7e-3, 8e-3, 6e-3, 1e-3, 3e-3, 1e-3, 2e-3, 1e-3, 4e-3, 0.012, 4e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.039, 0.094, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 3e-3, 7e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.013, 1e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ext": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.183, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.144, 2e-3, 0.474, 1e-4, 1e-4, 8e-3, 1e-3, 0.271, 0.191, 0.19, 4e-3, 2e-3, 1.06, 0.101, 0.854, 0.021, 0.249, 0.293, 0.188, 0.105, 0.088, 0.096, 0.085, 0.084, 0.099, 0.161, 0.072, 0.026, 8e-3, 3e-3, 6e-3, 2e-3, 1e-4, 0.241, 0.103, 0.248, 0.095, 0.369, 0.065, 0.091, 0.071, 0.128, 0.047, 0.018, 0.238, 0.161, 0.09, 0.062, 0.171, 0.026, 0.094, 0.188, 0.116, 0.077, 0.083, 0.02, 0.035, 9e-3, 0.011, 0.028, 1e-4, 0.029, 1e-4, 1e-3, 2e-3, 8.822, 0.896, 2.974, 2.338, 7.586, 0.409, 0.951, 0.639, 6.63, 0.18, 0.079, 4.794, 1.966, 5.508, 3.713, 1.742, 0.451, 4.358, 5.625, 3.427, 5.456, 0.664, 0.026, 0.047, 0.265, 0.205, 1e-4, 0.012, 1e-4, 1e-3, 1e-4, 0.09, 0.042, 0.016, 0.012, 0.021, 0.01, 9e-3, 7e-3, 0.019, 0.01, 9e-3, 2e-3, 7e-3, 0.012, 3e-3, 2e-3, 0.01, 6e-3, 3e-3, 0.011, 0.012, 3e-3, 2e-3, 2e-3, 4e-3, 0.049, 3e-3, 5e-3, 0.01, 9e-3, 3e-3, 3e-3, 0.02, 0.663, 3e-3, 9e-3, 8e-3, 4e-3, 4e-3, 0.092, 6e-3, 0.332, 0.01, 0.012, 9e-3, 0.354, 5e-3, 0.01, 0.016, 0.295, 0.019, 0.537, 0.024, 0.015, 8e-3, 8e-3, 0.011, 0.017, 0.174, 0.02, 0.041, 0.023, 0.01, 0.023, 1e-4, 1e-4, 0.078, 2.453, 0.012, 9e-3, 1e-4, 1e-4, 1e-4, 0.019, 8e-3, 0.025, 5e-3, 1e-4, 0.151, 0.073, 0.021, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 5e-3, 0.034, 0.026, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 0.021, 0.082, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ff": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.229, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.756, 3e-3, 0.154, 1e-4, 1e-4, 2e-3, 1e-4, 0.07, 0.321, 0.324, 4e-3, 1e-3, 1.19, 0.201, 1.011, 0.039, 0.221, 0.281, 0.197, 0.076, 0.082, 0.099, 0.098, 0.084, 0.101, 0.154, 0.153, 0.028, 0.04, 8e-3, 0.04, 0.01, 1e-4, 0.371, 0.159, 0.12, 0.097, 0.095, 0.198, 0.111, 0.12, 0.065, 0.102, 0.267, 0.138, 0.299, 0.201, 0.095, 0.085, 0.014, 0.046, 0.262, 0.159, 0.061, 0.013, 0.059, 3e-3, 0.066, 8e-3, 7e-3, 1e-4, 7e-3, 1e-4, 6e-3, 1e-4, 10.449, 0.928, 0.343, 3.119, 8.063, 0.727, 1.432, 1.127, 6.432, 0.966, 2.387, 3.274, 2.586, 6.222, 6.89, 0.484, 0.058, 2.623, 1.086, 2.251, 3.239, 0.048, 1.581, 0.013, 1.385, 0.042, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.25, 0.043, 1e-4, 8e-3, 7e-3, 1e-3, 7e-3, 2e-3, 0.023, 3e-3, 0.031, 0.086, 1e-3, 1e-4, 9e-3, 5e-3, 7e-3, 0.017, 3e-3, 1.378, 1e-3, 1e-3, 1e-4, 1.485, 0.01, 0.123, 1e-3, 2e-3, 0.036, 0.035, 3e-3, 1e-4, 0.06, 9e-3, 1e-4, 3e-3, 1e-4, 2e-3, 0.02, 0.011, 7e-3, 0.04, 1e-3, 0.024, 1e-3, 3e-3, 1e-4, 1e-4, 6e-3, 0.154, 6e-3, 0.01, 0.135, 2e-3, 2e-3, 9e-3, 4e-3, 2e-3, 4e-3, 0.025, 0.02, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.111, 0.229, 5e-3, 0.088, 0.202, 1e-4, 1e-4, 2.86, 0.02, 1e-3, 1e-3, 1e-4, 3e-3, 1e-4, 0.017, 0.011, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 0.023, 0.044, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 0.248, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "fj": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.647, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.11, 5e-3, 0.222, 1e-4, 1e-4, 1e-4, 2e-3, 0.182, 0.39, 0.39, 2e-3, 3e-3, 0.665, 0.202, 1.418, 0.055, 0.382, 0.504, 0.342, 0.179, 0.168, 0.196, 0.159, 0.133, 0.129, 0.164, 0.07, 0.04, 0.02, 2e-3, 0.02, 0.013, 2e-3, 0.352, 0.212, 0.246, 0.146, 0.319, 0.066, 0.096, 0.061, 0.166, 0.217, 0.277, 0.179, 0.262, 0.29, 0.095, 0.254, 0.022, 0.118, 0.377, 0.355, 0.066, 0.534, 0.043, 3e-3, 0.05, 0.01, 1e-4, 1e-4, 5e-3, 1e-4, 8e-3, 1e-4, 13.891, 0.708, 1.055, 1.505, 4.909, 0.352, 0.936, 0.685, 8.96, 0.075, 2.998, 2.827, 2.182, 5.506, 3.831, 0.546, 0.257, 2.747, 2.722, 3.592, 4.532, 2.046, 0.526, 0.045, 0.71, 0.111, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.267, 0.01, 7e-3, 5e-3, 7e-3, 2e-3, 1e-4, 2e-3, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 8e-3, 1e-4, 1e-4, 0.013, 0.192, 1e-4, 3e-3, 2e-3, 1e-4, 8e-3, 2e-3, 1e-4, 0.023, 0.022, 2e-3, 1e-4, 7e-3, 5e-3, 1e-4, 0.01, 3e-3, 1e-4, 2e-3, 5e-3, 2e-3, 3e-3, 1e-4, 1e-4, 1e-4, 0.01, 1e-4, 1e-4, 8e-3, 1e-4, 3e-3, 0.022, 3e-3, 2e-3, 5e-3, 1e-4, 8e-3, 1e-4, 0.01, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 1e-4, 1e-4, 0.013, 0.065, 1e-4, 0.023, 2e-3, 1e-4, 1e-4, 0.013, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 2e-3, 0.01, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 0.26, 1e-4, 3e-3, 2e-3, 1e-4, 3e-3, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "fo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.171, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.257, 3e-3, 0.223, 1e-4, 1e-4, 0.01, 2e-3, 0.015, 0.14, 0.141, 1e-3, 1e-3, 0.983, 0.292, 1.473, 0.021, 0.562, 0.624, 0.361, 0.197, 0.187, 0.183, 0.177, 0.172, 0.176, 0.285, 0.092, 0.018, 0.015, 5e-3, 0.015, 2e-3, 1e-4, 0.162, 0.14, 0.076, 0.088, 0.116, 0.204, 0.083, 0.244, 0.058, 0.087, 0.291, 0.108, 0.161, 0.114, 0.065, 0.092, 4e-3, 0.082, 0.312, 0.204, 0.061, 0.078, 0.034, 3e-3, 0.012, 6e-3, 4e-3, 1e-4, 4e-3, 1e-4, 2e-3, 1e-4, 6.488, 0.752, 0.145, 1.557, 3.939, 1.383, 2.415, 1.123, 6.407, 0.628, 2.151, 3.099, 2.563, 5.616, 2.172, 0.663, 5e-3, 6.541, 3.536, 4.094, 3.571, 2.164, 0.044, 0.017, 0.862, 0.025, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.054, 0.049, 2e-3, 2e-3, 2e-3, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 0.091, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.033, 2e-3, 1e-3, 2e-3, 1e-3, 0.017, 4e-3, 6e-3, 1e-3, 6e-3, 9e-3, 1e-3, 1e-3, 0.01, 0.939, 1e-3, 1e-3, 0.016, 8e-3, 0.277, 3e-3, 6e-3, 7e-3, 1e-3, 2e-3, 1e-3, 1.13, 1e-3, 4e-3, 1.899, 3e-3, 3e-3, 0.718, 2e-3, 2e-3, 0.014, 1e-3, 0.801, 2e-3, 0.333, 3e-3, 4e-3, 0.203, 3e-3, 2e-3, 1e-4, 1e-4, 0.022, 6.504, 4e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.012, 5e-3, 9e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 4e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 0.053, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "frp": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.788, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.014, 0.012, 0.659, 1e-3, 1e-4, 1e-3, 1e-3, 0.361, 0.368, 0.368, 1e-3, 1e-4, 0.743, 0.467, 0.873, 0.02, 0.214, 0.426, 0.274, 0.128, 0.113, 0.117, 0.113, 0.107, 0.116, 0.228, 0.11, 0.019, 0.081, 5e-3, 0.081, 2e-3, 1e-4, 0.35, 0.279, 0.333, 0.142, 0.141, 0.152, 0.135, 0.066, 0.159, 0.087, 0.033, 0.593, 0.22, 0.099, 0.082, 0.206, 0.019, 0.236, 0.314, 0.121, 0.062, 0.179, 0.013, 0.025, 0.027, 9e-3, 0.022, 1e-4, 0.022, 1e-4, 6e-3, 1e-4, 6.3, 0.639, 2.237, 2.924, 6.953, 0.549, 0.996, 0.581, 3.639, 0.252, 0.124, 3.838, 1.505, 5.552, 4.982, 1.442, 0.366, 4.363, 4.487, 4.4, 2.763, 0.919, 0.029, 0.168, 0.501, 0.132, 1e-4, 8e-3, 1e-4, 1e-3, 1e-4, 0.591, 0.012, 0.04, 0.026, 3e-3, 3e-3, 2e-3, 2e-3, 0.077, 0.083, 2e-3, 3e-3, 4e-3, 3e-3, 2e-3, 5e-3, 7e-3, 3e-3, 2e-3, 0.023, 0.039, 2e-3, 1e-3, 2e-3, 0.013, 0.56, 2e-3, 2e-3, 4e-3, 4e-3, 2e-3, 4e-3, 0.079, 0.014, 0.761, 4e-3, 5e-3, 3e-3, 4e-3, 0.044, 1.724, 0.994, 0.451, 0.049, 0.014, 7e-3, 8e-3, 4e-3, 0.024, 5e-3, 0.02, 0.03, 0.411, 0.012, 2e-3, 0.176, 6e-3, 0.01, 0.014, 0.089, 7e-3, 7e-3, 7e-3, 5e-3, 1e-4, 1e-4, 0.277, 4.789, 8e-3, 0.018, 1e-3, 1e-4, 1e-4, 8e-3, 4e-3, 4e-3, 3e-3, 1e-3, 0.014, 4e-3, 0.075, 0.032, 1e-4, 1e-4, 1e-3, 5e-3, 1e-3, 4e-3, 7e-3, 5e-3, 1e-4, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 4e-3, 0.024, 0.586, 3e-3, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "frr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.212, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.548, 3e-3, 0.682, 1e-4, 1e-3, 8e-3, 1e-4, 0.237, 0.407, 0.407, 0.015, 2e-3, 0.738, 0.264, 1.349, 0.032, 0.426, 0.487, 0.285, 0.155, 0.131, 0.142, 0.153, 0.132, 0.154, 0.213, 0.163, 0.033, 0.094, 0.019, 0.094, 0.014, 1e-4, 0.424, 0.235, 0.114, 0.463, 0.142, 0.219, 0.132, 0.243, 0.123, 0.143, 0.217, 0.156, 0.239, 0.202, 0.1, 0.178, 8e-3, 0.163, 0.493, 0.169, 0.107, 0.04, 0.158, 5e-3, 6e-3, 0.018, 0.02, 1e-4, 0.02, 1e-4, 0.015, 1e-4, 7.38, 1.026, 0.694, 2.643, 7.751, 1.48, 1.329, 1.414, 5.143, 0.835, 1.946, 2.506, 1.658, 6.635, 2.847, 0.757, 0.017, 4.866, 3.953, 4.835, 3.559, 0.125, 1.078, 0.025, 0.13, 0.078, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.121, 0.04, 5e-3, 7e-3, 0.011, 0.01, 4e-3, 3e-3, 0.014, 3e-3, 7e-3, 3e-3, 3e-3, 4e-3, 4e-3, 2e-3, 6e-3, 0.041, 3e-3, 0.029, 4e-3, 2e-3, 0.039, 2e-3, 5e-3, 0.057, 3e-3, 3e-3, 0.033, 1e-3, 0.015, 5e-3, 0.043, 0.01, 8e-3, 4e-3, 0.702, 0.24, 6e-3, 8e-3, 7e-3, 0.041, 6e-3, 0.01, 3e-3, 0.013, 2e-3, 4e-3, 0.015, 8e-3, 0.014, 9e-3, 6e-3, 8e-3, 0.971, 3e-3, 0.022, 7e-3, 6e-3, 5e-3, 0.964, 5e-3, 4e-3, 3e-3, 1e-4, 1e-4, 0.041, 3.039, 0.101, 0.012, 1e-4, 1e-3, 1e-4, 0.016, 8e-3, 0.014, 3e-3, 1e-4, 0.014, 6e-3, 0.019, 7e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 0.018, 0.017, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 0.024, 0.122, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "fur": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.465, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.803, 2e-3, 0.385, 1e-4, 1e-4, 6e-3, 1e-3, 0.135, 0.204, 0.203, 1e-3, 1e-3, 0.945, 0.084, 1.045, 0.015, 0.262, 0.474, 0.24, 0.16, 0.15, 0.158, 0.149, 0.15, 0.168, 0.219, 0.076, 0.046, 0.024, 3e-3, 6e-3, 2e-3, 1e-4, 0.268, 0.102, 0.337, 0.116, 0.078, 0.115, 0.121, 0.022, 0.278, 0.048, 0.02, 0.218, 0.154, 0.07, 0.05, 0.172, 5e-3, 0.086, 0.217, 0.131, 0.073, 0.108, 0.016, 0.024, 2e-3, 0.027, 4e-3, 1e-3, 4e-3, 1e-4, 0.016, 1e-4, 6.873, 0.54, 3.119, 3.521, 7.672, 0.855, 0.912, 0.901, 8.131, 0.838, 0.065, 4.486, 1.745, 5.361, 3.491, 1.873, 0.016, 4.269, 4.833, 4.488, 2.566, 1.056, 0.024, 0.012, 0.029, 0.497, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.039, 5e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 7e-3, 1e-3, 1e-4, 1e-3, 1e-4, 2e-3, 0.013, 1e-4, 1e-3, 8e-3, 8e-3, 1e-4, 2e-3, 0.187, 5e-3, 0.973, 1e-3, 4e-3, 1e-3, 1e-3, 0.127, 0.268, 9e-3, 0.161, 5e-3, 0.069, 3e-3, 0.185, 1e-3, 0.033, 3e-3, 0.05, 6e-3, 0.254, 1e-3, 5e-3, 1e-3, 1e-3, 0.015, 3e-3, 0.208, 5e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.042, 2.523, 0.01, 9e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.01, 5e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 0.038, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "fy": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.82, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.701, 1e-3, 0.398, 1e-4, 1e-3, 0.014, 3e-3, 0.455, 0.166, 0.166, 1e-3, 1e-4, 0.747, 0.192, 0.908, 8e-3, 0.277, 0.415, 0.181, 0.098, 0.101, 0.113, 0.107, 0.108, 0.145, 0.219, 0.052, 0.025, 5e-3, 1e-3, 5e-3, 2e-3, 1e-4, 0.213, 0.183, 0.091, 0.343, 0.093, 0.196, 0.109, 0.18, 0.193, 0.088, 0.132, 0.122, 0.161, 0.156, 0.11, 0.106, 3e-3, 0.108, 0.302, 0.13, 0.038, 0.048, 0.113, 6e-3, 0.12, 9e-3, 7e-3, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 6.027, 1.091, 0.691, 3.439, 11.73, 1.889, 1.306, 1.373, 5.412, 1.009, 2.464, 2.808, 1.837, 7.368, 3.471, 1.074, 6e-3, 5.381, 4.264, 5.226, 1.268, 0.226, 1.241, 0.017, 1.595, 0.254, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.043, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 7e-3, 1e-3, 1e-4, 1e-3, 1e-3, 4e-3, 0.021, 1e-4, 1e-3, 4e-3, 3e-3, 1e-3, 1e-3, 0.013, 4e-3, 0.263, 1e-3, 8e-3, 1e-3, 1e-3, 2e-3, 2e-3, 0.01, 0.258, 0.016, 1e-3, 3e-3, 1e-3, 0.013, 5e-3, 4e-3, 6e-3, 3e-3, 0.084, 2e-3, 6e-3, 1e-3, 3e-3, 2e-3, 0.21, 0.348, 6e-3, 3e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.02, 1.229, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 6e-3, 3e-3, 0.015, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.042, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ga": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.234, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.249, 2e-3, 0.288, 1e-4, 1e-3, 0.013, 2e-3, 0.109, 0.15, 0.15, 1e-4, 2e-3, 0.872, 0.193, 0.872, 0.017, 0.241, 0.359, 0.187, 0.093, 0.09, 0.096, 0.095, 0.093, 0.117, 0.202, 0.044, 0.013, 2e-3, 3e-3, 2e-3, 2e-3, 1e-4, 0.26, 0.338, 0.441, 0.188, 0.097, 0.15, 0.18, 0.066, 0.279, 0.041, 0.036, 0.154, 0.249, 0.121, 0.062, 0.138, 5e-3, 0.145, 0.311, 0.272, 0.036, 0.033, 0.04, 7e-3, 9e-3, 7e-3, 0.033, 1e-4, 0.031, 1e-4, 2e-3, 1e-4, 11.315, 1.29, 2.859, 2.236, 4.184, 0.692, 2.117, 5.503, 7.212, 0.011, 0.093, 2.991, 1.605, 6.018, 2.868, 0.471, 7e-3, 4.409, 3.653, 3.32, 1.715, 0.088, 0.061, 0.021, 0.135, 0.028, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 0.063, 0.032, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 0.059, 1e-3, 2e-3, 2e-3, 9e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.044, 3e-3, 1e-3, 1e-3, 1e-3, 5e-3, 0.023, 8e-3, 1e-3, 6e-3, 6e-3, 1e-4, 1e-3, 0.02, 1.278, 8e-3, 2e-3, 5e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1.021, 1e-3, 2e-3, 2e-3, 1.343, 1e-3, 1e-3, 6e-3, 4e-3, 4e-3, 0.674, 2e-3, 3e-3, 5e-3, 1e-3, 4e-3, 2e-3, 0.624, 2e-3, 5e-3, 4e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.022, 5.087, 4e-3, 5e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.011, 5e-3, 0.021, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 0.061, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "gag": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.391, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.28, 0.016, 0.1, 1e-4, 1e-3, 0.011, 1e-4, 0.023, 0.153, 0.154, 1e-4, 1e-4, 0.918, 0.454, 1.065, 0.029, 0.183, 0.22, 0.131, 0.062, 0.067, 0.072, 0.06, 0.06, 0.062, 0.143, 0.13, 0.023, 0.015, 4e-3, 0.015, 0.028, 1e-4, 0.378, 0.403, 0.048, 0.156, 0.135, 0.049, 0.237, 0.117, 0.049, 0.029, 0.415, 0.105, 0.242, 0.108, 0.187, 0.134, 3e-3, 0.159, 0.189, 0.383, 0.092, 0.136, 5e-3, 0.011, 0.079, 0.04, 2e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 9.932, 1.463, 0.503, 2.949, 4.34, 0.314, 1.11, 0.547, 5.816, 0.052, 2.859, 4.285, 1.983, 5.174, 2.034, 0.659, 7e-3, 5.297, 2.304, 2.138, 2.154, 0.741, 6e-3, 7e-3, 1.825, 1.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.33, 0.02, 0.014, 0.017, 0.012, 6e-3, 3e-3, 0.09, 4e-3, 2e-3, 5e-3, 6e-3, 5e-3, 0.012, 2e-3, 7e-3, 2e-3, 4e-3, 2e-3, 0.034, 0.066, 3e-3, 0.036, 2e-3, 4e-3, 0.038, 4e-3, 0.03, 0.138, 0.106, 0.046, 1.073, 5e-3, 0.011, 0.07, 0.054, 1.028, 1e-3, 6e-3, 0.629, 3e-3, 6e-3, 0.12, 6e-3, 2e-3, 1e-3, 4e-3, 3e-3, 0.193, 2.957, 0.016, 0.012, 8e-3, 0.03, 0.347, 9e-3, 0.023, 5e-3, 0.018, 0.016, 1.278, 0.014, 0.03, 5e-3, 1e-4, 1e-4, 0.012, 3.601, 3.155, 1.149, 1e-3, 1e-4, 0.029, 0.03, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.224, 0.106, 2e-3, 1e-3, 1e-4, 1e-4, 1e-3, 3e-3, 0.019, 0.015, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 5e-3, 0.317, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "gan": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.76, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.481, 2e-3, 0.018, 1e-4, 1e-4, 0.024, 3e-3, 8e-3, 0.023, 0.024, 2e-3, 6e-3, 0.023, 0.038, 0.047, 0.01, 0.315, 0.585, 0.297, 0.204, 0.191, 0.202, 0.185, 0.171, 0.182, 0.259, 5e-3, 1e-3, 7e-3, 3e-3, 7e-3, 2e-3, 1e-4, 0.033, 0.019, 0.032, 0.016, 0.012, 0.012, 0.016, 0.021, 0.015, 0.011, 0.012, 0.015, 0.023, 0.016, 0.01, 0.022, 2e-3, 0.018, 0.031, 0.022, 6e-3, 9e-3, 0.014, 2e-3, 5e-3, 1e-3, 8e-3, 1e-3, 8e-3, 1e-4, 2e-3, 1e-4, 0.219, 0.03, 0.061, 0.069, 0.246, 0.023, 0.046, 0.084, 0.187, 5e-3, 0.034, 0.116, 0.064, 0.184, 0.17, 0.035, 3e-3, 0.158, 0.115, 0.138, 0.085, 0.023, 0.019, 7e-3, 0.04, 7e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 3.244, 1.279, 2.127, 0.643, 0.387, 0.883, 0.435, 0.848, 1.431, 1.201, 0.629, 1.296, 2.258, 1.163, 0.623, 0.808, 0.937, 0.395, 0.26, 0.593, 0.667, 0.608, 1.031, 1.999, 0.578, 0.845, 0.936, 0.665, 1.536, 0.644, 0.439, 0.928, 0.498, 0.603, 0.631, 0.704, 0.585, 0.768, 0.515, 0.538, 0.76, 0.649, 0.365, 0.712, 0.597, 1.095, 0.882, 0.565, 2.328, 1.119, 0.438, 0.543, 1.012, 0.372, 0.441, 0.708, 1.829, 1.205, 1.47, 1.203, 2.219, 1.044, 0.843, 1.251, 1e-4, 1e-4, 0.055, 0.02, 5e-3, 6e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 2e-3, 1e-4, 0.018, 9e-3, 0.031, 9e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 7e-3, 0.036, 0.032, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.029, 0.011, 0.055, 2.062, 3.549, 9.312, 4.838, 3.056, 2.889, 2.67, 3e-3, 5e-3, 0.013, 3e-3, 2e-3, 1.772, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "gd": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.483, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.829, 1e-3, 0.374, 1e-4, 1e-4, 0.027, 1e-3, 0.653, 0.225, 0.224, 1e-3, 1e-3, 0.74, 0.732, 0.959, 0.016, 0.275, 0.512, 0.251, 0.163, 0.143, 0.16, 0.146, 0.151, 0.187, 0.234, 0.126, 0.023, 4e-3, 3e-3, 4e-3, 2e-3, 1e-4, 0.399, 0.354, 0.494, 0.195, 0.121, 0.114, 0.226, 0.061, 0.158, 0.033, 0.034, 0.204, 0.239, 0.107, 0.062, 0.151, 4e-3, 0.164, 0.477, 0.402, 0.038, 0.033, 0.037, 0.023, 9e-3, 8e-3, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-3, 13.191, 1.481, 2.674, 2.933, 4.722, 0.55, 2.044, 6.832, 6.396, 0.019, 0.13, 2.757, 1.684, 7.147, 2.433, 0.32, 0.014, 3.962, 3.004, 2.554, 2.054, 0.073, 0.068, 0.016, 0.125, 0.044, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.262, 0.013, 5e-3, 5e-3, 4e-3, 3e-3, 2e-3, 2e-3, 0.031, 5e-3, 4e-3, 1e-3, 0.011, 3e-3, 2e-3, 1e-3, 6e-3, 3e-3, 0.012, 0.014, 4e-3, 2e-3, 2e-3, 2e-3, 0.027, 0.178, 3e-3, 5e-3, 0.012, 0.011, 1e-3, 3e-3, 0.677, 0.029, 2e-3, 3e-3, 9e-3, 3e-3, 4e-3, 5e-3, 0.218, 0.029, 4e-3, 3e-3, 0.303, 0.022, 2e-3, 3e-3, 0.018, 8e-3, 0.323, 0.026, 4e-3, 4e-3, 0.01, 2e-3, 6e-3, 0.223, 0.01, 3e-3, 0.014, 4e-3, 5e-3, 2e-3, 1e-4, 1e-4, 0.041, 1.912, 9e-3, 0.011, 1e-4, 1e-4, 1e-4, 0.018, 0.01, 0.015, 3e-3, 1e-4, 0.015, 7e-3, 0.02, 6e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 8e-3, 9e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 4e-3, 0.244, 2e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "gl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.812, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.39, 2e-3, 0.342, 1e-4, 1e-4, 0.01, 1e-3, 0.013, 0.144, 0.144, 1e-3, 2e-3, 1.02, 0.075, 0.726, 0.01, 0.251, 0.326, 0.181, 0.093, 0.083, 0.092, 0.082, 0.082, 0.102, 0.185, 0.047, 0.021, 3e-3, 2e-3, 2e-3, 1e-3, 1e-4, 0.331, 0.122, 0.257, 0.114, 0.192, 0.107, 0.104, 0.065, 0.139, 0.039, 0.03, 0.104, 0.167, 0.127, 0.177, 0.186, 7e-3, 0.111, 0.187, 0.12, 0.054, 0.074, 0.026, 0.055, 9e-3, 0.01, 5e-3, 1e-4, 5e-3, 1e-4, 3e-3, 1e-4, 9.121, 0.85, 3.271, 4.11, 8.668, 0.721, 0.784, 0.524, 5.185, 0.017, 0.092, 2.548, 2.069, 5.528, 7.673, 1.889, 0.464, 5.046, 5.357, 3.627, 2.8, 0.704, 0.036, 0.564, 0.085, 0.291, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.015, 0.013, 3e-3, 2e-3, 2e-3, 1e-3, 2e-3, 2e-3, 1e-3, 0.012, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 6e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 3e-3, 3e-3, 1e-4, 1e-3, 0.028, 0.396, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 3e-3, 3e-3, 0.383, 3e-3, 7e-3, 1e-3, 0.442, 1e-3, 1e-3, 5e-3, 0.193, 6e-3, 0.599, 2e-3, 2e-3, 3e-3, 1e-3, 3e-3, 2e-3, 0.219, 7e-3, 8e-3, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.05, 2.267, 4e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.011, 5e-3, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.014, 3e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "glk": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.405, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.911, 5e-3, 0.048, 1e-4, 1e-4, 1e-3, 1e-4, 0.017, 0.104, 0.105, 1e-4, 1e-3, 0.019, 0.086, 0.553, 0.019, 0.043, 0.074, 0.037, 0.051, 0.028, 0.037, 0.027, 0.021, 0.025, 0.021, 0.078, 1e-4, 5e-3, 6e-3, 7e-3, 1e-3, 1e-4, 4e-3, 3e-3, 8e-3, 3e-3, 3e-3, 2e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 2e-3, 4e-3, 2e-3, 1e-3, 3e-3, 1e-4, 3e-3, 5e-3, 8e-3, 6e-3, 1e-3, 2e-3, 1e-4, 1e-3, 1e-3, 3e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 0.177, 0.041, 0.015, 0.061, 0.102, 0.013, 0.028, 0.036, 0.115, 0.015, 0.035, 0.047, 0.057, 0.128, 0.083, 0.024, 8e-3, 0.098, 0.063, 0.07, 0.058, 0.027, 9e-3, 0.013, 0.021, 0.022, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 0.159, 0.386, 0.313, 0.148, 1.28, 2.09, 3.65, 3.311, 2.644, 0.084, 1.185, 3e-3, 3.768, 1e-3, 0.042, 0.015, 0.057, 7e-3, 1e-3, 6e-3, 5e-3, 1e-4, 1e-4, 1e-4, 0.027, 0.07, 4e-3, 9e-3, 2e-3, 1e-3, 1e-4, 0.024, 1e-3, 5e-3, 0.174, 0.185, 0.526, 1e-4, 0.349, 5.779, 1.561, 0.992, 2.058, 0.045, 0.725, 0.235, 0.5, 2.399, 0.083, 3.048, 0.622, 2.068, 1.214, 0.15, 0.072, 0.14, 0.046, 0.343, 0.079, 0.014, 1e-3, 1e-4, 0.271, 1e-4, 1e-4, 1e-4, 0.044, 0.065, 2e-3, 0.021, 1e-4, 3e-3, 1e-4, 0.068, 1e-4, 0.285, 1e-3, 1e-4, 1e-3, 1e-4, 5e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 21.901, 14.77, 1.833, 3.683, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.141, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "gn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.37, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.685, 2e-3, 0.175, 1e-4, 1e-4, 7e-3, 1e-4, 0.625, 0.171, 0.173, 1e-3, 2e-3, 1.108, 0.288, 0.925, 0.011, 0.221, 0.306, 0.165, 0.094, 0.084, 0.088, 0.078, 0.08, 0.105, 0.172, 0.107, 0.053, 0.096, 1e-3, 0.096, 1e-3, 1e-4, 0.314, 0.094, 0.194, 0.053, 0.124, 0.074, 0.125, 0.128, 0.14, 0.097, 0.171, 0.086, 0.202, 0.077, 0.188, 0.312, 5e-3, 0.119, 0.136, 0.188, 0.098, 0.072, 0.01, 0.015, 0.073, 5e-3, 0.013, 1e-4, 0.013, 1e-4, 1e-4, 3e-3, 10.368, 1.134, 1.037, 1.076, 7.653, 0.097, 1.575, 2.931, 4.208, 1.013, 1.951, 0.867, 2.302, 2.015, 5.216, 3.17, 0.036, 4.342, 1.438, 2.887, 4.01, 2.242, 0.013, 0.023, 2.052, 0.103, 2e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1.036, 0.019, 2e-3, 0.069, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 3e-3, 1e-3, 4e-3, 1e-4, 1e-3, 2e-3, 0.06, 1e-3, 0.011, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 0.862, 1e-3, 1e-3, 0.08, 0.08, 1e-4, 1e-3, 0.04, 0.787, 3e-3, 0.72, 0.019, 2e-3, 3e-3, 3e-3, 0.016, 1.383, 3e-3, 0.016, 3e-3, 0.256, 2e-3, 0.013, 7e-3, 0.786, 0.011, 0.399, 0.027, 0.172, 4e-3, 1e-3, 3e-3, 0.065, 0.529, 0.066, 0.013, 0.527, 3e-3, 3e-3, 1e-4, 1e-4, 0.078, 4.545, 0.392, 0.1, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 2e-3, 0.065, 1e-4, 4e-3, 2e-3, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.015, 0.405, 1.034, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "gom": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.459, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.409, 4e-3, 0.032, 1e-4, 1e-4, 4e-3, 1e-3, 0.065, 0.082, 0.086, 1e-4, 1e-3, 0.31, 0.092, 0.614, 0.025, 0.037, 0.076, 0.035, 0.025, 0.021, 0.026, 0.02, 0.018, 0.022, 0.033, 0.044, 0.02, 1e-4, 3e-3, 1e-4, 7e-3, 1e-4, 0.043, 0.023, 0.024, 0.027, 0.017, 0.011, 0.022, 0.028, 0.023, 0.016, 0.018, 0.014, 0.036, 0.017, 0.018, 0.033, 1e-3, 0.019, 0.035, 0.046, 0.011, 0.011, 5e-3, 4e-3, 3e-3, 4e-3, 1e-3, 1e-4, 1e-3, 1e-4, 7e-3, 1e-3, 1.398, 0.134, 0.264, 0.41, 0.83, 0.062, 0.182, 0.613, 0.742, 0.041, 0.372, 0.505, 0.457, 0.862, 0.987, 0.203, 2e-3, 0.568, 0.367, 0.732, 0.344, 0.233, 0.034, 0.102, 0.093, 0.096, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1.014, 0.337, 1.717, 0.03, 1e-4, 0.2, 0.49, 1.091, 0.031, 0.184, 0.021, 0.587, 0.017, 1.766, 2e-3, 0.057, 2e-3, 0.019, 5e-3, 0.016, 1e-3, 1.048, 0.146, 0.534, 0.083, 0.03, 0.659, 6e-3, 0.381, 0.026, 6e-3, 0.26, 0.031, 0.261, 4e-3, 0.294, 21.971, 5.237, 0.529, 0.24, 0.912, 0.021, 0.699, 0.107, 0.285, 0.131, 0.613, 1.017, 1.508, 8e-3, 1.629, 0.499, 8e-3, 0.864, 0.313, 0.067, 0.93, 0.419, 1e-4, 6e-3, 2e-3, 1e-4, 3.471, 0.661, 1e-4, 1e-4, 8e-3, 0.024, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 26.65, 1e-4, 0.078, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "got": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.339, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.094, 3e-3, 1.291, 1e-4, 1e-4, 1e-4, 1e-4, 0.038, 0.115, 0.115, 4e-3, 2e-3, 1.558, 0.264, 1.449, 7e-3, 0.147, 0.29, 0.265, 0.261, 0.158, 0.118, 0.082, 0.102, 0.128, 0.101, 0.042, 0.039, 6e-3, 3e-3, 8e-3, 0.017, 1e-4, 0.013, 6e-3, 0.028, 6e-3, 0.126, 4e-3, 0.142, 0.123, 0.192, 4e-3, 3e-3, 0.01, 7e-3, 4e-3, 0.248, 7e-3, 1e-4, 0.011, 0.012, 0.024, 0.014, 0.037, 8e-3, 1e-4, 1e-3, 1e-3, 4e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-3, 1.416, 0.252, 0.277, 0.447, 1.622, 0.345, 0.341, 0.482, 1.005, 0.151, 0.167, 0.523, 0.441, 1.296, 0.895, 0.224, 0.019, 0.998, 0.984, 0.975, 0.495, 0.221, 0.388, 0.018, 0.135, 0.029, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.227, 0.027, 0.943, 1.525, 0.623, 0.417, 0.281, 0.024, 0.043, 0.442, 0.017, 1e-3, 12.517, 4.391, 1e-4, 4e-3, 16.904, 1e-3, 2e-3, 5e-3, 1e-3, 3e-3, 4e-3, 4e-3, 1e-4, 3e-3, 0.047, 0.043, 3e-3, 3e-3, 4e-3, 2e-3, 1.424, 0.066, 0.105, 1e-3, 4e-3, 1e-3, 9e-3, 2e-3, 0.017, 5e-3, 2e-3, 5e-3, 2e-3, 0.035, 1e-3, 3e-3, 3.235, 0.309, 0.439, 0.698, 0.617, 0.042, 0.143, 0.379, 0.509, 2.203, 0.495, 0.498, 0.573, 1.215, 0.432, 0.907, 1e-4, 1e-4, 1.432, 0.164, 7e-3, 4e-3, 1e-3, 2e-3, 1e-4, 4e-3, 0.018, 2e-3, 0.024, 1e-4, 0.034, 0.019, 0.033, 0.012, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 3e-3, 2e-3, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 3e-3, 0.09, 0.108, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.902, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "gv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.271, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.449, 1e-3, 0.421, 2e-3, 1e-3, 0.012, 4e-3, 0.833, 0.218, 0.217, 1e-3, 4e-3, 1.036, 0.572, 0.962, 0.016, 0.26, 0.327, 0.165, 0.089, 0.084, 0.093, 0.087, 0.088, 0.107, 0.189, 0.087, 0.045, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.277, 0.194, 0.324, 0.123, 0.14, 0.124, 0.191, 0.146, 0.079, 0.067, 0.068, 0.129, 0.207, 0.152, 0.084, 0.138, 0.02, 0.179, 0.402, 0.526, 0.063, 0.198, 0.043, 5e-3, 0.079, 6e-3, 9e-3, 1e-4, 9e-3, 1e-4, 1e-3, 1e-4, 8.563, 0.792, 1.691, 1.903, 8.594, 0.377, 2.885, 5.368, 3.902, 0.512, 0.598, 3.599, 1.506, 6.663, 4.174, 0.394, 0.032, 4.839, 4.581, 2.625, 1.233, 0.647, 0.279, 0.018, 6.112, 0.053, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.052, 0.016, 0.011, 7e-3, 6e-3, 2e-3, 2e-3, 0.033, 3e-3, 8e-3, 1e-3, 1e-3, 2e-3, 4e-3, 1e-3, 3e-3, 4e-3, 2e-3, 1e-3, 8e-3, 5e-3, 1e-3, 2e-3, 2e-3, 7e-3, 0.032, 3e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 0.013, 0.034, 1e-3, 3e-3, 6e-3, 2e-3, 2e-3, 0.259, 3e-3, 0.024, 3e-3, 5e-3, 3e-3, 0.021, 1e-3, 3e-3, 0.016, 6e-3, 0.011, 0.021, 3e-3, 6e-3, 5e-3, 6e-3, 0.011, 8e-3, 0.015, 5e-3, 7e-3, 5e-3, 6e-3, 4e-3, 1e-4, 1e-4, 0.024, 0.446, 0.012, 0.021, 1e-4, 1e-3, 1e-4, 6e-3, 3e-3, 4e-3, 2e-3, 1e-4, 0.012, 7e-3, 0.044, 0.019, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 6e-3, 0.05, 2e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ha": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.755, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.253, 6e-3, 0.093, 1e-3, 1e-4, 3e-3, 1e-3, 0.233, 0.264, 0.267, 1e-4, 1e-3, 0.745, 0.202, 0.904, 0.054, 0.25, 0.351, 0.185, 0.101, 0.092, 0.11, 0.102, 0.101, 0.107, 0.226, 0.077, 0.015, 9e-3, 2e-3, 9e-3, 6e-3, 1e-3, 0.703, 0.295, 0.111, 0.155, 0.055, 0.098, 0.113, 0.13, 0.318, 0.133, 0.225, 0.088, 0.271, 0.163, 0.048, 0.074, 5e-3, 0.115, 0.268, 0.173, 0.05, 0.018, 0.079, 3e-3, 0.091, 0.042, 0.023, 1e-4, 0.025, 1e-4, 0.021, 1e-3, 18.747, 1.651, 0.919, 2.906, 2.679, 0.906, 1.302, 1.831, 6.455, 0.467, 3.514, 2.109, 2.474, 6.749, 1.839, 0.213, 0.023, 4.031, 3.401, 2.21, 3.388, 0.067, 1.617, 0.015, 2.266, 0.447, 1e-3, 1e-3, 3e-3, 2e-3, 1e-4, 0.116, 7e-3, 3e-3, 1e-3, 9e-3, 5e-3, 3e-3, 3e-3, 7e-3, 2e-3, 0.01, 1e-3, 1e-3, 1e-4, 3e-3, 1e-3, 2e-3, 2e-3, 1e-3, 0.029, 2e-3, 1e-3, 1e-4, 0.094, 0.018, 0.242, 1e-4, 1e-3, 0.01, 9e-3, 1e-3, 4e-3, 0.02, 5e-3, 2e-3, 6e-3, 1e-4, 1e-3, 3e-3, 0.015, 4e-3, 0.013, 4e-3, 2e-3, 2e-3, 4e-3, 2e-3, 3e-3, 4e-3, 0.011, 1e-3, 5e-3, 0.011, 3e-3, 2e-3, 3e-3, 2e-3, 4e-3, 2e-3, 1e-3, 3e-3, 3e-3, 1e-4, 2e-3, 1e-4, 1e-4, 0.03, 0.04, 8e-3, 4e-3, 0.18, 1e-4, 1e-4, 0.118, 1e-3, 4e-3, 1e-4, 1e-4, 1e-3, 1e-3, 0.011, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.044, 0.043, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.115, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hak": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.002, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.757, 1e-3, 0.06, 1e-4, 1e-4, 0.014, 1e-4, 7e-3, 0.281, 0.281, 1e-4, 1e-3, 0.836, 6.558, 0.681, 0.018, 0.337, 0.407, 0.278, 0.148, 0.134, 0.137, 0.13, 0.123, 0.136, 0.173, 0.065, 0.014, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 0.079, 0.057, 0.378, 0.035, 0.025, 0.133, 0.042, 0.182, 0.024, 0.017, 0.335, 0.169, 0.185, 0.174, 0.026, 0.169, 0.016, 0.027, 0.334, 0.366, 0.012, 0.069, 0.025, 2e-3, 0.166, 9e-3, 7e-3, 1e-4, 7e-3, 1e-4, 3e-3, 1e-4, 1.796, 0.086, 1.609, 0.16, 2.657, 0.577, 2.978, 5.312, 4.077, 0.022, 2.986, 0.978, 0.836, 6.046, 1.214, 0.924, 6e-3, 0.355, 1.925, 2.85, 1.719, 0.417, 0.063, 0.011, 1.033, 0.05, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.624, 0.347, 0.489, 0.127, 0.115, 0.217, 0.079, 0.128, 0.198, 0.185, 0.153, 0.188, 0.325, 0.981, 0.111, 0.161, 0.125, 0.071, 0.062, 0.072, 0.143, 0.099, 0.164, 0.124, 0.154, 0.164, 0.132, 0.118, 0.284, 0.116, 0.086, 0.138, 0.587, 0.284, 0.798, 0.114, 0.117, 0.11, 0.089, 0.096, 0.66, 0.449, 0.294, 0.11, 0.804, 0.308, 1.169, 0.118, 0.192, 0.187, 0.596, 1.486, 0.608, 0.076, 0.115, 0.115, 0.317, 1.436, 0.679, 1.022, 0.36, 0.128, 0.129, 0.134, 1e-4, 1e-4, 0.018, 7.409, 0.013, 0.036, 3e-3, 5e-3, 1e-4, 3e-3, 1e-3, 2e-3, 1.194, 1e-4, 0.01, 5e-3, 0.045, 0.02, 1e-3, 1e-3, 1e-4, 1e-4, 3e-3, 0.013, 6e-3, 4e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 1.011, 0.064, 0.254, 0.448, 1.333, 0.785, 0.602, 0.451, 0.439, 2e-3, 4e-3, 8e-3, 3e-3, 1e-4, 0.269, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "haw": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.221, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.294, 0.012, 0.203, 1e-4, 1e-4, 1e-4, 1e-3, 0.132, 0.34, 0.352, 1e-4, 1e-3, 1.505, 0.111, 0.979, 7e-3, 0.17, 0.218, 0.129, 0.06, 0.059, 0.065, 0.059, 0.085, 0.093, 0.096, 0.074, 0.017, 0.01, 1e-4, 0.01, 7e-3, 1e-4, 0.393, 0.447, 0.582, 0.062, 0.097, 0.065, 0.079, 0.798, 0.153, 0.05, 0.341, 0.594, 0.369, 0.112, 0.254, 0.296, 0.019, 0.112, 0.703, 0.122, 0.065, 0.176, 0.058, 5e-3, 0.01, 0.09, 5e-3, 1e-4, 6e-3, 1e-4, 3e-3, 6e-3, 12.798, 0.268, 0.355, 0.813, 5.652, 0.089, 0.569, 1.324, 6.125, 0.081, 4.131, 4.145, 2.483, 4.121, 5.223, 1.895, 0.028, 1.627, 1.407, 0.928, 3.376, 0.134, 0.71, 0.014, 0.137, 0.178, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1.411, 1.393, 0.012, 0.01, 8e-3, 4e-3, 3e-3, 3e-3, 0.01, 1e-3, 6e-3, 4e-3, 0.027, 0.239, 1e-3, 4e-3, 0.011, 6e-3, 2e-3, 0.111, 0.01, 6e-3, 2e-3, 4e-3, 1.323, 0.019, 6e-3, 4e-3, 7e-3, 6e-3, 5e-3, 4e-3, 6e-3, 0.059, 5e-3, 6e-3, 6e-3, 4e-3, 1e-3, 0.013, 0.01, 0.035, 0.014, 0.268, 4e-3, 0.047, 3e-3, 4e-3, 0.012, 0.061, 8e-3, 0.113, 6e-3, 7e-3, 4e-3, 5e-3, 0.011, 5e-3, 0.014, 1.288, 0.011, 0.01, 6e-3, 4e-3, 1e-4, 1e-4, 0.011, 0.331, 1.585, 0.461, 1e-4, 8e-3, 1e-4, 0.011, 1.285, 0.01, 1e-3, 1e-4, 0.031, 0.013, 0.031, 0.011, 1e-3, 1e-4, 1e-4, 1e-4, 4e-3, 0.043, 0.02, 0.017, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 0.013, 1.362, 1e-4, 1e-3, 6e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 7e-3, 8e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hif": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.441, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.1, 4e-3, 0.114, 1e-4, 1e-3, 9e-3, 4e-3, 0.035, 0.174, 0.173, 1e-3, 1e-3, 0.931, 0.131, 1.205, 0.021, 0.405, 0.564, 0.33, 0.156, 0.134, 0.134, 0.137, 0.132, 0.161, 0.312, 0.075, 9e-3, 3e-3, 5e-3, 3e-3, 1e-3, 1e-4, 0.456, 0.322, 0.355, 0.197, 0.18, 0.293, 0.19, 0.17, 0.372, 0.16, 0.181, 0.207, 0.307, 0.247, 0.078, 0.33, 0.012, 0.201, 0.529, 0.239, 0.168, 0.085, 0.095, 4e-3, 0.174, 0.017, 0.016, 1e-4, 0.016, 1e-4, 0.019, 1e-4, 12.241, 1.338, 1.486, 1.704, 7.791, 0.593, 1.202, 3.829, 6.515, 0.754, 3.146, 2.684, 2.468, 4.596, 2.829, 0.958, 0.04, 4.362, 3.289, 3.315, 2.328, 0.443, 0.421, 0.04, 0.804, 0.089, 1e-4, 3e-3, 1e-3, 1e-4, 1e-4, 0.026, 0.089, 9e-3, 2e-3, 3e-3, 5e-3, 2e-3, 0.014, 8e-3, 1e-3, 1e-3, 4e-3, 2e-3, 0.02, 3e-3, 3e-3, 3e-3, 2e-3, 1e-3, 0.042, 3e-3, 7e-3, 1e-3, 3e-3, 2e-3, 5e-3, 2e-3, 0.011, 4e-3, 1e-3, 1e-3, 0.013, 0.018, 9e-3, 1e-3, 5e-3, 0.072, 0.024, 7e-3, 9e-3, 7e-3, 0.012, 4e-3, 0.029, 3e-3, 0.013, 9e-3, 7e-3, 0.017, 0.022, 0.012, 6e-3, 4e-3, 5e-3, 0.014, 2e-3, 0.01, 0.032, 5e-3, 4e-3, 0.012, 3e-3, 0.011, 6e-3, 1e-4, 1e-4, 0.028, 0.074, 0.148, 0.035, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 5e-3, 3e-3, 1e-4, 4e-3, 1e-3, 0.016, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 9e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.105, 0.033, 0.022, 2e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ho": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.445, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.244, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.681, 0.84, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.042, 1e-4, 1e-4, 1e-4, 0.84, 1.681, 1e-4, 0.84, 1e-4, 1e-4, 1.681, 1.681, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.966, 0.84, 1e-4, 1e-4, 7.563, 1e-4, 0.84, 1e-4, 5.042, 1e-4, 1e-4, 2.521, 1.681, 5.882, 12.605, 1.681, 1e-4, 3.361, 1.681, 1.681, 1e-4, 1.681, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hsb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.885, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.708, 1e-3, 0.633, 1e-4, 1e-4, 0.02, 1e-3, 6e-3, 0.349, 0.351, 0.019, 1e-3, 0.617, 0.09, 1.156, 0.027, 0.335, 0.549, 0.233, 0.161, 0.153, 0.173, 0.141, 0.134, 0.184, 0.278, 0.061, 0.039, 2e-3, 4e-3, 2e-3, 1e-3, 1e-4, 0.124, 0.184, 0.091, 0.139, 0.058, 0.04, 0.059, 0.112, 0.043, 0.103, 0.189, 0.142, 0.204, 0.143, 0.038, 0.227, 2e-3, 0.151, 0.281, 0.088, 0.037, 0.024, 0.263, 4e-3, 3e-3, 0.079, 6e-3, 1e-4, 6e-3, 1e-4, 1e-3, 1e-4, 6.697, 1.107, 1.636, 2.081, 6.467, 0.188, 0.301, 1.756, 3.527, 3.654, 2.787, 1.99, 1.872, 3.895, 5.864, 1.456, 4e-3, 3.313, 3.645, 2.804, 2.176, 0.063, 3.44, 0.018, 1.507, 1.152, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.124, 0.059, 0.706, 9e-3, 0.065, 3e-3, 9e-3, 0.741, 3e-3, 1e-3, 2e-3, 3e-3, 0.046, 0.476, 1e-3, 4e-3, 4e-3, 3e-3, 3e-3, 0.038, 3e-3, 3e-3, 2e-3, 5e-3, 5e-3, 0.336, 5e-3, 1.33, 0.03, 4e-3, 0.03, 9e-3, 0.055, 0.752, 3e-3, 3e-3, 8e-3, 3e-3, 2e-3, 3e-3, 3e-3, 8e-3, 1e-3, 3e-3, 1e-3, 0.011, 1e-3, 3e-3, 0.025, 8e-3, 0.015, 0.5, 6e-3, 0.013, 0.014, 3e-3, 0.014, 5e-3, 0.495, 0.011, 0.018, 0.033, 0.697, 4e-3, 1e-4, 1e-4, 0.023, 0.573, 2.597, 3.085, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 1e-4, 1e-3, 1e-4, 0.01, 5e-3, 0.144, 0.055, 1e-3, 1e-3, 1e-3, 0.011, 4e-3, 0.015, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 4e-3, 0.112, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ht": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.728, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.82, 5e-3, 0.108, 1e-4, 1e-4, 2e-3, 1e-3, 0.044, 0.203, 0.204, 4e-3, 1e-4, 1.177, 0.16, 1.277, 6e-3, 1.128, 0.316, 0.385, 0.25, 0.229, 0.141, 0.146, 0.14, 0.135, 0.218, 0.285, 9e-3, 2e-3, 2e-3, 2e-3, 0.073, 1e-4, 0.308, 0.114, 0.31, 0.14, 0.272, 0.082, 0.233, 0.111, 0.459, 0.083, 0.546, 0.457, 0.33, 0.177, 0.124, 0.284, 4e-3, 0.107, 0.215, 0.201, 0.017, 0.07, 0.083, 2e-3, 0.054, 9e-3, 3e-3, 1e-4, 9e-3, 3e-3, 7e-3, 1e-4, 8.338, 0.713, 0.405, 1.058, 6.922, 0.493, 1.121, 0.484, 5.37, 0.359, 1.684, 3.389, 1.726, 9.14, 4.981, 1.524, 0.032, 2.005, 4.201, 3.104, 1.485, 1.12, 1.14, 0.06, 3.565, 0.552, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.036, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 7e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.023, 1e-4, 1e-4, 2e-3, 2e-3, 1e-4, 1e-4, 0.04, 0.015, 8e-3, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 0.815, 0.088, 5e-3, 4e-3, 1e-4, 0.019, 2e-3, 4e-3, 1e-4, 5e-3, 0.398, 0.011, 3e-3, 1e-4, 1e-3, 1e-4, 1e-3, 2e-3, 4e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.04, 1.397, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.036, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hy": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.597, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.8, 1e-4, 0.032, 1e-4, 1e-4, 7e-3, 1e-4, 4e-3, 0.144, 0.144, 1e-4, 1e-3, 0.586, 0.166, 0.08, 0.013, 0.201, 0.284, 0.165, 0.087, 0.08, 0.086, 0.077, 0.075, 0.09, 0.155, 0.113, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.01, 7e-3, 0.01, 5e-3, 5e-3, 4e-3, 4e-3, 4e-3, 0.018, 2e-3, 2e-3, 5e-3, 8e-3, 5e-3, 4e-3, 6e-3, 1e-3, 5e-3, 0.011, 8e-3, 2e-3, 6e-3, 4e-3, 6e-3, 1e-3, 1e-3, 2e-3, 1e-4, 2e-3, 1e-4, 3e-3, 0.016, 0.046, 6e-3, 0.015, 0.015, 0.053, 8e-3, 9e-3, 0.013, 0.038, 1e-3, 5e-3, 0.027, 0.014, 0.034, 0.04, 8e-3, 1e-3, 0.036, 0.026, 0.029, 0.018, 5e-3, 4e-3, 2e-3, 8e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.414, 0.639, 1.93, 0.109, 0.557, 0.081, 0.132, 0.316, 0.027, 0.402, 0.05, 0.015, 0.042, 0.09, 0.048, 0.034, 2e-3, 4e-3, 2e-3, 0.02, 0.024, 0.021, 0.028, 1e-3, 1e-4, 1e-3, 1e-3, 3e-3, 1e-3, 0.123, 1e-3, 1e-4, 0.042, 6.697, 0.434, 0.595, 0.616, 2.608, 0.304, 0.502, 0.621, 0.7, 0.114, 2.81, 0.856, 0.261, 0.333, 1.634, 0.66, 0.29, 0.576, 0.139, 1.799, 1.257, 4.145, 0.346, 3.356, 0.233, 0.437, 0.354, 0.321, 1.025, 1.123, 1.395, 1e-4, 1e-4, 0.223, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 0.029, 0.01, 1e-4, 1e-4, 0.652, 36.534, 7.186, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.026, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "hz": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 25, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.667, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 8.333, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ia": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.646, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.141, 2e-3, 0.329, 1e-4, 1e-4, 8e-3, 1e-3, 0.021, 0.18, 0.18, 1e-3, 3e-3, 1.016, 0.166, 0.808, 0.013, 0.184, 0.275, 0.136, 0.08, 0.078, 0.085, 0.074, 0.075, 0.088, 0.135, 0.073, 0.032, 2e-3, 3e-3, 2e-3, 2e-3, 1e-4, 0.226, 0.141, 0.296, 0.096, 0.165, 0.073, 0.096, 0.067, 0.304, 0.056, 0.03, 0.329, 0.174, 0.087, 0.056, 0.186, 0.016, 0.106, 0.253, 0.115, 0.079, 0.078, 0.031, 0.017, 9e-3, 0.016, 0.018, 1e-4, 0.018, 1e-4, 6e-3, 1e-4, 7.783, 0.726, 2.95, 2.701, 11.264, 0.558, 0.916, 0.687, 6.773, 0.133, 0.102, 4.659, 2.226, 5.924, 5.837, 2.221, 0.5, 4.607, 4.777, 5.188, 3.143, 1.186, 0.054, 0.19, 0.205, 0.091, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.033, 0.014, 5e-3, 3e-3, 3e-3, 2e-3, 1e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 0.01, 5e-3, 1e-3, 1e-3, 2e-3, 3e-3, 7e-3, 1e-3, 2e-3, 5e-3, 5e-3, 1e-3, 1e-3, 0.01, 0.02, 3e-3, 6e-3, 5e-3, 3e-3, 2e-3, 5e-3, 4e-3, 0.021, 3e-3, 0.011, 3e-3, 0.018, 2e-3, 2e-3, 5e-3, 0.011, 5e-3, 0.019, 2e-3, 2e-3, 5e-3, 2e-3, 4e-3, 5e-3, 9e-3, 0.012, 6e-3, 4e-3, 3e-3, 5e-3, 1e-4, 1e-4, 0.026, 0.115, 0.014, 6e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.019, 0.01, 9e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 5e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 9e-3, 0.031, 1e-3, 1e-3, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ie": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.521, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.809, 1e-3, 0.247, 1e-4, 1e-4, 4e-3, 6e-3, 0.019, 0.181, 0.18, 1e-3, 1e-4, 0.349, 1.199, 1.232, 0.019, 0.563, 0.838, 0.612, 0.225, 0.226, 0.24, 0.207, 0.206, 0.219, 0.382, 0.048, 5e-3, 6e-3, 1e-3, 6e-3, 1e-4, 1e-4, 0.309, 0.238, 0.27, 0.166, 0.167, 0.136, 0.184, 0.184, 0.432, 0.068, 0.108, 0.44, 0.245, 0.141, 0.106, 0.224, 0.013, 0.149, 0.37, 0.155, 0.122, 0.083, 0.052, 7e-3, 0.021, 0.046, 0.016, 1e-4, 0.017, 1e-4, 1e-4, 1e-4, 6.871, 0.75, 2.348, 2.768, 8.937, 0.584, 0.855, 0.832, 7.829, 0.174, 0.338, 4.504, 1.934, 5.948, 3.473, 1.445, 0.281, 4.186, 4.435, 5.077, 2.881, 0.926, 0.103, 0.2, 0.235, 0.149, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.011, 8e-3, 6e-3, 0.012, 4e-3, 2e-3, 1e-3, 0.038, 1e-3, 2e-3, 1e-4, 1e-3, 4e-3, 0.016, 1e-3, 1e-3, 4e-3, 3e-3, 1e-3, 4e-3, 2e-3, 1e-3, 2e-3, 3e-3, 2e-3, 5e-3, 2e-3, 3e-3, 2e-3, 2e-3, 2e-3, 0.01, 0.018, 0.107, 2e-3, 3e-3, 0.013, 3e-3, 2e-3, 4e-3, 7e-3, 0.34, 2e-3, 7e-3, 1e-3, 0.079, 1e-3, 1e-3, 0.011, 9e-3, 4e-3, 0.067, 3e-3, 5e-3, 0.02, 1e-3, 0.012, 1e-3, 0.025, 6e-3, 0.034, 9e-3, 0.011, 2e-3, 1e-4, 1e-4, 0.012, 0.714, 0.064, 0.047, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 7e-3, 4e-3, 0.047, 0.017, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 0.01, 6e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ig": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.656, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.908, 1e-4, 0.773, 1e-4, 1e-3, 2e-3, 4e-3, 0.323, 0.322, 0.321, 1e-3, 1e-4, 0.801, 0.348, 0.989, 9e-3, 0.349, 0.514, 0.434, 0.211, 0.141, 0.149, 0.14, 0.138, 0.136, 0.236, 0.05, 0.04, 2e-3, 2e-3, 2e-3, 2e-3, 1e-3, 0.437, 0.139, 0.167, 0.124, 0.161, 0.093, 0.162, 0.08, 0.189, 0.162, 0.069, 0.102, 0.246, 0.453, 0.257, 0.111, 6e-3, 0.081, 0.231, 0.102, 0.09, 0.023, 0.104, 6e-3, 0.033, 7e-3, 0.018, 1e-4, 0.018, 1e-4, 3e-3, 3e-3, 8.644, 2.249, 1.219, 1.734, 6.313, 0.761, 1.664, 1.979, 4.558, 0.257, 2.436, 1.453, 1.97, 6.1, 4.008, 0.966, 0.02, 3.332, 1.739, 2.408, 2.889, 0.225, 1.517, 0.034, 1.16, 0.258, 1e-4, 7e-3, 1e-3, 1e-4, 1e-4, 0.13, 0.024, 4e-3, 4e-3, 7e-3, 6e-3, 1e-3, 2e-3, 1e-3, 4e-3, 4e-3, 0.623, 0.118, 0.962, 1e-3, 1e-4, 2e-3, 1e-3, 4e-3, 0.022, 5e-3, 1e-3, 0.031, 2e-3, 1e-3, 0.082, 1e-3, 2e-3, 4e-3, 3e-3, 1e-4, 1e-4, 0.34, 0.233, 1e-3, 1e-3, 0.012, 1.142, 1e-3, 3e-3, 0.105, 0.2, 2e-3, 0.014, 0.036, 0.183, 0.028, 0.019, 4e-3, 4e-3, 0.029, 0.095, 2e-3, 1e-3, 9e-3, 1e-3, 3e-3, 0.143, 0.201, 2.836, 0.03, 1e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.146, 1.356, 9e-3, 0.021, 1e-4, 0.014, 0.039, 3e-3, 1e-4, 1e-3, 0.029, 1e-4, 5e-3, 1e-3, 8e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2.927, 0.109, 3e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ii": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.208, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.146, 1e-4, 1.029, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.343, 0.343, 1e-4, 1e-4, 1e-4, 1e-4, 0.686, 1e-4, 4.803, 0.172, 2.401, 1e-4, 1e-4, 0.172, 0.343, 0.686, 0.686, 0.343, 1e-4, 1e-4, 1e-4, 1e-4, 0.515, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.172, 1e-4, 0.172, 1e-4, 1e-4, 1e-4, 0.172, 0.858, 1e-4, 0.343, 0.343, 1e-4, 1e-4, 1e-4, 0.172, 1e-4, 1e-4, 1e-4, 0.343, 0.343, 0.343, 0.172, 1e-4, 0.172, 0.343, 1e-4, 0.515, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.172, 1e-4, 0.172, 1e-4, 1e-4, 2.573, 1.887, 1.544, 0.858, 2.058, 0.343, 1.715, 0.343, 0.343, 1e-4, 0.172, 1.201, 1.887, 1.029, 1.372, 0.172, 0.343, 1.029, 0.686, 0.172, 0.172, 0.172, 0.686, 0.858, 0.686, 0.172, 0.343, 1e-4, 0.515, 0.172, 0.343, 0.686, 0.343, 0.172, 1e-4, 1e-4, 0.343, 1e-4, 0.172, 1.544, 0.172, 0.343, 0.686, 0.858, 0.686, 0.858, 0.343, 0.686, 0.172, 0.343, 0.343, 0.515, 2.744, 0.172, 1e-4, 0.343, 0.858, 2.916, 0.343, 0.686, 0.343, 1e-4, 0.343, 0.172, 1e-4, 1e-4, 1.372, 1e-4, 0.172, 0.172, 1e-4, 1e-4, 1e-4, 0.172, 0.172, 1e-4, 0.515, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.515, 1.029, 4.631, 1.029, 0.686, 1e-4, 0.858, 10.635, 1e-4, 1e-4, 1e-4, 1e-4, 0.343, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ik": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.089, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.203, 1e-4, 1.053, 1e-4, 1e-4, 2e-3, 4e-3, 0.019, 1.043, 1.038, 1e-4, 4e-3, 0.489, 0.212, 1.246, 0.04, 0.17, 0.264, 0.162, 0.084, 0.065, 0.055, 0.132, 0.065, 0.076, 0.124, 0.136, 0.025, 0.013, 2e-3, 2e-3, 1e-4, 1e-4, 0.824, 0.109, 0.155, 0.065, 0.052, 0.025, 0.048, 0.076, 0.634, 0.073, 0.409, 0.111, 0.352, 0.545, 0.069, 0.285, 0.321, 0.155, 0.436, 0.755, 0.409, 0.076, 0.046, 8e-3, 0.044, 2e-3, 0.01, 1e-4, 0.015, 1e-4, 8e-3, 1e-4, 9.867, 0.308, 1.051, 0.799, 2.404, 0.327, 1.605, 1.011, 7.743, 0.063, 2.113, 2.725, 1.552, 3.495, 1.668, 1.101, 3.682, 2.526, 3.015, 4.496, 6.747, 0.801, 0.229, 0.065, 0.707, 0.103, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.097, 0.073, 0.183, 0.023, 6e-3, 0.031, 0.013, 0.103, 0.05, 8e-3, 4e-3, 0.952, 0.019, 0.055, 2e-3, 0.023, 0.013, 8e-3, 1e-4, 2e-3, 8e-3, 0.067, 0.013, 0.015, 4e-3, 2e-3, 0.04, 0.01, 0.017, 0.01, 2e-3, 0.019, 0.013, 0.843, 0.013, 0.029, 1.206, 0.281, 0.025, 6e-3, 0.067, 6e-3, 0.055, 4e-3, 0.038, 0.017, 0.078, 0.034, 0.172, 0.862, 0.059, 0.01, 0.01, 0.067, 8e-3, 0.187, 0.269, 0.134, 0.055, 0.021, 0.038, 0.019, 0.189, 0.046, 1e-4, 1e-4, 8e-3, 0.944, 0.835, 1.051, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 6e-3, 8e-3, 1e-4, 0.025, 0.023, 0.42, 0.185, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.408, 0.191, 0.013, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ilo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.301, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.793, 0.111, 0.271, 1e-4, 1e-3, 8e-3, 1e-3, 0.018, 0.172, 0.172, 3e-3, 3e-3, 0.83, 0.304, 0.649, 8e-3, 0.21, 0.325, 0.155, 0.097, 0.09, 0.094, 0.083, 0.085, 0.1, 0.166, 0.048, 0.03, 5e-3, 1e-3, 5e-3, 1e-3, 1e-4, 0.349, 0.225, 0.111, 0.217, 0.099, 0.09, 0.118, 0.1, 0.241, 0.035, 0.175, 0.118, 0.232, 0.163, 0.054, 0.279, 9e-3, 0.088, 0.233, 0.461, 0.072, 0.035, 0.029, 6e-3, 0.014, 0.012, 0.036, 1e-4, 0.036, 1e-4, 1e-3, 1e-4, 16.461, 1.586, 0.189, 2.856, 3.734, 0.046, 3.664, 0.306, 10.008, 0.024, 3.303, 2.245, 1.909, 7.066, 3.393, 2.095, 0.012, 2.409, 3.066, 6.078, 2.307, 0.067, 0.549, 0.014, 1.361, 0.048, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 0.043, 6e-3, 3e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 0.033, 4e-3, 1e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 0.015, 7e-3, 1e-3, 1e-3, 3e-3, 2e-3, 1e-3, 3e-3, 2e-3, 9e-3, 2e-3, 4e-3, 1e-3, 6e-3, 2e-3, 1e-3, 0.013, 7e-3, 3e-3, 7e-3, 4e-3, 1e-3, 3e-3, 1e-3, 4e-3, 2e-3, 4e-3, 2e-3, 3e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.027, 0.049, 8e-3, 9e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 7e-3, 4e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 4e-3, 0.043, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "io": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.24, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.878, 1e-3, 0.226, 1e-4, 0.145, 0.683, 1e-3, 0.155, 0.19, 0.19, 2e-3, 1e-3, 1.502, 0.399, 2.049, 0.127, 1.123, 1.116, 0.845, 0.565, 0.593, 0.586, 0.516, 0.395, 0.578, 0.496, 0.056, 0.039, 8e-3, 1e-3, 8e-3, 1e-3, 1e-4, 0.262, 0.119, 0.082, 0.063, 0.203, 0.065, 0.07, 0.089, 0.077, 0.042, 0.131, 0.387, 0.144, 0.086, 0.052, 0.185, 6e-3, 0.067, 0.238, 0.064, 0.127, 0.06, 0.027, 2e-3, 0.018, 7e-3, 8e-3, 1e-4, 8e-3, 1e-4, 1e-3, 1e-4, 8.848, 0.82, 0.665, 2.487, 7.044, 0.592, 0.8, 0.82, 7.741, 0.211, 1.575, 3.65, 2.435, 4.587, 5.58, 1.431, 0.273, 4.484, 4.553, 2.971, 2.4, 1.482, 0.052, 0.098, 0.514, 0.499, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.011, 8e-3, 4e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 3e-3, 2e-3, 1e-3, 1e-4, 2e-3, 1e-3, 4e-3, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 0.096, 0.01, 1e-3, 3e-3, 3e-3, 1e-3, 1e-3, 3e-3, 2e-3, 0.015, 1e-3, 4e-3, 1e-3, 8e-3, 1e-3, 1e-3, 5e-3, 3e-3, 0.253, 6e-3, 2e-3, 2e-3, 3e-3, 1e-3, 3e-3, 2e-3, 4e-3, 5e-3, 3e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.356, 0.056, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 5e-3, 3e-3, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.01, 6e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "is": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.97, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.586, 1e-3, 0.206, 1e-4, 1e-4, 8e-3, 2e-3, 7e-3, 0.124, 0.124, 1e-4, 1e-3, 0.499, 0.123, 1.026, 0.011, 0.247, 0.371, 0.182, 0.092, 0.087, 0.097, 0.09, 0.091, 0.11, 0.206, 0.046, 0.01, 8e-3, 3e-3, 8e-3, 1e-3, 1e-4, 0.15, 0.156, 0.07, 0.071, 0.123, 0.128, 0.099, 0.219, 0.049, 0.069, 0.114, 0.102, 0.145, 0.086, 0.033, 0.076, 3e-3, 0.091, 0.275, 0.089, 0.03, 0.081, 0.029, 9e-3, 0.012, 6e-3, 3e-3, 1e-4, 3e-3, 1e-4, 4e-3, 1e-4, 6.834, 0.671, 0.132, 1.35, 4.383, 2.01, 2.575, 1.208, 5.351, 0.788, 2.14, 3.293, 2.549, 5.87, 1.807, 0.609, 5e-3, 6.508, 4.164, 3.597, 3.384, 1.444, 0.036, 0.05, 0.678, 0.023, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.079, 0.071, 3e-3, 2e-3, 2e-3, 1e-3, 4e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 0.093, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 0.031, 2e-3, 1e-3, 0.01, 1e-3, 1e-3, 1e-3, 8e-3, 1e-3, 0.029, 3e-3, 0.162, 1e-3, 7e-3, 1.147, 1e-3, 1e-3, 3e-3, 1e-3, 0.559, 2e-3, 2e-3, 0.221, 1e-3, 1e-3, 1e-3, 1.194, 1e-3, 1e-3, 2.653, 2e-3, 3e-3, 0.801, 2e-3, 2e-3, 0.588, 1e-3, 4e-3, 2e-3, 0.419, 2e-3, 5e-3, 0.183, 0.658, 1e-3, 1e-4, 1e-4, 0.014, 8.751, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 4e-3, 0.011, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.079, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "iu": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.678, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.59, 2e-3, 0.2, 1e-3, 3e-3, 2e-3, 3e-3, 0.015, 0.174, 0.173, 1e-4, 2e-3, 0.361, 0.227, 0.729, 0.057, 0.148, 0.113, 0.088, 0.041, 0.055, 0.057, 0.038, 0.037, 0.041, 0.075, 0.086, 0.012, 0.034, 7e-3, 0.037, 2e-3, 1e-3, 0.071, 0.015, 0.028, 0.016, 0.027, 0.021, 0.01, 0.09, 0.106, 0.011, 0.032, 0.025, 0.039, 0.045, 0.015, 0.038, 0.016, 9e-3, 0.047, 0.052, 0.031, 8e-3, 0.018, 2e-3, 4e-3, 1e-4, 0.042, 1e-3, 0.038, 1e-4, 5e-3, 1e-4, 3.23, 0.132, 0.269, 0.325, 0.963, 0.137, 0.72, 0.796, 3.179, 0.121, 0.846, 1.083, 0.73, 1.94, 0.65, 0.417, 0.773, 0.909, 0.645, 2.138, 2.24, 0.378, 0.125, 0.018, 0.352, 9e-3, 0.063, 0.016, 0.064, 1e-4, 1e-4, 0.195, 0.104, 0.722, 2.277, 0.527, 2.845, 0.283, 0.577, 0.292, 0.16, 1.105, 0.322, 0.08, 0.107, 0.751, 0.183, 5.797, 4.461, 2.284, 5.133, 1.078, 2.99, 2.939, 0.631, 0.063, 0.2, 0.245, 0.066, 7e-3, 0.045, 4e-3, 5e-3, 0.011, 0.073, 0.039, 9e-3, 0.018, 0.411, 1.389, 0.092, 0.103, 0.04, 1.113, 0.086, 8e-3, 0.439, 0.043, 0.681, 0.098, 0.475, 0.284, 0.202, 0.231, 0.064, 0.012, 3e-3, 0.129, 0.126, 9e-3, 0.223, 7e-3, 0.015, 0.041, 0.125, 1e-4, 1e-4, 0.1, 0.024, 4e-3, 6e-3, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 4e-3, 2e-3, 1e-4, 1e-4, 1e-3, 0.131, 0.044, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 9e-3, 0.014, 7e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 21.14, 0.181, 3e-3, 4e-3, 4e-3, 4e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "jam": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.114, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.204, 1e-4, 0.437, 1e-4, 2e-3, 0.015, 1e-3, 0.02, 0.246, 0.245, 1e-4, 1e-3, 1.286, 0.238, 0.848, 0.011, 0.225, 0.262, 0.144, 0.074, 0.072, 0.083, 0.075, 0.089, 0.083, 0.132, 0.047, 0.038, 0.014, 2e-3, 0.014, 2e-3, 1e-4, 0.33, 0.18, 0.107, 0.273, 0.095, 0.097, 0.106, 0.027, 0.375, 0.206, 0.243, 0.122, 0.218, 0.135, 0.052, 0.177, 4e-3, 0.132, 0.376, 0.091, 0.038, 0.042, 0.116, 3e-3, 0.09, 9e-3, 0.033, 1e-4, 0.032, 1e-4, 1e-4, 1e-4, 11.751, 1.124, 0.777, 3.113, 4.403, 1.279, 0.882, 3.07, 11.71, 0.554, 2.318, 3.164, 2.271, 5.696, 3.101, 1.655, 6e-3, 3.113, 3.636, 3.486, 2.985, 0.575, 1.126, 0.207, 0.616, 0.737, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.054, 0.013, 6e-3, 6e-3, 0.011, 5e-3, 6e-3, 2e-3, 0.011, 4e-3, 3e-3, 2e-3, 5e-3, 4e-3, 4e-3, 1e-3, 5e-3, 3e-3, 3e-3, 0.026, 9e-3, 2e-3, 1e-3, 3e-3, 1e-3, 5e-3, 1e-3, 3e-3, 8e-3, 8e-3, 1e-3, 1e-4, 0.066, 9e-3, 1e-3, 4e-3, 0.01, 5e-3, 3e-3, 8e-3, 9e-3, 9e-3, 7e-3, 5e-3, 5e-3, 9e-3, 3e-3, 8e-3, 5e-3, 0.014, 4e-3, 0.031, 2e-3, 5e-3, 2e-3, 3e-3, 6e-3, 9e-3, 8e-3, 6e-3, 7e-3, 7e-3, 4e-3, 9e-3, 1e-4, 1e-4, 0.069, 0.057, 0.012, 6e-3, 1e-4, 1e-3, 1e-4, 0.011, 4e-3, 0.01, 1e-3, 1e-4, 0.049, 0.024, 9e-3, 4e-3, 1e-4, 1e-4, 1e-4, 7e-3, 2e-3, 4e-3, 0.025, 0.021, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.017, 8e-3, 0.051, 1e-4, 2e-3, 4e-3, 3e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "jbo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.007, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 18.83, 1e-4, 0.137, 1e-4, 1e-4, 1e-3, 1e-4, 3.634, 0.016, 0.016, 1e-4, 1e-4, 0.047, 0.014, 2.419, 8e-3, 0.161, 0.318, 0.2, 0.098, 0.09, 0.087, 0.087, 0.089, 0.108, 0.172, 4e-3, 1e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 0.035, 0.022, 0.028, 0.013, 0.017, 0.01, 0.012, 0.013, 0.015, 0.011, 0.012, 0.019, 0.022, 0.019, 0.015, 0.017, 1e-3, 0.021, 0.029, 0.019, 6e-3, 6e-3, 8e-3, 2e-3, 2e-3, 4e-3, 2e-3, 1e-4, 3e-3, 1e-4, 3e-3, 1e-4, 7.616, 1.669, 2.73, 1.665, 6.288, 0.906, 1.481, 0.055, 8.607, 1.326, 2.153, 5.868, 2.296, 4.062, 6.049, 1.389, 4e-3, 2.945, 3.13, 2.492, 4.934, 0.679, 0.018, 0.589, 0.829, 0.701, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 0.01, 6e-3, 6e-3, 0.011, 5e-3, 3e-3, 4e-3, 8e-3, 3e-3, 8e-3, 3e-3, 3e-3, 2e-3, 2e-3, 2e-3, 3e-3, 2e-3, 1e-3, 3e-3, 4e-3, 4e-3, 1e-3, 2e-3, 1e-3, 6e-3, 1e-3, 2e-3, 2e-3, 2e-3, 1e-3, 2e-3, 3e-3, 6e-3, 2e-3, 3e-3, 5e-3, 3e-3, 6e-3, 0.013, 6e-3, 0.012, 5e-3, 3e-3, 5e-3, 8e-3, 3e-3, 5e-3, 0.01, 0.01, 7e-3, 8e-3, 3e-3, 8e-3, 2e-3, 3e-3, 0.01, 5e-3, 0.017, 7e-3, 5e-3, 5e-3, 4e-3, 3e-3, 1e-4, 1e-4, 4e-3, 0.032, 5e-3, 3e-3, 1e-4, 1e-4, 1e-4, 6e-3, 4e-3, 4e-3, 2e-3, 1e-4, 0.016, 8e-3, 0.046, 0.017, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 7e-3, 0.035, 0.026, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.02, 6e-3, 7e-3, 5e-3, 1e-3, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "jv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.393, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.972, 2e-3, 0.376, 1e-4, 1e-3, 6e-3, 2e-3, 0.021, 0.174, 0.174, 1e-4, 2e-3, 1.038, 0.248, 0.884, 0.027, 0.242, 0.269, 0.17, 0.077, 0.072, 0.083, 0.071, 0.073, 0.084, 0.157, 0.063, 0.014, 5e-3, 4e-3, 5e-3, 1e-3, 1e-4, 0.298, 0.282, 0.139, 0.175, 0.052, 0.071, 0.122, 0.1, 0.279, 0.193, 0.491, 0.137, 0.261, 0.155, 0.054, 0.404, 8e-3, 0.134, 0.426, 0.252, 0.063, 0.039, 0.13, 7e-3, 0.04, 0.014, 0.024, 1e-4, 0.024, 1e-4, 1e-3, 1e-4, 13.56, 1.271, 0.49, 2.178, 3.499, 0.191, 4.675, 1.646, 6.887, 0.617, 3.65, 2.625, 2.089, 9.349, 2.312, 1.888, 0.011, 3.362, 3.296, 3.086, 3.992, 0.185, 1.217, 0.022, 0.792, 0.054, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.032, 7e-3, 5e-3, 3e-3, 5e-3, 4e-3, 3e-3, 3e-3, 5e-3, 0.012, 2e-3, 1e-3, 1e-3, 4e-3, 5e-3, 2e-3, 3e-3, 2e-3, 3e-3, 0.01, 3e-3, 2e-3, 1e-3, 1e-3, 3e-3, 7e-3, 1e-3, 3e-3, 6e-3, 6e-3, 1e-3, 1e-3, 0.039, 4e-3, 2e-3, 3e-3, 6e-3, 5e-3, 4e-3, 6e-3, 0.531, 1.186, 5e-3, 3e-3, 2e-3, 5e-3, 2e-3, 2e-3, 7e-3, 6e-3, 5e-3, 6e-3, 2e-3, 2e-3, 2e-3, 1e-3, 8e-3, 5e-3, 3e-3, 2e-3, 4e-3, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.048, 1.757, 0.01, 0.01, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 7e-3, 3e-3, 9e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.015, 0.024, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 5e-3, 0.031, 1e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ka": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.399, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.467, 6e-3, 0.05, 4e-3, 1e-4, 5e-3, 1e-4, 2e-3, 0.08, 0.08, 1e-4, 1e-3, 0.389, 0.146, 0.411, 4e-3, 0.126, 0.165, 0.095, 0.049, 0.046, 0.05, 0.043, 0.044, 0.053, 0.091, 0.022, 0.014, 1e-3, 4e-3, 1e-3, 1e-3, 1e-4, 9e-3, 8e-3, 0.011, 6e-3, 4e-3, 5e-3, 5e-3, 4e-3, 0.036, 1e-3, 2e-3, 5e-3, 8e-3, 5e-3, 4e-3, 7e-3, 1e-3, 5e-3, 0.01, 0.01, 2e-3, 0.01, 3e-3, 0.012, 1e-3, 1e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 0.058, 9e-3, 0.021, 0.031, 0.066, 0.012, 0.013, 0.018, 0.047, 1e-3, 9e-3, 0.032, 0.017, 0.042, 0.05, 0.013, 1e-3, 0.044, 0.039, 0.037, 0.025, 6e-3, 4e-3, 3e-3, 0.014, 2e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.133, 1e-3, 1e-3, 30.616, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.203, 1.072, 0.617, 1.27, 2.811, 0.901, 0.251, 0.727, 3.846, 0.492, 1.468, 1.522, 1.35, 1.641, 0.3, 0.022, 1.853, 2.198, 0.578, 0.828, 0.251, 0.28, 0.142, 0.172, 0.523, 0.1, 0.36, 0.118, 0.305, 0.039, 0.412, 0.073, 0.048, 1e-3, 9e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.023, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.013, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 30.616, 0.133, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kaa": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.138, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.976, 2e-3, 0.25, 1e-4, 1e-4, 0.021, 1e-3, 3.483, 0.188, 0.189, 1e-4, 5e-3, 0.857, 0.333, 1.07, 0.015, 0.261, 0.313, 0.191, 0.105, 0.096, 0.102, 0.088, 0.083, 0.102, 0.171, 0.072, 0.024, 0.027, 2e-3, 0.027, 4e-3, 1e-4, 0.278, 0.237, 0.043, 0.064, 0.083, 0.059, 0.068, 0.047, 0.074, 0.082, 0.125, 0.051, 0.155, 0.064, 0.155, 0.081, 0.145, 0.091, 0.217, 0.129, 0.07, 0.048, 0.02, 0.093, 0.029, 0.015, 6e-3, 1e-4, 6e-3, 1e-4, 1e-3, 0.174, 10.672, 1.536, 0.082, 2.608, 4.846, 0.175, 1.712, 1.492, 6.03, 0.848, 1.882, 4.983, 2.176, 5.612, 2.458, 1.187, 1.824, 4.354, 3.602, 3.336, 1.517, 0.264, 0.926, 0.28, 1.912, 0.845, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.223, 8e-3, 8e-3, 8e-3, 5e-3, 3e-3, 2e-3, 3e-3, 3e-3, 1e-3, 2e-3, 4e-3, 2e-3, 2e-3, 2e-3, 3e-3, 8e-3, 1e-3, 2e-3, 0.024, 0.089, 3e-3, 0.024, 1e-3, 7e-3, 0.086, 2e-3, 2e-3, 0.011, 8e-3, 5e-3, 0.018, 0.016, 6e-3, 3e-3, 7e-3, 7e-3, 2e-3, 1e-3, 6e-3, 3e-3, 4e-3, 2e-3, 0.012, 2e-3, 6e-3, 1e-3, 9e-3, 0.142, 4.113, 8e-3, 7e-3, 5e-3, 0.049, 5e-3, 2e-3, 0.01, 3e-3, 9e-3, 0.024, 9e-3, 0.012, 0.029, 3e-3, 1e-4, 1e-4, 0.053, 0.053, 4.15, 0.014, 1e-4, 2e-3, 1e-4, 1e-3, 4e-3, 1e-4, 1e-4, 1e-4, 9e-3, 3e-3, 0.235, 0.052, 4e-3, 1e-3, 1e-3, 3e-3, 1e-4, 2e-3, 0.013, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 6e-3, 0.216, 1e-4, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kab": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.63, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.911, 0.026, 0.321, 1e-4, 1e-4, 4e-3, 1e-3, 0.063, 0.372, 0.372, 3e-3, 2e-3, 1.155, 1.35, 0.936, 0.038, 0.266, 0.305, 0.202, 0.119, 0.101, 0.107, 0.102, 0.091, 0.121, 0.181, 0.18, 0.035, 0.01, 0.019, 0.017, 0.012, 1e-4, 0.467, 0.145, 0.091, 0.191, 0.038, 0.078, 0.046, 0.038, 0.257, 0.025, 0.056, 0.211, 0.226, 0.079, 0.026, 0.046, 0.014, 0.063, 0.175, 0.468, 0.109, 0.016, 0.087, 0.018, 0.161, 0.062, 0.014, 1e-4, 0.014, 1e-4, 0.076, 1e-4, 9.2, 0.865, 0.672, 3.845, 7.769, 0.911, 1.711, 0.292, 5.622, 0.162, 1.372, 2.877, 2.842, 6.403, 0.445, 0.148, 0.603, 3.37, 3.532, 4.882, 2.937, 0.09, 1.486, 0.181, 2.148, 0.956, 1e-4, 0.011, 1e-4, 1e-4, 1e-4, 0.079, 4e-3, 4e-3, 3e-3, 0.012, 7e-3, 8e-3, 3e-3, 6e-3, 0.01, 0.01, 1e-4, 3e-3, 0.341, 7e-3, 6e-3, 0.04, 2e-3, 3e-3, 0.156, 0.017, 1e-3, 2e-3, 1e-3, 4e-3, 0.031, 7e-3, 0.42, 0.023, 0.016, 2e-3, 9e-3, 0.025, 4e-3, 0.015, 1.13, 0.027, 0.269, 0.019, 0.099, 0.024, 0.093, 7e-3, 0.018, 0.013, 0.276, 2e-3, 0.011, 0.014, 0.01, 6e-3, 0.129, 0.025, 0.113, 1e-3, 5e-3, 0.586, 0.529, 0.15, 0.021, 4e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.056, 0.149, 0.056, 0.01, 0.05, 0.088, 1e-4, 1.3, 1e-3, 1e-3, 3e-3, 1e-4, 0.203, 1e-3, 7e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 8e-3, 0.063, 0.048, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1.257, 0.143, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kbd": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.877, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.792, 1e-4, 0.075, 1e-4, 1e-3, 0.011, 1e-4, 3e-3, 0.141, 0.14, 1e-4, 3e-3, 0.771, 0.205, 0.683, 4e-3, 0.136, 0.165, 0.088, 0.057, 0.049, 0.062, 0.042, 0.043, 0.05, 0.078, 0.043, 0.017, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 2e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.304, 1e-4, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 3e-3, 1e-4, 1e-3, 2e-3, 1e-3, 1e-3, 8e-3, 1e-3, 0.014, 1e-4, 1e-4, 8e-3, 1e-4, 8e-3, 1e-4, 1e-4, 1e-4, 0.03, 3e-3, 8e-3, 7e-3, 0.025, 2e-3, 5e-3, 7e-3, 0.023, 1e-3, 3e-3, 0.195, 0.01, 0.018, 0.016, 7e-3, 1e-3, 0.016, 0.015, 0.015, 0.012, 2e-3, 2e-3, 1e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.555, 0.735, 0.993, 2.937, 0.251, 2.403, 0.222, 0.078, 0.401, 1.056, 2.895, 2.991, 0.659, 6.305, 5e-3, 0.318, 0.209, 0.078, 0.019, 0.048, 0.196, 0.035, 0.012, 0.035, 0.104, 3e-3, 0.214, 0.042, 0.072, 0.044, 9e-3, 0.068, 0.044, 0.057, 0.06, 0.06, 0.029, 0.076, 0.012, 0.013, 0.04, 0.033, 1e-3, 0.031, 1e-3, 0.015, 2e-3, 0.026, 2.293, 0.626, 0.124, 1.164, 0.956, 0.819, 0.63, 0.861, 1.412, 0.263, 1.894, 1.024, 2.202, 1.111, 0.541, 0.996, 1e-4, 1e-4, 0.089, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 7e-3, 1e-3, 5e-3, 2e-3, 18.347, 24.31, 1e-3, 1.322, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 3e-3, 0.144, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kbp": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.616, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.57, 2e-3, 0.071, 1e-4, 1e-4, 2e-3, 1e-4, 6e-3, 0.116, 0.115, 1e-4, 2e-3, 0.667, 0.749, 0.841, 3e-3, 0.17, 0.215, 0.112, 0.059, 0.061, 0.065, 0.059, 0.058, 0.083, 0.103, 0.043, 0.02, 1e-4, 0.014, 1e-4, 2e-3, 1e-4, 0.165, 0.045, 0.077, 0.029, 0.079, 0.067, 0.032, 0.069, 0.044, 0.029, 0.18, 0.072, 0.11, 0.068, 0.032, 0.297, 2e-3, 0.044, 0.127, 0.122, 0.017, 0.016, 0.035, 3e-3, 0.036, 6e-3, 0.025, 1e-4, 0.025, 1e-4, 1e-4, 1e-4, 8.914, 0.693, 0.409, 0.775, 2.26, 0.236, 0.534, 0.509, 1.986, 0.346, 2.598, 2.297, 1.559, 3.608, 1.061, 1.995, 0.02, 0.616, 1.735, 2.888, 0.861, 0.082, 0.914, 0.015, 2.587, 0.783, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.019, 0.022, 2e-3, 3e-3, 0.114, 1e-3, 2e-3, 1e-3, 2e-3, 0.067, 2.039, 2.33, 2e-3, 2e-3, 1e-3, 1e-4, 0.179, 0.013, 1e-3, 1e-3, 2.735, 1e-3, 1.381, 1e-4, 1e-3, 7e-3, 1e-4, 5.08, 4e-3, 3e-3, 1e-4, 1e-4, 4e-3, 8e-3, 5e-3, 1.151, 3e-3, 1e-3, 1e-3, 4e-3, 0.013, 4.529, 2e-3, 0.019, 1e-3, 4e-3, 3e-3, 7e-3, 3e-3, 0.207, 3e-3, 2e-3, 3e-3, 2e-3, 3e-3, 1e-3, 6e-3, 3e-3, 2e-3, 0.02, 3e-3, 2e-3, 2e-3, 6e-3, 1e-4, 1e-4, 0.035, 0.33, 4e-3, 1.069, 0.247, 1e-3, 1e-4, 14.815, 3.312, 1e-3, 0.128, 1e-4, 0.011, 6e-3, 9e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 7e-3, 0.013, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kg": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.239, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.886, 7e-3, 0.336, 1e-4, 1e-4, 0.012, 2e-3, 0.078, 0.324, 0.324, 1e-3, 2e-3, 0.656, 0.558, 1.416, 0.029, 0.129, 0.236, 0.138, 0.114, 0.084, 0.072, 0.081, 0.089, 0.086, 0.136, 0.151, 2e-3, 0.018, 6e-3, 0.018, 4e-3, 1e-4, 0.545, 0.514, 0.255, 0.205, 0.262, 0.18, 0.131, 0.1, 0.152, 0.059, 0.708, 0.293, 0.752, 0.533, 0.094, 0.176, 0.01, 0.241, 0.354, 0.199, 0.108, 0.106, 0.05, 6e-3, 0.156, 0.054, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-3, 12.562, 2.277, 0.331, 1.547, 5.722, 0.691, 1.741, 0.399, 6.386, 0.118, 3.863, 3.599, 2.582, 6.478, 2.883, 0.88, 0.049, 1.355, 2.305, 2.139, 4.827, 0.445, 0.58, 0.051, 3.145, 1.337, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.071, 0.012, 3e-3, 2e-3, 0.01, 4e-3, 3e-3, 1e-3, 4e-3, 5e-3, 3e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 6e-3, 1e-3, 1e-3, 0.062, 6e-3, 2e-3, 1e-4, 1e-3, 1e-3, 9e-3, 2e-3, 4e-3, 2e-3, 1e-3, 1e-3, 1e-3, 0.037, 0.129, 0.127, 6e-3, 6e-3, 2e-3, 0.017, 0.018, 0.037, 0.077, 0.018, 0.027, 2e-3, 0.034, 0.066, 7e-3, 0.011, 0.023, 5e-3, 0.025, 0.156, 2e-3, 1e-3, 3e-3, 3e-3, 2e-3, 0.014, 0.066, 0.013, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.038, 0.798, 7e-3, 0.01, 1e-4, 1e-4, 1e-4, 0.013, 6e-3, 4e-3, 1e-4, 1e-3, 0.012, 4e-3, 9e-3, 6e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 0.021, 0.018, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.016, 7e-3, 0.069, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 5e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ki": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.157, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.033, 1e-3, 0.1, 1e-3, 1e-4, 2e-3, 5e-3, 0.051, 0.116, 0.115, 1e-4, 1e-4, 0.384, 0.122, 1.505, 0.04, 0.182, 0.215, 0.151, 0.09, 0.071, 0.091, 0.067, 0.064, 0.059, 0.089, 0.065, 3e-3, 6e-3, 2e-3, 8e-3, 0.01, 1e-4, 0.273, 0.233, 0.763, 0.125, 0.089, 0.072, 0.168, 0.139, 0.145, 0.105, 0.364, 0.123, 0.376, 0.291, 0.066, 0.138, 0.046, 0.111, 0.252, 0.278, 0.132, 0.045, 0.093, 0.048, 0.079, 0.058, 0.02, 1e-4, 0.02, 1e-4, 0.015, 1e-4, 10.33, 0.786, 1.541, 0.901, 3.961, 0.163, 2.604, 2.426, 8.641, 0.326, 1.916, 0.633, 2.867, 6.576, 3.627, 0.309, 0.068, 4.492, 0.79, 3.938, 2.525, 0.104, 1.397, 0.085, 2.472, 0.26, 3e-3, 1e-4, 3e-3, 1e-4, 1e-4, 0.05, 3e-3, 2e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.037, 0.01, 1e-4, 1e-3, 3e-3, 1e-4, 1e-3, 1e-3, 0.013, 5e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 0.06, 4.809, 1e-4, 0.069, 2e-3, 6e-3, 1e-3, 4e-3, 0.016, 0.25, 1e-4, 9e-3, 3e-3, 2e-3, 1e-4, 9e-3, 3e-3, 1e-3, 3e-3, 0.026, 3e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.021, 0.032, 2.884, 2.321, 1e-4, 2e-3, 1e-4, 2e-3, 0.021, 1e-3, 1e-4, 1e-4, 2e-3, 1e-3, 9e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 0.048, 1e-4, 1e-4, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kj": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.677, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.71, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.323, 0.323, 1e-4, 1e-4, 0.645, 1e-4, 0.323, 1e-4, 1.613, 1e-4, 0.323, 0.323, 1e-4, 1e-4, 0.645, 0.323, 1e-4, 1e-4, 0.968, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 1e-4, 1e-4, 0.645, 1e-4, 1e-4, 0.323, 1e-4, 2.903, 0.323, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.097, 3.226, 1e-4, 6.774, 6.774, 1.935, 1.29, 2.903, 10.645, 1e-4, 3.226, 3.226, 6.129, 2.581, 8.065, 0.323, 1e-4, 1e-4, 0.968, 0.323, 1.935, 0.645, 2.581, 1e-4, 0.323, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kk": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.706, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.721, 1e-3, 0.107, 1e-3, 1e-4, 6e-3, 1e-4, 2e-3, 0.151, 0.153, 1e-3, 3e-3, 0.51, 0.246, 0.686, 0.019, 0.221, 0.251, 0.17, 0.104, 0.092, 0.099, 0.09, 0.082, 0.09, 0.149, 0.04, 0.015, 2e-3, 3e-3, 2e-3, 2e-3, 1e-4, 7e-3, 6e-3, 0.025, 3e-3, 0.016, 5e-3, 0.021, 2e-3, 0.024, 1e-3, 2e-3, 3e-3, 8e-3, 0.018, 4e-3, 0.01, 1e-4, 4e-3, 0.021, 3e-3, 3e-3, 4e-3, 4e-3, 5e-3, 1e-3, 3e-3, 3e-3, 1e-4, 3e-3, 1e-4, 2e-3, 1e-4, 0.029, 5e-3, 0.01, 8e-3, 0.028, 4e-3, 5e-3, 7e-3, 0.042, 1e-4, 4e-3, 0.014, 9e-3, 0.02, 0.023, 7e-3, 1e-4, 0.021, 0.015, 0.017, 0.01, 3e-3, 3e-3, 1e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.667, 1.698, 2.42, 0.825, 0.088, 0.097, 0.101, 0.026, 0.573, 4e-3, 8e-3, 3.51, 0.092, 0.043, 0.029, 0.226, 0.151, 0.105, 0.034, 0.789, 0.175, 0.042, 2.128, 9e-3, 0.046, 0.288, 0.211, 1.223, 0.099, 0.041, 0.082, 0.052, 0.093, 0.104, 0.084, 0.646, 0.032, 0.032, 3e-3, 7e-3, 0.066, 0.363, 1e-4, 0.047, 1e-3, 0.014, 0.013, 0.268, 5.447, 1.26, 0.188, 0.541, 1.919, 3.092, 0.668, 0.583, 0.903, 0.603, 1.169, 2.242, 1.309, 3.102, 1.26, 0.548, 1e-4, 1e-4, 0.145, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 25.612, 14.266, 3.356, 0.697, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.197, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.635, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.811, 1e-3, 0.341, 1e-4, 1e-4, 6e-3, 2e-3, 0.029, 0.34, 0.34, 2e-3, 1e-3, 0.7, 0.575, 1.063, 0.02, 0.29, 0.457, 0.333, 0.207, 0.125, 0.141, 0.14, 0.129, 0.134, 0.187, 0.161, 0.026, 8e-3, 5e-3, 8e-3, 1e-4, 1e-4, 0.28, 0.09, 0.107, 0.095, 0.075, 0.086, 0.052, 0.078, 0.183, 0.108, 0.243, 0.074, 0.184, 0.254, 0.06, 0.118, 0.079, 0.062, 0.257, 0.166, 0.177, 0.059, 0.032, 2e-3, 0.012, 0.015, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 12.711, 0.276, 0.184, 0.432, 3.419, 0.731, 1.669, 0.268, 10.409, 0.217, 2.335, 4.586, 2.81, 6.778, 2.817, 1.735, 2.883, 5.126, 5.68, 6.217, 6.675, 0.652, 0.054, 0.023, 0.144, 0.055, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.031, 0.035, 0.014, 0.011, 0.03, 0.017, 0.013, 7e-3, 0.019, 3e-3, 0.015, 2e-3, 0.011, 8e-3, 0.02, 4e-3, 0.014, 0.011, 7e-3, 0.013, 7e-3, 0.01, 0.01, 0.01, 8e-3, 0.016, 5e-3, 5e-3, 9e-3, 4e-3, 4e-3, 6e-3, 0.015, 0.021, 0.01, 0.011, 0.03, 0.03, 0.045, 0.038, 0.021, 0.031, 0.02, 0.014, 7e-3, 0.018, 5e-3, 0.016, 0.035, 0.027, 0.022, 0.024, 0.011, 0.015, 0.016, 9e-3, 0.078, 0.018, 0.016, 0.011, 0.01, 0.011, 0.018, 0.012, 1e-4, 1e-4, 0.012, 0.201, 0.031, 0.017, 1e-3, 1e-3, 1e-4, 4e-3, 4e-3, 4e-3, 4e-3, 1e-4, 0.016, 8e-3, 0.085, 0.031, 1e-4, 1e-3, 1e-4, 1e-4, 0.024, 0.053, 0.13, 0.094, 7e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.065, 0.039, 0.022, 1e-4, 1e-3, 0.011, 7e-3, 1e-3, 1e-3, 3e-3, 1e-3, 2e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "km": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.234, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.565, 4e-3, 0.038, 1e-4, 1e-4, 4e-3, 1e-4, 9e-3, 0.049, 0.049, 1e-4, 1e-3, 0.07, 0.028, 0.072, 3e-3, 0.02, 0.022, 0.013, 8e-3, 7e-3, 7e-3, 6e-3, 6e-3, 7e-3, 0.012, 8e-3, 3e-3, 7e-3, 0.012, 8e-3, 4e-3, 1e-4, 0.018, 0.012, 0.02, 8e-3, 0.012, 9e-3, 7e-3, 9e-3, 0.013, 4e-3, 6e-3, 0.012, 0.012, 9e-3, 6e-3, 0.011, 1e-3, 9e-3, 0.018, 0.02, 4e-3, 4e-3, 6e-3, 2e-3, 2e-3, 1e-3, 0.022, 1e-4, 0.022, 1e-4, 4e-3, 1e-4, 0.403, 0.068, 0.154, 0.173, 0.554, 0.096, 0.093, 0.2, 0.358, 5e-3, 0.025, 0.201, 0.122, 0.348, 0.339, 0.093, 5e-3, 0.306, 0.292, 0.378, 0.132, 0.051, 0.059, 0.012, 0.073, 6e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.652, 0.801, 0.696, 0.139, 1.351, 0.735, 0.591, 0.836, 0.083, 0.299, 0.563, 1.859, 0.05, 0.041, 0.223, 1.134, 0.273, 0.671, 2.897, 1.707, 1.359, 0.097, 0.57, 0.24, 1.039, 0.72, 1.493, 0.708, 0.482, 6e-3, 22.614, 7.802, 0.292, 0.16, 0.416, 0.027, 0.02, 0.041, 0.016, 0.053, 0.015, 0.021, 3e-3, 6e-3, 0.019, 2e-3, 4e-3, 0.041, 2e-3, 0.021, 0.047, 1e-3, 1e-3, 1e-3, 2.388, 0.829, 0.388, 0.131, 0.053, 0.602, 0.318, 0.199, 0.385, 0.021, 1e-4, 1e-4, 0.017, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 29.306, 1.288, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.22, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.193, 1e-3, 0.077, 1e-4, 1e-3, 6e-3, 1e-3, 0.024, 0.05, 0.05, 1e-3, 1e-3, 0.263, 0.039, 0.387, 8e-3, 0.055, 0.048, 0.031, 0.015, 0.013, 0.017, 0.014, 0.014, 0.016, 0.027, 0.012, 0.01, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 7e-3, 4e-3, 7e-3, 4e-3, 4e-3, 3e-3, 2e-3, 2e-3, 7e-3, 1e-3, 1e-3, 2e-3, 5e-3, 3e-3, 3e-3, 4e-3, 1e-4, 3e-3, 8e-3, 4e-3, 4e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 5e-3, 1e-4, 5e-3, 1e-4, 1e-3, 1e-3, 0.019, 3e-3, 7e-3, 7e-3, 0.022, 4e-3, 4e-3, 8e-3, 0.016, 1e-3, 2e-3, 9e-3, 7e-3, 0.014, 0.015, 5e-3, 1e-4, 0.014, 0.012, 0.015, 6e-3, 2e-3, 3e-3, 1e-3, 3e-3, 1e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 0.377, 1.744, 1.056, 0.052, 1e-4, 0.294, 1.302, 0.476, 0.14, 0.07, 0.25, 0.184, 0.18, 3.237, 0.115, 0.016, 0.01, 1e-4, 0.076, 9e-3, 4e-3, 1.075, 0.058, 1.134, 0.019, 6e-3, 0.205, 5e-3, 0.214, 4e-3, 0.012, 0.397, 0.02, 0.439, 4e-3, 0.214, 1.341, 0.105, 1.57, 0.184, 1.477, 0.01, 0.553, 0.067, 0.408, 0.14, 0.772, 0.936, 1.909, 1e-4, 24.738, 8.223, 1e-4, 1.147, 0.212, 0.182, 0.975, 0.409, 1e-4, 1e-4, 1e-3, 1e-4, 1.605, 2.364, 1e-4, 1e-4, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 31.178, 1e-4, 0.177, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "koi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.5, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.538, 3e-3, 0.105, 1e-4, 1e-4, 0.012, 1e-4, 0.066, 0.298, 0.299, 1e-3, 3e-3, 0.665, 0.135, 0.828, 0.022, 0.193, 0.238, 0.151, 0.096, 0.069, 0.095, 0.069, 0.062, 0.067, 0.14, 0.09, 0.011, 0.011, 3e-3, 0.011, 0.012, 1e-4, 0.012, 4e-3, 7e-3, 3e-3, 4e-3, 2e-3, 2e-3, 9e-3, 0.016, 3e-3, 0.015, 7e-3, 0.012, 4e-3, 0.018, 0.015, 1e-4, 4e-3, 0.016, 8e-3, 3e-3, 0.011, 1e-3, 0.01, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.204, 0.031, 0.062, 0.036, 0.122, 7e-3, 0.019, 0.037, 0.201, 9e-3, 0.035, 0.077, 0.03, 0.109, 0.075, 0.025, 1e-3, 0.099, 0.08, 0.059, 0.07, 0.013, 4e-3, 3e-3, 0.013, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.529, 2.707, 1.977, 1.216, 0.076, 0.086, 0.043, 0.37, 0.314, 8e-3, 0.015, 2.496, 1.151, 0.356, 0.143, 0.67, 0.146, 0.176, 0.113, 0.201, 0.173, 0.031, 0.44, 0.017, 0.071, 0.03, 0.345, 0.07, 0.14, 0.058, 0.096, 0.178, 0.09, 0.17, 0.07, 0.048, 0.048, 0.034, 0.04, 1.604, 0.03, 1e-3, 1e-3, 0.041, 1e-4, 0.038, 0.042, 0.02, 3.314, 0.375, 1.556, 0.398, 1.638, 1.43, 1.24, 0.859, 1.906, 0.527, 1.802, 1.787, 1.504, 2.903, 2.273, 0.718, 1e-4, 1e-4, 0.079, 0.905, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 0.021, 1e-4, 1e-3, 1e-3, 25.357, 14.367, 1e-3, 1.602, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 1e-4, 0.293, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 25, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.667, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 8.333, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 8.333, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "krc": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.633, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.611, 1e-3, 0.078, 1e-4, 2e-3, 0.011, 1e-4, 2e-3, 0.139, 0.14, 1e-4, 1e-3, 0.591, 0.21, 0.542, 4e-3, 0.138, 0.24, 0.114, 0.076, 0.067, 0.073, 0.058, 0.056, 0.073, 0.12, 0.04, 0.013, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 4e-3, 4e-3, 6e-3, 3e-3, 3e-3, 2e-3, 3e-3, 2e-3, 0.03, 1e-3, 2e-3, 3e-3, 4e-3, 2e-3, 2e-3, 2e-3, 1e-3, 2e-3, 5e-3, 4e-3, 1e-3, 0.01, 2e-3, 0.017, 1e-4, 1e-3, 0.014, 1e-4, 0.014, 1e-4, 1e-3, 1e-4, 0.038, 9e-3, 0.012, 0.014, 0.044, 6e-3, 0.01, 0.013, 0.029, 2e-3, 6e-3, 0.019, 0.015, 0.026, 0.027, 8e-3, 1e-3, 0.031, 0.024, 0.024, 0.014, 7e-3, 3e-3, 2e-3, 5e-3, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.564, 1.141, 1.579, 1.633, 0.148, 0.303, 0.164, 0.503, 0.456, 3e-3, 1.306, 2.454, 0.134, 0.294, 0.686, 0.418, 0.168, 0.334, 0.032, 0.057, 0.2, 0.019, 6e-3, 0.011, 0.056, 6e-3, 0.17, 0.03, 0.076, 0.03, 0.044, 0.051, 0.143, 0.104, 0.049, 0.03, 0.04, 0.03, 5e-3, 0.024, 0.052, 1e-3, 1e-3, 0.061, 1e-3, 0.035, 0.01, 9e-3, 6.121, 1.252, 0.294, 1.328, 2.359, 2.412, 0.507, 0.442, 2.779, 0.471, 1.691, 3.418, 1.039, 3.402, 1.301, 0.302, 1e-4, 1e-4, 0.209, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 1e-4, 6e-3, 2e-3, 30.423, 13.816, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 0.14, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ks": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.09, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.116, 1e-4, 0.395, 7e-3, 1e-4, 1e-4, 4e-3, 0.023, 0.126, 0.124, 1e-4, 1e-3, 0.08, 0.153, 0.257, 5e-3, 0.042, 0.08, 0.041, 0.04, 0.021, 0.031, 0.018, 0.019, 0.02, 0.048, 0.059, 3e-3, 0.053, 0.167, 0.053, 1e-4, 1e-4, 5e-3, 3e-3, 8e-3, 7e-3, 0.01, 7e-3, 1e-3, 2e-3, 0.016, 3e-3, 3e-3, 3e-3, 4e-3, 0.019, 8e-3, 2e-3, 1e-4, 5e-3, 0.01, 0.013, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.198, 0.016, 0.127, 0.13, 0.17, 0.01, 0.074, 0.033, 0.171, 2e-3, 0.016, 0.235, 0.092, 0.256, 0.101, 0.014, 1e-4, 0.218, 0.145, 0.254, 0.031, 0.065, 0.054, 1e-4, 0.012, 1e-4, 1e-4, 9e-3, 1e-4, 1e-4, 1e-4, 0.451, 1.562, 0.534, 0.248, 1.154, 1.571, 2.211, 0.263, 1.281, 0.132, 0.341, 0.16, 1.683, 0.702, 0.993, 0.637, 0.623, 0.052, 0.37, 0.043, 0.331, 0.813, 0.313, 0.319, 0.042, 7e-3, 0.092, 0.282, 0.326, 0.013, 6e-3, 0.065, 0.245, 0.114, 0.179, 0.083, 8.684, 2.577, 0.461, 2.698, 1.217, 0.995, 1.306, 0.114, 0.545, 0.242, 0.666, 1.253, 0.811, 1.543, 0.848, 0.915, 0.434, 0.417, 0.188, 0.11, 0.481, 0.73, 0.156, 0.08, 0.312, 4e-3, 2.104, 0.512, 1e-4, 1e-4, 0.188, 1e-4, 0.017, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.031, 1e-4, 8e-3, 2e-3, 0.028, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.045, 10.482, 2.72, 3.264, 1e-4, 1e-4, 1e-4, 1e-4, 10.717, 1e-3, 0.078, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.129, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ksh": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.544, 7e-3, 0.195, 1e-3, 1e-4, 6e-3, 2e-3, 0.064, 0.077, 0.076, 0.018, 1e-4, 0.951, 0.126, 1.237, 0.01, 0.258, 0.351, 0.176, 0.091, 0.09, 0.099, 0.083, 0.083, 0.116, 0.206, 0.046, 0.013, 3e-3, 2e-3, 3e-3, 4e-3, 1e-4, 0.29, 0.361, 0.086, 0.549, 0.218, 0.205, 0.059, 0.258, 0.102, 0.404, 0.343, 0.228, 0.359, 0.191, 0.138, 0.226, 9e-3, 0.194, 0.601, 0.11, 0.081, 0.179, 0.232, 4e-3, 9e-3, 0.121, 0.015, 1e-4, 0.017, 1e-4, 0.132, 1e-4, 4.203, 0.771, 2.07, 4.046, 9.612, 0.707, 0.863, 3.367, 3.374, 1.363, 1.028, 2.762, 2.009, 5.309, 3.906, 0.798, 6e-3, 4.302, 3.629, 3.86, 2.108, 1.453, 1.005, 0.049, 0.079, 0.749, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.123, 2e-3, 2e-3, 1e-3, 0.082, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 5e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 5e-3, 0.011, 1e-4, 0.082, 0.036, 1e-3, 9e-3, 1e-4, 1e-3, 0.047, 2e-3, 0.044, 0.413, 0.03, 4e-3, 1e-3, 1e-3, 1.721, 1e-3, 4e-3, 2e-3, 3e-3, 0.013, 1e-3, 0.084, 1e-3, 2e-3, 1e-4, 8e-3, 3e-3, 1e-3, 5e-3, 0.025, 2e-3, 1e-3, 1.538, 2e-3, 1e-3, 1e-3, 2e-3, 3e-3, 0.531, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.029, 4.494, 0.051, 0.013, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.124, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ku": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.393, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.949, 5e-3, 0.256, 1e-4, 1e-4, 6e-3, 1e-3, 0.113, 0.21, 0.21, 6e-3, 3e-3, 0.803, 0.095, 1.083, 0.023, 0.197, 0.26, 0.139, 0.073, 0.067, 0.078, 0.071, 0.068, 0.08, 0.162, 0.084, 0.022, 8e-3, 3e-3, 8e-3, 6e-3, 1e-4, 0.192, 0.235, 0.084, 0.253, 0.208, 0.064, 0.107, 0.175, 0.032, 0.081, 0.247, 0.144, 0.22, 0.115, 0.035, 0.144, 0.05, 0.104, 0.203, 0.123, 0.017, 0.026, 0.063, 0.071, 0.053, 0.061, 9e-3, 1e-4, 9e-3, 1e-4, 3e-3, 2e-3, 7.122, 1.894, 0.369, 2.998, 7.334, 0.296, 0.895, 1.263, 5.92, 0.932, 2.612, 1.973, 1.601, 5.257, 1.434, 0.604, 0.177, 4.384, 1.643, 2.193, 1.071, 1.195, 1.296, 0.608, 2.23, 0.722, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.075, 6e-3, 4e-3, 7e-3, 9e-3, 7e-3, 0.012, 0.062, 0.012, 2e-3, 0.018, 1e-3, 0.015, 3e-3, 0.068, 2e-3, 1e-3, 1e-3, 2e-3, 6e-3, 1e-3, 4e-3, 3e-3, 1e-3, 7e-3, 0.019, 1e-3, 9e-3, 0.013, 0.012, 0.074, 0.658, 0.013, 5e-3, 4e-3, 2e-3, 3e-3, 2e-3, 4e-3, 0.335, 8e-3, 0.015, 3.587, 4e-3, 3e-3, 8e-3, 2.776, 7e-3, 9e-3, 0.038, 7e-3, 7e-3, 0.016, 3e-3, 7e-3, 2e-3, 5e-3, 4e-3, 5e-3, 1.203, 0.019, 3e-3, 4e-3, 2e-3, 1e-4, 1e-4, 0.03, 8.061, 0.042, 0.73, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.01, 5e-3, 0.017, 6e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 3e-3, 0.063, 0.061, 5e-3, 0.012, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 6e-3, 0.073, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.403, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.572, 2e-3, 0.112, 1e-4, 1e-4, 4e-3, 1e-4, 6e-3, 0.253, 0.254, 1e-3, 1e-3, 0.652, 0.237, 0.796, 0.019, 0.199, 0.362, 0.176, 0.114, 0.094, 0.095, 0.085, 0.09, 0.105, 0.228, 0.059, 0.022, 3e-3, 1e-3, 4e-3, 1e-3, 1e-4, 8e-3, 5e-3, 0.011, 5e-3, 5e-3, 4e-3, 5e-3, 5e-3, 0.02, 4e-3, 0.011, 6e-3, 6e-3, 7e-3, 4e-3, 5e-3, 2e-3, 5e-3, 0.011, 6e-3, 4e-3, 8e-3, 3e-3, 0.013, 3e-3, 2e-3, 0.039, 1e-4, 0.039, 1e-4, 1e-4, 1e-4, 0.115, 0.019, 0.016, 0.027, 0.069, 9e-3, 0.022, 0.03, 0.155, 0.012, 0.027, 0.043, 0.035, 0.068, 0.048, 0.017, 5e-3, 0.048, 0.041, 0.048, 0.044, 0.012, 0.013, 5e-3, 0.014, 9e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.292, 3.131, 1.711, 1.163, 0.094, 0.093, 0.068, 0.394, 0.316, 0.013, 0.283, 2.417, 0.996, 0.157, 0.138, 0.933, 0.185, 0.144, 0.161, 0.163, 0.266, 0.043, 0.288, 0.024, 0.072, 0.036, 0.257, 0.079, 0.116, 0.07, 0.051, 0.125, 0.115, 0.273, 0.082, 0.056, 0.037, 0.021, 0.028, 2.085, 0.052, 7e-3, 9e-3, 0.112, 5e-3, 0.032, 0.025, 0.019, 3.353, 0.487, 1.618, 0.507, 1.803, 1.293, 0.994, 0.555, 1.916, 0.692, 1.739, 1.936, 1.41, 2.819, 2.119, 0.641, 1e-4, 1e-4, 0.211, 0.665, 0.015, 0.015, 6e-3, 4e-3, 2e-3, 0.021, 0.019, 0.013, 0.017, 3e-3, 0.013, 6e-3, 25.09, 14.142, 6e-3, 2.075, 3e-3, 1e-3, 1e-3, 3e-3, 0.01, 8e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 0.016, 0.023, 0.303, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.018, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "kw": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.271, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.698, 3e-3, 0.428, 1e-4, 1e-4, 0.066, 1e-3, 0.379, 0.501, 0.501, 1e-3, 1e-3, 1.043, 0.466, 1.444, 0.019, 0.602, 0.995, 0.55, 0.31, 0.288, 0.284, 0.283, 0.29, 0.333, 0.472, 0.076, 0.113, 0.013, 3e-3, 0.013, 2e-3, 1e-4, 0.413, 0.261, 0.217, 0.211, 0.211, 0.117, 0.24, 0.182, 0.089, 0.078, 0.627, 0.279, 0.264, 0.166, 0.089, 0.271, 0.018, 0.16, 0.497, 0.182, 0.13, 0.12, 0.167, 3e-3, 0.325, 9e-3, 5e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 7.247, 1.102, 0.333, 2.599, 6.963, 0.397, 1.527, 3.863, 2.585, 0.151, 1.745, 2.596, 1.638, 6.936, 4.292, 0.693, 0.011, 4.812, 4.449, 2.907, 1.185, 1.044, 2.706, 0.022, 4.495, 0.043, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.063, 0.013, 5e-3, 7e-3, 5e-3, 4e-3, 3e-3, 3e-3, 6e-3, 2e-3, 2e-3, 1e-3, 3e-3, 5e-3, 2e-3, 2e-3, 3e-3, 3e-3, 1e-3, 0.033, 4e-3, 2e-3, 2e-3, 4e-3, 4e-3, 0.02, 1e-3, 1e-3, 3e-3, 2e-3, 1e-3, 2e-3, 0.025, 0.014, 4e-3, 5e-3, 0.015, 4e-3, 3e-3, 7e-3, 4e-3, 0.018, 7e-3, 5e-3, 2e-3, 9e-3, 5e-3, 4e-3, 0.012, 7e-3, 0.012, 9e-3, 8e-3, 9e-3, 7e-3, 3e-3, 0.012, 8e-3, 9e-3, 8e-3, 6e-3, 7e-3, 0.012, 4e-3, 1e-4, 1e-4, 0.028, 0.1, 0.011, 0.012, 1e-4, 1e-3, 1e-4, 7e-3, 3e-3, 4e-3, 4e-3, 1e-4, 0.012, 4e-3, 0.062, 0.02, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 4e-3, 0.013, 0.011, 1e-3, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 0.013, 7e-3, 0.058, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ky": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.608, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.786, 1e-3, 0.076, 1e-4, 1e-4, 7e-3, 1e-3, 1e-3, 0.181, 0.185, 1e-4, 3e-3, 0.592, 0.375, 0.793, 0.011, 0.212, 0.26, 0.154, 0.095, 0.087, 0.095, 0.083, 0.081, 0.088, 0.165, 0.05, 0.023, 0.024, 3e-3, 0.024, 2e-3, 1e-4, 6e-3, 9e-3, 6e-3, 3e-3, 2e-3, 0.01, 2e-3, 4e-3, 0.023, 1e-3, 1e-3, 3e-3, 4e-3, 9e-3, 4e-3, 0.011, 1e-4, 3e-3, 0.019, 5e-3, 1e-3, 3e-3, 2e-3, 4e-3, 1e-3, 1e-4, 7e-3, 1e-4, 8e-3, 1e-4, 2e-3, 1e-4, 0.034, 0.028, 0.011, 0.01, 0.036, 4e-3, 7e-3, 0.01, 0.029, 1e-3, 5e-3, 0.017, 9e-3, 0.023, 0.028, 8e-3, 1e-3, 0.047, 0.02, 0.022, 0.013, 3e-3, 3e-3, 2e-3, 6e-3, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 2.775, 1.184, 2.443, 1.907, 0.113, 0.08, 0.128, 0.561, 0.622, 4e-3, 5e-3, 2.414, 0.086, 0.264, 0.107, 0.368, 0.184, 0.149, 0.029, 0.1, 0.146, 9e-3, 0.06, 8e-3, 0.039, 3e-3, 0.233, 0.023, 0.133, 0.051, 0.082, 0.045, 0.072, 0.109, 0.101, 0.162, 0.039, 0.017, 3e-3, 0.031, 0.045, 0.843, 1e-4, 0.06, 1e-3, 0.049, 0.011, 1.059, 5.238, 0.934, 0.249, 1.237, 1.665, 2.222, 0.662, 0.522, 2.314, 0.665, 2.431, 2.219, 1.157, 3.498, 1.756, 0.567, 1e-4, 1e-4, 0.135, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 28.842, 12.881, 1.192, 0.856, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.186, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "la": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.703, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.582, 2e-3, 0.557, 1e-4, 1e-4, 4e-3, 1e-3, 0.038, 0.296, 0.296, 0.016, 2e-3, 1.029, 0.127, 0.917, 0.01, 0.288, 0.518, 0.368, 0.158, 0.135, 0.172, 0.155, 0.139, 0.169, 0.292, 0.103, 0.058, 2e-3, 4e-3, 2e-3, 2e-3, 1e-4, 0.441, 0.179, 0.385, 0.16, 0.131, 0.176, 0.158, 0.144, 0.363, 0.023, 0.04, 0.184, 0.266, 0.121, 0.103, 0.293, 0.049, 0.202, 0.319, 0.152, 0.063, 0.122, 0.033, 0.022, 0.01, 0.013, 4e-3, 1e-4, 4e-3, 1e-4, 4e-3, 1e-4, 7.718, 1.137, 2.983, 1.877, 7.832, 0.566, 0.934, 0.721, 8.862, 0.018, 0.079, 2.703, 3.638, 5.533, 4.661, 1.753, 0.47, 5.095, 5.379, 5.968, 5.347, 0.814, 0.036, 0.291, 0.205, 0.069, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 0.045, 0.018, 0.011, 0.014, 9e-3, 5e-3, 4e-3, 5e-3, 4e-3, 0.018, 2e-3, 2e-3, 5e-3, 7e-3, 2e-3, 2e-3, 4e-3, 3e-3, 2e-3, 0.014, 7e-3, 2e-3, 2e-3, 2e-3, 3e-3, 4e-3, 3e-3, 2e-3, 4e-3, 3e-3, 3e-3, 4e-3, 0.013, 0.011, 4e-3, 3e-3, 9e-3, 4e-3, 4e-3, 6e-3, 0.01, 0.02, 4e-3, 0.013, 3e-3, 7e-3, 3e-3, 5e-3, 0.044, 0.013, 9e-3, 8e-3, 6e-3, 0.012, 8e-3, 5e-3, 0.014, 0.01, 0.011, 0.011, 0.013, 0.014, 0.01, 0.01, 1e-4, 1e-4, 0.047, 0.083, 0.019, 0.012, 1e-4, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.062, 0.03, 0.07, 0.024, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 5e-3, 0.012, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 0.015, 0.037, 3e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lad": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.233, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.114, 1e-3, 0.334, 1e-4, 1e-4, 9e-3, 1e-3, 0.032, 0.169, 0.169, 1e-4, 1e-4, 1.028, 0.087, 0.763, 8e-3, 0.237, 0.25, 0.147, 0.074, 0.074, 0.086, 0.072, 0.065, 0.078, 0.138, 0.053, 0.043, 5e-3, 1e-3, 5e-3, 1e-3, 1e-4, 0.303, 0.15, 0.122, 0.124, 0.422, 0.07, 0.094, 0.073, 0.145, 0.052, 0.173, 0.269, 0.273, 0.076, 0.097, 0.169, 0.01, 0.114, 0.279, 0.178, 0.068, 0.08, 0.015, 0.026, 0.054, 0.024, 0.01, 1e-4, 0.01, 1e-4, 1e-4, 1e-4, 10.092, 0.654, 0.428, 4.329, 9.389, 0.52, 0.701, 0.524, 5.468, 0.466, 2.315, 4.475, 1.912, 5.533, 6.266, 1.56, 0.038, 4.367, 5.784, 3.223, 2.47, 1.069, 0.027, 0.043, 1.039, 0.561, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.02, 0.012, 5e-3, 5e-3, 9e-3, 6e-3, 4e-3, 4e-3, 5e-3, 3e-3, 6e-3, 2e-3, 2e-3, 3e-3, 3e-3, 1e-3, 0.015, 0.012, 4e-3, 0.011, 0.018, 0.019, 4e-3, 4e-3, 7e-3, 0.031, 2e-3, 6e-3, 0.016, 6e-3, 0.01, 0.011, 0.017, 0.14, 8e-3, 5e-3, 6e-3, 3e-3, 3e-3, 0.02, 0.02, 0.11, 0.013, 0.01, 3e-3, 0.09, 2e-3, 5e-3, 0.012, 0.024, 0.019, 0.137, 8e-3, 6e-3, 5e-3, 6e-3, 8e-3, 6e-3, 0.03, 0.011, 0.011, 4e-3, 4e-3, 4e-3, 1e-4, 1e-4, 0.044, 0.511, 0.018, 0.013, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.017, 7e-3, 0.023, 9e-3, 1e-4, 1e-4, 1e-4, 5e-3, 0.02, 0.199, 0.037, 0.028, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 6e-3, 0.018, 1e-4, 1e-3, 3e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.412, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.95, 2e-3, 0.355, 1e-4, 1e-4, 8e-3, 2e-3, 0.417, 0.145, 0.146, 1e-3, 3e-3, 0.802, 0.307, 1.03, 0.016, 0.348, 0.52, 0.266, 0.139, 0.134, 0.143, 0.128, 0.134, 0.162, 0.294, 0.059, 0.012, 0.015, 3e-3, 0.015, 1e-3, 1e-4, 0.428, 0.324, 0.254, 0.594, 0.233, 0.259, 0.289, 0.233, 0.12, 0.196, 0.27, 0.284, 0.379, 0.192, 0.132, 0.314, 0.012, 0.243, 0.585, 0.165, 0.101, 0.142, 0.167, 6e-3, 0.01, 0.098, 5e-3, 1e-4, 5e-3, 1e-4, 3e-3, 1e-4, 4.931, 0.886, 1.95, 2.841, 11.151, 0.974, 2.202, 2.438, 4.449, 0.072, 0.85, 2.736, 2.142, 6.511, 2.976, 0.873, 0.044, 5.369, 4.192, 4.448, 3.418, 0.952, 0.815, 0.087, 0.179, 0.783, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.039, 4e-3, 3e-3, 2e-3, 0.022, 1e-3, 1e-3, 2e-3, 1e-3, 0.016, 1e-3, 0.02, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.012, 1e-3, 1e-4, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 0.01, 2e-3, 8e-3, 2e-3, 0.053, 5e-3, 5e-3, 1e-3, 0.485, 1e-3, 3e-3, 7e-3, 0.029, 0.959, 4e-3, 0.541, 1e-3, 3e-3, 2e-3, 2e-3, 9e-3, 4e-3, 6e-3, 5e-3, 0.01, 3e-3, 0.01, 1e-3, 4e-3, 2e-3, 3e-3, 5e-3, 0.046, 3e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.061, 2.169, 3e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 4e-3, 0.024, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.037, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lbe": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.255, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.9, 1e-3, 0.252, 1e-4, 1e-4, 1e-3, 1e-4, 0.011, 0.416, 0.416, 1e-4, 3e-3, 0.481, 0.136, 0.815, 0.07, 0.265, 0.236, 0.199, 0.107, 0.105, 0.116, 0.098, 0.098, 0.121, 0.12, 0.136, 0.067, 0.071, 2e-3, 0.067, 6e-3, 1e-4, 0.016, 4e-3, 0.021, 2e-3, 4e-3, 5e-3, 4e-3, 3e-3, 0.485, 1e-4, 2e-3, 6e-3, 0.012, 3e-3, 3e-3, 0.014, 1e-3, 5e-3, 0.011, 4e-3, 2e-3, 6e-3, 2e-3, 3e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.216, 0.084, 0.071, 0.045, 0.128, 0.01, 0.022, 0.031, 0.155, 2e-3, 0.014, 0.09, 0.049, 0.088, 0.086, 0.051, 3e-3, 0.174, 0.114, 0.069, 0.102, 0.012, 3e-3, 9e-3, 0.024, 6e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 3.391, 1.985, 1.311, 3.41, 0.076, 1.237, 0.309, 0.579, 0.377, 0.095, 0.645, 0.087, 1.158, 0.044, 0.125, 0.671, 0.313, 0.089, 0.058, 0.221, 0.212, 0.014, 0.015, 0.044, 0.077, 5e-3, 0.185, 0.069, 0.144, 0.054, 0.029, 0.04, 0.037, 0.075, 0.123, 0.038, 0.018, 0.116, 0.052, 0.091, 0.05, 0.027, 3e-3, 0.033, 4e-3, 0.04, 9e-3, 0.029, 7.018, 0.742, 1.169, 0.714, 1.012, 0.485, 0.137, 0.404, 2.976, 0.818, 1.445, 2.805, 1.012, 2.921, 0.476, 0.297, 1e-4, 1e-4, 0.062, 8e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 26.245, 14.532, 1e-4, 0.534, 1e-4, 1e-3, 1e-4, 9e-3, 0.088, 0.067, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.019, 0.318, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lez": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.788, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.917, 1e-3, 0.11, 1e-4, 1e-4, 0.014, 1e-4, 1e-4, 0.118, 0.119, 1e-4, 1e-3, 0.531, 0.18, 0.599, 4e-3, 0.16, 0.227, 0.133, 0.076, 0.063, 0.071, 0.067, 0.062, 0.08, 0.115, 0.048, 0.01, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 3e-3, 2e-3, 5e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 0.351, 1e-4, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 0.01, 1e-3, 0.037, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.023, 3e-3, 6e-3, 5e-3, 0.017, 2e-3, 4e-3, 4e-3, 0.014, 1e-3, 3e-3, 0.017, 4e-3, 0.011, 0.011, 5e-3, 1e-4, 0.013, 0.01, 9e-3, 9e-3, 2e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.387, 1.088, 1.449, 2.206, 0.197, 0.805, 0.228, 0.469, 0.264, 3e-3, 0.696, 0.03, 1.797, 0.123, 0.075, 0.643, 0.214, 0.062, 0.057, 0.099, 0.243, 0.013, 0.01, 0.016, 0.072, 0.013, 0.197, 0.034, 0.095, 0.027, 0.015, 0.041, 0.182, 0.109, 0.046, 0.053, 0.025, 0.087, 0.024, 0.038, 0.035, 1e-3, 1e-3, 0.075, 1e-3, 0.022, 7e-3, 0.017, 6.908, 0.463, 1.591, 1.254, 1.853, 1.815, 0.195, 0.884, 4.344, 1.376, 1.744, 1.947, 0.879, 2.868, 0.597, 0.413, 1e-4, 1e-4, 0.264, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 7e-3, 1e-4, 4e-3, 2e-3, 30.62, 13.045, 1e-4, 0.248, 1e-4, 1e-3, 1e-4, 1e-3, 4e-3, 7e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 0.149, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lg": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.42, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.857, 0.039, 0.098, 1e-4, 1e-4, 8e-3, 1e-4, 0.193, 0.619, 0.652, 6e-3, 0.013, 0.576, 0.063, 0.759, 0.031, 0.142, 0.149, 0.106, 0.065, 0.048, 0.064, 0.043, 0.046, 0.035, 0.039, 0.112, 0.029, 2e-3, 0.038, 3e-3, 0.025, 1e-4, 0.202, 0.147, 0.077, 0.032, 0.406, 0.021, 0.082, 0.019, 0.071, 0.01, 0.184, 0.083, 0.172, 0.138, 0.35, 0.039, 2e-3, 0.027, 0.089, 0.063, 0.041, 0.016, 0.06, 1e-3, 0.036, 0.019, 0.012, 1e-4, 0.012, 1e-4, 0.01, 1e-3, 11.513, 4.158, 0.451, 1.382, 6.569, 0.546, 2.789, 0.349, 6.274, 0.363, 4.548, 2.809, 3.269, 5.614, 5.854, 0.404, 0.013, 2.198, 2.205, 2.706, 6.16, 0.367, 2.254, 0.045, 2.427, 1.395, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1.181, 1e-3, 0.015, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 1e-4, 1e-4, 1e-4, 6e-3, 8e-3, 0.842, 1e-3, 1e-4, 0.092, 0.085, 1e-4, 1e-4, 1e-3, 1e-3, 0.113, 1e-4, 1e-4, 1e-4, 0.017, 0.01, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 6e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.181, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.019, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "li": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.944, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.135, 2e-3, 0.418, 1e-4, 1e-4, 0.017, 1e-3, 1.033, 0.22, 0.22, 2e-3, 1e-3, 0.717, 0.245, 0.974, 0.02, 0.269, 0.322, 0.176, 0.093, 0.094, 0.096, 0.096, 0.091, 0.103, 0.161, 0.092, 0.054, 0.018, 2e-3, 0.018, 1e-3, 1e-4, 0.18, 0.177, 0.097, 0.347, 0.099, 0.066, 0.119, 0.148, 0.188, 0.05, 0.105, 0.134, 0.157, 0.158, 0.108, 0.098, 3e-3, 0.104, 0.185, 0.093, 0.028, 0.141, 0.105, 3e-3, 4e-3, 0.083, 8e-3, 1e-3, 8e-3, 1e-4, 1e-4, 1e-3, 5.507, 1.139, 0.937, 3.64, 13.741, 0.575, 2.233, 1.264, 5.103, 1.163, 1.751, 2.989, 1.798, 6.008, 4.376, 1.144, 0.011, 4.793, 3.527, 4.666, 1.997, 1.767, 1.153, 0.045, 0.112, 0.704, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.031, 5e-3, 2e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 4e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 0.01, 1e-3, 1e-4, 2e-3, 1e-4, 7e-3, 0.018, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 2e-3, 4e-3, 7e-3, 3e-3, 2e-3, 0.113, 3e-3, 1e-3, 3e-3, 0.424, 0.024, 4e-3, 0.246, 1e-3, 4e-3, 1e-3, 0.014, 3e-3, 3e-3, 0.027, 0.238, 5e-3, 2e-3, 0.354, 1e-3, 5e-3, 3e-3, 3e-3, 2e-3, 0.014, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.028, 1.471, 5e-3, 5e-3, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 1e-3, 1e-3, 1e-4, 0.01, 4e-3, 9e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 6e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.031, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lij": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.115, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.653, 6e-3, 0.425, 1e-4, 1e-4, 3e-3, 1e-3, 1.006, 0.211, 0.212, 1e-4, 1e-4, 1.079, 0.522, 0.689, 0.013, 0.183, 0.34, 0.145, 0.099, 0.1, 0.107, 0.089, 0.101, 0.099, 0.127, 0.107, 0.071, 0.08, 3e-3, 0.08, 6e-3, 1e-4, 0.288, 0.108, 0.216, 0.12, 0.091, 0.089, 0.116, 0.025, 0.235, 0.016, 0.018, 0.145, 0.148, 0.083, 0.128, 0.166, 0.021, 0.11, 0.224, 0.097, 0.053, 0.082, 0.012, 0.025, 4e-3, 0.066, 3e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-3, 7.807, 0.66, 2.955, 3.041, 7.727, 0.79, 1.509, 0.643, 7.15, 0.033, 0.062, 2.465, 2.057, 5.516, 6.662, 1.83, 0.232, 3.742, 3.269, 4.498, 2.078, 1.097, 0.032, 0.327, 0.052, 0.447, 1e-4, 0.015, 1e-4, 1e-4, 1e-4, 0.126, 0.011, 6e-3, 6e-3, 7e-3, 3e-3, 5e-3, 0.015, 3e-3, 4e-3, 3e-3, 1e-3, 4e-3, 6e-3, 1e-3, 2e-3, 1e-3, 2e-3, 7e-3, 0.108, 2e-3, 1e-3, 3e-3, 1e-3, 7e-3, 0.097, 1e-3, 2e-3, 5e-3, 4e-3, 1e-3, 1e-3, 0.105, 0.013, 0.443, 2e-3, 0.076, 2e-3, 0.52, 0.668, 0.246, 0.118, 0.122, 0.032, 0.129, 0.012, 0.108, 0.033, 0.028, 0.081, 0.222, 0.058, 0.152, 5e-3, 0.088, 2e-3, 6e-3, 0.059, 0.022, 0.1, 0.117, 7e-3, 5e-3, 0.013, 1e-4, 1e-4, 0.059, 3.444, 0.014, 0.118, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 3e-3, 1e-4, 0.026, 0.013, 0.031, 0.013, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 0.016, 0.012, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 9e-3, 5e-3, 0.121, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lmo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.694, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.003, 7e-3, 0.496, 1e-4, 2e-3, 0.011, 1e-3, 1.536, 0.286, 0.286, 1e-4, 1e-3, 1.048, 0.242, 0.905, 0.061, 0.214, 0.291, 0.19, 0.13, 0.124, 0.121, 0.109, 0.107, 0.118, 0.137, 0.12, 0.041, 0.23, 0.036, 0.23, 4e-3, 1e-4, 0.256, 0.222, 0.29, 0.092, 0.333, 0.125, 0.138, 0.035, 0.151, 0.022, 0.022, 0.325, 0.213, 0.07, 0.062, 0.237, 0.013, 0.158, 0.284, 0.115, 0.042, 0.131, 0.03, 0.012, 5e-3, 0.017, 8e-3, 1e-4, 8e-3, 1e-4, 8e-3, 1e-4, 8.462, 0.843, 2.691, 3.762, 7.44, 0.686, 1.303, 1.109, 4.912, 0.086, 0.225, 4.93, 2.005, 5.17, 2.753, 1.529, 0.12, 4.31, 3.255, 3.626, 1.912, 0.803, 0.038, 0.028, 0.061, 0.501, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.065, 4e-3, 5e-3, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 3e-3, 1e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.011, 2e-3, 1e-4, 2e-3, 1e-3, 0.012, 0.042, 1e-3, 1e-3, 0.018, 2e-3, 1e-3, 3e-3, 0.883, 0.012, 6e-3, 1e-3, 0.021, 1e-3, 2e-3, 5e-3, 0.978, 0.311, 3e-3, 0.015, 0.376, 0.025, 2e-3, 2e-3, 4e-3, 5e-3, 0.393, 0.184, 0.028, 3e-3, 0.199, 2e-3, 3e-3, 0.227, 0.023, 7e-3, 0.722, 4e-3, 2e-3, 4e-3, 1e-4, 1e-4, 0.146, 4.287, 5e-3, 0.015, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.019, 8e-3, 0.013, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 0.061, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ln": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.397, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.893, 0.03, 0.25, 0.011, 1e-3, 0.018, 1e-3, 0.058, 0.196, 0.195, 0.019, 1e-4, 0.627, 0.278, 0.997, 0.017, 0.237, 0.316, 0.167, 0.077, 0.074, 0.095, 0.09, 0.07, 0.092, 0.208, 0.084, 0.022, 0.031, 0.028, 0.031, 8e-3, 1e-4, 0.272, 0.381, 0.139, 0.08, 0.273, 0.07, 0.073, 0.036, 0.085, 0.047, 0.397, 0.244, 0.485, 0.279, 0.076, 0.136, 4e-3, 0.069, 0.216, 0.116, 0.035, 0.048, 0.05, 5e-3, 0.052, 0.034, 0.014, 0.018, 0.014, 1e-4, 4e-3, 1e-4, 10.636, 2.915, 0.49, 0.988, 4.562, 0.3, 1.532, 0.289, 5.022, 0.059, 3.253, 3.932, 3.872, 5.27, 5.607, 1.218, 0.071, 1.319, 2.651, 2.571, 1.582, 0.27, 0.506, 0.061, 2.255, 1.262, 1e-4, 0.013, 1e-4, 1e-4, 1e-4, 0.045, 0.425, 0.034, 1e-3, 4e-3, 2e-3, 0.016, 1e-4, 2e-3, 9e-3, 3e-3, 1e-4, 0.047, 2e-3, 0.03, 1e-4, 0.012, 1e-4, 0.122, 0.011, 0.585, 1e-4, 1e-4, 1e-4, 1e-3, 0.025, 1e-3, 0.584, 3e-3, 2e-3, 1e-3, 1e-4, 0.21, 1.199, 0.019, 9e-3, 1e-3, 1e-3, 2e-3, 0.013, 0.036, 1.009, 0.021, 0.019, 2e-3, 0.983, 6e-3, 0.015, 3e-3, 3e-3, 5e-3, 0.692, 0.016, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.332, 0.02, 2e-3, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 0.228, 4.372, 0.034, 4e-3, 8e-3, 0.141, 1e-4, 1.137, 1e-3, 1e-3, 0.5, 1e-4, 9e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 0.014, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.057, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.442, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.079, 1e-3, 0.049, 1e-4, 1e-4, 6e-3, 1e-4, 4e-3, 0.071, 0.071, 1e-3, 1e-3, 0.152, 0.034, 0.234, 0.012, 0.09, 0.111, 0.08, 0.044, 0.039, 0.045, 0.029, 0.03, 0.029, 0.051, 0.034, 6e-3, 3e-3, 2e-3, 3e-3, 1e-3, 1e-4, 0.013, 8e-3, 0.01, 8e-3, 6e-3, 5e-3, 4e-3, 5e-3, 0.01, 3e-3, 4e-3, 8e-3, 8e-3, 7e-3, 3e-3, 0.012, 1e-4, 5e-3, 0.013, 0.013, 3e-3, 4e-3, 4e-3, 1e-3, 1e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 0.157, 0.027, 0.063, 0.059, 0.202, 0.033, 0.037, 0.067, 0.14, 3e-3, 0.015, 0.078, 0.05, 0.13, 0.139, 0.039, 2e-3, 0.117, 0.112, 0.142, 0.055, 0.018, 0.023, 6e-3, 0.028, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.694, 1.8, 0.562, 0.336, 0.72, 1e-4, 0.034, 1.352, 1.675, 1.044, 0.455, 0.525, 0.031, 0.727, 2e-3, 1e-3, 5e-3, 4e-3, 4e-3, 0.01, 1.254, 0.484, 0.162, 0.734, 9e-3, 2.294, 0.653, 0.586, 0.209, 0.092, 0.491, 0.038, 0.022, 1.013, 0.148, 0.224, 3e-3, 0.796, 1e-3, 0.85, 0.016, 8e-3, 0.816, 0.509, 1e-3, 1.145, 0.216, 4e-3, 1.227, 1.202, 2.293, 0.24, 0.573, 0.78, 0.113, 0.39, 1.673, 0.52, 24.114, 5.723, 0.116, 0.133, 1e-3, 1e-4, 1e-4, 1e-4, 0.085, 6e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.829, 2e-3, 0.538, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "lrc": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.503, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.494, 3e-3, 0.04, 1e-4, 1e-4, 8e-3, 1e-4, 2e-3, 0.084, 0.084, 2e-3, 1e-3, 9e-3, 0.028, 0.484, 0.015, 0.026, 0.035, 0.019, 0.017, 0.01, 0.011, 9e-3, 9e-3, 0.015, 0.017, 0.04, 1e-3, 9e-3, 2e-3, 9e-3, 1e-4, 1e-4, 6e-3, 3e-3, 3e-3, 6e-3, 3e-3, 2e-3, 1e-3, 2e-3, 5e-3, 1e-3, 2e-3, 2e-3, 3e-3, 2e-3, 1e-3, 3e-3, 1e-4, 2e-3, 3e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 3e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 0.043, 6e-3, 0.016, 0.023, 0.041, 4e-3, 8e-3, 0.011, 0.044, 1e-3, 8e-3, 0.022, 0.01, 0.037, 0.028, 0.011, 1e-3, 0.026, 0.016, 0.024, 0.015, 7e-3, 6e-3, 2e-3, 7e-3, 3e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.141, 0.397, 0.205, 0.02, 1.605, 1.614, 3.115, 2.266, 3.47, 0.018, 0.099, 5e-3, 5.078, 5e-3, 0.021, 8e-3, 0.02, 3e-3, 1e-3, 4e-3, 7e-3, 0.374, 1e-4, 1e-3, 0.02, 0.38, 1e-3, 0.042, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 3e-3, 0.35, 0.86, 0.5, 0.014, 1.898, 5.042, 0.917, 1.365, 1.804, 0.048, 0.445, 0.131, 0.29, 3.021, 0.146, 3.091, 0.704, 1.565, 1.062, 0.145, 0.062, 0.1, 0.06, 0.212, 0.059, 0.025, 2e-3, 1e-3, 0.485, 1e-3, 1e-4, 1e-4, 0.044, 6e-3, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 1e-3, 0.017, 7e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 7e-3, 20.669, 13.379, 3.076, 5.814, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 2e-3, 0.138, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ltg": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.505, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.915, 2e-3, 0.48, 1e-4, 1e-4, 0.03, 1e-3, 0.011, 0.307, 0.306, 1e-3, 1e-3, 1.036, 0.186, 1.128, 0.03, 0.246, 0.429, 0.198, 0.13, 0.123, 0.148, 0.107, 0.108, 0.116, 0.317, 0.161, 0.072, 0.029, 5e-3, 0.029, 4e-3, 1e-4, 0.199, 0.123, 0.06, 0.183, 0.07, 0.028, 0.064, 0.021, 0.12, 0.092, 0.204, 0.323, 0.133, 0.101, 0.065, 0.288, 1e-3, 0.16, 0.239, 0.103, 0.036, 0.21, 7e-3, 0.022, 1e-3, 0.052, 2e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 7.469, 0.962, 0.824, 2.269, 4.253, 0.17, 1.648, 0.088, 6.306, 1.422, 2.423, 2.524, 1.996, 2.559, 4.514, 1.853, 1e-3, 3.554, 6.061, 4.103, 4.999, 1.941, 0.013, 6e-3, 1.629, 1.118, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.287, 1.24, 0.018, 9e-3, 2e-3, 8e-3, 0.371, 4e-3, 3e-3, 1e-3, 1e-3, 4e-3, 0.014, 0.08, 1e-3, 0.011, 3e-3, 2e-3, 2e-3, 0.271, 0.142, 1e-3, 1e-3, 3e-3, 3e-3, 7e-3, 1e-3, 1e-3, 3e-3, 0.032, 0.034, 2e-3, 0.043, 0.709, 1e-3, 5e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-3, 0.015, 2.24, 1e-3, 1e-3, 1e-4, 1e-3, 0.04, 0.01, 0.024, 0.01, 0.013, 0.028, 3e-3, 0.011, 0.033, 6e-3, 0.014, 0.026, 0.687, 0.026, 0.226, 9e-3, 1e-4, 1e-4, 0.023, 0.015, 3.578, 2.215, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 2e-3, 1e-4, 3e-3, 1e-3, 0.252, 0.098, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 0.265, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mai": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.888, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.023, 1e-3, 0.03, 1e-4, 1e-4, 3e-3, 1e-3, 0.013, 0.071, 0.074, 1e-4, 1e-3, 0.267, 0.061, 0.074, 6e-3, 0.01, 0.016, 9e-3, 5e-3, 4e-3, 5e-3, 4e-3, 4e-3, 5e-3, 0.012, 0.021, 6e-3, 4e-3, 1e-3, 4e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.018, 5e-3, 5e-3, 5e-3, 0.017, 3e-3, 4e-3, 8e-3, 0.015, 1e-3, 2e-3, 9e-3, 5e-3, 0.013, 0.013, 4e-3, 1e-3, 0.014, 0.017, 0.012, 6e-3, 2e-3, 3e-3, 1e-3, 3e-3, 1e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.792, 0.705, 0.351, 0.05, 1e-4, 0.548, 0.202, 1.331, 0.277, 0.165, 4e-3, 0.356, 0.051, 2.185, 1e-4, 0.286, 5e-3, 1e-3, 1e-4, 0.066, 6e-3, 1.874, 0.183, 0.514, 0.043, 0.102, 0.293, 0.463, 0.567, 0.024, 0.087, 0.255, 0.05, 0.178, 0.022, 0.166, 25.43, 6.866, 0.581, 0.373, 1.476, 0.06, 0.857, 0.137, 0.417, 0.41, 1.258, 0.71, 1.883, 1e-3, 1.344, 1e-3, 1e-3, 0.686, 0.286, 0.227, 1.223, 0.469, 1e-4, 1e-4, 0.026, 0.025, 2.747, 1.736, 1e-4, 1e-4, 9e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.668, 1e-4, 0.037, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mdf": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.974, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.901, 2e-3, 0.147, 1e-4, 1e-4, 3e-3, 1e-4, 3e-3, 0.239, 0.241, 1e-4, 1e-3, 0.661, 0.233, 0.828, 4e-3, 0.16, 0.227, 0.113, 0.065, 0.054, 0.071, 0.072, 0.058, 0.067, 0.13, 0.047, 0.019, 2e-3, 1e-4, 2e-3, 1e-3, 1e-4, 6e-3, 2e-3, 8e-3, 2e-3, 2e-3, 3e-3, 2e-3, 2e-3, 0.025, 1e-3, 2e-3, 2e-3, 5e-3, 2e-3, 2e-3, 6e-3, 1e-3, 3e-3, 5e-3, 3e-3, 1e-3, 8e-3, 1e-3, 0.014, 1e-4, 1e-4, 4e-3, 1e-4, 5e-3, 1e-4, 2e-3, 1e-4, 0.07, 6e-3, 0.018, 0.016, 0.05, 4e-3, 0.011, 0.014, 0.042, 3e-3, 9e-3, 0.03, 0.013, 0.041, 0.036, 0.013, 1e-3, 0.037, 0.035, 0.028, 0.024, 5e-3, 3e-3, 3e-3, 6e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.013, 2.98, 2.587, 0.748, 0.583, 0.414, 0.428, 0.203, 0.631, 0.045, 0.095, 0.17, 2.818, 0.257, 0.113, 1.375, 0.157, 0.181, 0.113, 0.066, 0.125, 0.013, 6e-3, 0.022, 0.063, 5e-3, 0.16, 0.068, 0.186, 0.053, 0.097, 0.114, 0.073, 0.188, 0.099, 0.03, 0.023, 0.016, 0.014, 0.014, 0.049, 3e-3, 1e-3, 0.054, 2e-3, 0.05, 7e-3, 0.022, 4.7, 0.292, 1.108, 0.449, 1.264, 2.755, 0.106, 0.711, 2.236, 0.41, 2.142, 1.743, 1.474, 3.418, 3.1, 0.637, 1e-4, 1e-4, 0.118, 6e-3, 5e-3, 3e-3, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 3e-3, 2e-3, 1e-4, 4e-3, 2e-3, 28.205, 15.445, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 6e-3, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 1e-4, 0.122, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mg": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.132, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.344, 1e-4, 0.051, 1e-4, 1e-4, 3e-3, 1e-4, 1.722, 0.134, 0.134, 1e-4, 0.062, 0.6, 1.054, 1.426, 0.011, 0.88, 0.969, 0.776, 0.547, 0.574, 0.473, 0.464, 0.436, 0.531, 0.535, 0.029, 0.033, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.281, 0.132, 0.16, 0.072, 0.212, 0.148, 0.178, 0.056, 0.346, 0.102, 0.053, 0.101, 0.354, 0.788, 0.05, 0.139, 8e-3, 0.098, 0.209, 0.172, 0.049, 0.057, 0.038, 5e-3, 0.021, 9e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 15.071, 0.568, 0.216, 2.816, 2.902, 0.81, 0.249, 1.395, 7.562, 0.225, 1.469, 1.52, 3.108, 9.36, 4.666, 0.931, 0.023, 4.686, 1.843, 3.288, 0.414, 0.748, 0.044, 0.043, 4.297, 0.559, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.076, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 2e-3, 1e-3, 8e-3, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-3, 0.052, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.017, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 0.15, 0.01, 7e-3, 8e-3, 1e-3, 1e-4, 1e-3, 6e-3, 0.026, 0.088, 3e-3, 4e-3, 1e-3, 5e-3, 2e-3, 2e-3, 0.137, 2e-3, 1e-3, 4e-3, 0.086, 1e-3, 2e-3, 1e-3, 3e-3, 1e-3, 2e-3, 0.01, 3e-3, 1e-3, 1e-3, 8e-3, 1e-4, 1e-4, 0.143, 0.408, 6e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.069, 4e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mh": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.376, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.504, 1e-4, 0.156, 1e-4, 1e-4, 1e-4, 0.039, 0.039, 0.039, 0.039, 1e-4, 1e-4, 1.325, 0.078, 1.247, 0.039, 0.156, 0.039, 0.078, 1e-4, 1e-4, 0.039, 1e-4, 1e-4, 0.039, 1e-4, 0.039, 0.078, 0.078, 0.039, 0.078, 1e-4, 1e-4, 0.701, 0.273, 0.156, 0.078, 0.312, 0.039, 0.156, 0.078, 0.351, 0.779, 0.779, 0.234, 0.779, 1e-4, 0.039, 0.156, 1e-4, 0.312, 0.195, 0.156, 0.195, 0.039, 0.078, 1e-4, 0.195, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.103, 1.558, 0.312, 0.818, 6.584, 0.078, 0.351, 1.013, 7.402, 4.675, 3.584, 3.039, 2.766, 5.804, 6.389, 0.779, 0.078, 4.753, 1.48, 2.337, 1.441, 0.117, 1.597, 1e-4, 1.558, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.351, 1e-4, 1e-4, 0.156, 1e-4, 0.039, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.039, 0.545, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.467, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.078, 1e-4, 0.117, 1e-4, 1e-4, 1e-4, 1.013, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.078, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.208, 0.429, 0.584, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.662, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mhr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.247, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.433, 0.01, 0.105, 1e-4, 1e-4, 3e-3, 1e-4, 3e-3, 0.242, 0.243, 1e-4, 4e-3, 0.563, 0.341, 0.763, 6e-3, 0.23, 0.307, 0.193, 0.103, 0.088, 0.092, 0.076, 0.077, 0.081, 0.164, 0.099, 0.012, 3e-3, 5e-3, 3e-3, 6e-3, 1e-4, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 0.045, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 0.016, 1e-3, 0.019, 1e-4, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 0.02, 4e-3, 7e-3, 8e-3, 0.02, 2e-3, 3e-3, 4e-3, 0.014, 1e-4, 2e-3, 0.01, 5e-3, 0.01, 0.012, 4e-3, 1e-4, 0.013, 9e-3, 0.01, 5e-3, 2e-3, 2e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.161, 0.998, 2.463, 1.262, 0.079, 0.06, 0.073, 0.732, 2.145, 0.012, 0.024, 3.429, 0.167, 0.157, 0.039, 0.3, 0.114, 0.051, 0.084, 0.076, 0.173, 0.021, 5e-3, 0.012, 0.07, 0.035, 0.245, 0.039, 0.204, 0.055, 0.073, 0.108, 0.142, 0.124, 0.167, 0.046, 0.023, 0.257, 0.01, 0.146, 0.069, 1e-3, 1e-3, 0.099, 2e-3, 0.093, 0.02, 0.031, 3.766, 0.43, 0.916, 0.689, 1.067, 3.621, 0.573, 0.276, 1.798, 1.177, 2.133, 2.766, 1.884, 2.711, 2.445, 0.765, 1e-4, 1e-4, 0.222, 0.109, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 8e-3, 4e-3, 28.363, 13.911, 0.249, 0.424, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.203, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.242, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 18.048, 2e-3, 0.114, 1e-4, 1e-4, 7e-3, 1e-4, 0.316, 0.24, 0.24, 1e-4, 1e-4, 0.815, 0.729, 1.027, 3e-3, 0.15, 0.245, 0.11, 0.069, 0.067, 0.071, 0.069, 0.066, 0.083, 0.097, 0.029, 0.194, 2e-3, 1e-4, 2e-3, 2e-3, 1e-4, 0.243, 0.042, 0.09, 0.013, 0.207, 0.019, 0.023, 0.227, 0.154, 0.011, 0.858, 0.022, 0.414, 0.264, 0.035, 0.344, 1e-3, 0.143, 0.039, 1.088, 0.016, 0.015, 0.518, 1e-3, 2e-3, 3e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 10.57, 0.047, 0.232, 0.102, 7.727, 0.029, 1.763, 3.618, 6.701, 8e-3, 3.514, 0.582, 0.854, 4.652, 6.133, 0.788, 3e-3, 3.052, 0.255, 6.464, 3.231, 0.037, 1.326, 8e-3, 0.217, 9e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.025, 2.749, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 0.072, 0.357, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 0.284, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 4e-3, 3e-3, 1e-3, 1e-3, 4e-3, 1e-3, 3e-3, 4e-3, 3e-3, 3e-3, 0.013, 0.525, 1e-3, 2e-3, 1e-3, 2e-3, 3e-3, 4e-3, 0.018, 5e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.019, 0.015, 3.257, 0.759, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 6e-3, 8e-3, 6e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 2e-3, 4e-3, 1e-3, 1e-4, 2e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "min": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.172, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.612, 1e-4, 0.04, 5e-3, 1e-4, 2e-3, 4e-3, 0.018, 0.155, 0.155, 1e-4, 1e-4, 1.063, 0.022, 1.041, 1e-3, 0.404, 0.298, 0.265, 0.112, 0.103, 0.128, 0.132, 0.113, 0.114, 0.233, 9e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.635, 0.069, 0.223, 0.216, 0.107, 0.023, 0.035, 0.059, 0.25, 0.026, 0.062, 0.356, 0.142, 0.089, 0.046, 0.143, 0.014, 0.06, 0.402, 0.123, 0.018, 0.017, 0.016, 0.015, 0.037, 9e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.754, 1.953, 0.961, 4.093, 4.246, 0.532, 1.865, 1.575, 6.705, 0.46, 3.68, 3.421, 3.054, 5.905, 5.613, 2.448, 9e-3, 4.152, 3.536, 3.358, 3.758, 0.175, 0.156, 0.045, 0.909, 0.044, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.018, 0.016, 4e-3, 4e-3, 0.011, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.017, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 5e-3, 1e-4, 1e-4, 0.014, 7e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 0.016, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.029, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mk": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.442, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.507, 1e-3, 0.094, 1e-4, 1e-4, 6e-3, 1e-3, 0.012, 0.086, 0.086, 1e-3, 4e-3, 0.588, 0.074, 0.535, 0.01, 0.197, 0.23, 0.143, 0.089, 0.082, 0.088, 0.076, 0.074, 0.08, 0.116, 0.032, 0.012, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 0.015, 8e-3, 0.047, 6e-3, 6e-3, 5e-3, 0.034, 5e-3, 0.026, 2e-3, 3e-3, 6e-3, 0.012, 0.023, 6e-3, 0.014, 1e-3, 7e-3, 0.019, 0.01, 6e-3, 6e-3, 4e-3, 4e-3, 1e-3, 1e-3, 8e-3, 1e-4, 8e-3, 1e-4, 2e-3, 1e-4, 0.08, 0.013, 0.03, 0.022, 0.08, 0.011, 0.022, 0.023, 0.061, 3e-3, 0.011, 0.035, 0.039, 0.054, 0.06, 0.012, 1e-3, 0.056, 0.049, 0.047, 0.027, 8e-3, 6e-3, 3e-3, 0.012, 4e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.279, 1.922, 3.072, 0.896, 0.157, 0.085, 0.296, 0.344, 0.32, 1e-3, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.012, 0.067, 0.066, 0.1, 0.11, 0.062, 0.046, 8e-3, 0.029, 0.825, 9e-3, 0.229, 0.032, 0.208, 0.077, 0.103, 0.118, 0.054, 0.125, 0.063, 0.016, 0.028, 0.03, 0.013, 0.01, 0.018, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 5.692, 0.585, 1.752, 0.746, 1.619, 3.647, 0.195, 0.665, 3.964, 1e-3, 1.64, 1.494, 0.888, 3.068, 4.767, 1.117, 1e-4, 1e-4, 0.015, 6e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 3e-3, 33.101, 10.345, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.096, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ml": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.283, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.554, 1e-3, 0.034, 1e-4, 1e-4, 2e-3, 1e-4, 0.013, 0.046, 0.046, 1e-4, 1e-3, 0.155, 0.051, 0.434, 4e-3, 0.069, 0.096, 0.051, 0.026, 0.025, 0.029, 0.025, 0.024, 0.03, 0.054, 0.011, 4e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 5e-3, 3e-3, 5e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 4e-3, 1e-3, 1e-3, 2e-3, 3e-3, 2e-3, 2e-3, 4e-3, 1e-4, 2e-3, 5e-3, 4e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 3e-3, 1e-4, 1e-3, 1e-4, 0.044, 7e-3, 0.016, 0.014, 0.045, 7e-3, 9e-3, 0.015, 0.036, 1e-3, 4e-3, 0.022, 0.013, 0.031, 0.031, 0.01, 1e-3, 0.031, 0.025, 0.029, 0.015, 4e-3, 5e-3, 2e-3, 8e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.284, 1.637, 0.889, 0.045, 1e-4, 0.237, 0.843, 0.478, 0.108, 0.077, 0.086, 0.336, 0.062, 4.599, 0.152, 0.029, 8e-3, 1e-4, 0.075, 0.022, 3e-3, 1.759, 0.042, 0.219, 0.023, 0.382, 0.512, 4e-3, 0.161, 1e-3, 0.086, 0.887, 0.025, 0.094, 2e-3, 0.484, 1.618, 0.083, 0.303, 0.146, 1.873, 1e-4, 0.931, 0.058, 0.143, 0.126, 0.78, 1.209, 1.122, 0.589, 0.667, 0.458, 22.229, 10.029, 0.199, 0.193, 0.652, 0.135, 0.025, 0.171, 0.328, 0.323, 1.631, 2.28, 1e-4, 1e-4, 0.014, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 31.391, 1e-3, 0.071, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.502, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.684, 2e-3, 0.094, 1e-3, 1e-3, 6e-3, 1e-3, 3e-3, 0.078, 0.078, 1e-3, 2e-3, 0.423, 0.192, 0.522, 0.019, 0.207, 0.249, 0.16, 0.075, 0.065, 0.07, 0.06, 0.055, 0.066, 0.128, 0.025, 8e-3, 3e-3, 5e-3, 4e-3, 2e-3, 1e-4, 0.018, 0.012, 0.019, 0.013, 0.012, 8e-3, 7e-3, 9e-3, 0.026, 3e-3, 4e-3, 0.011, 0.017, 0.01, 9e-3, 0.02, 2e-3, 0.012, 0.024, 0.016, 6e-3, 7e-3, 6e-3, 7e-3, 3e-3, 1e-3, 6e-3, 1e-3, 6e-3, 1e-4, 5e-3, 1e-4, 0.097, 0.016, 0.039, 0.037, 0.119, 0.017, 0.023, 0.03, 0.088, 2e-3, 0.012, 0.052, 0.031, 0.08, 0.086, 0.026, 2e-3, 0.079, 0.064, 0.078, 0.038, 0.025, 0.012, 8e-3, 0.018, 3e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 2.438, 1.425, 1.576, 1.589, 0.047, 1.639, 0.295, 0.416, 0.311, 1e-3, 8e-3, 0.672, 0.369, 2.886, 0.106, 0.163, 0.114, 0.151, 0.023, 0.067, 0.081, 0.017, 0.027, 0.033, 0.044, 4e-3, 0.046, 0.028, 0.128, 0.083, 0.044, 0.031, 0.048, 0.074, 0.102, 0.063, 0.021, 0.125, 0.02, 0.022, 0.053, 1.026, 1e-3, 0.019, 1e-3, 0.067, 0.028, 1.192, 4.733, 1.04, 0.537, 2.615, 2.04, 0.399, 0.621, 0.396, 2.01, 1.723, 0.207, 2.589, 0.943, 3.889, 2.383, 0.107, 1e-4, 1e-4, 0.065, 0.012, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 1e-3, 27.532, 13.908, 1.199, 1.049, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.072, 2e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.77, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.47, 2e-3, 0.214, 1e-4, 1e-4, 0.017, 1e-3, 0.035, 0.128, 0.128, 2e-3, 1e-3, 0.656, 0.155, 0.49, 6e-3, 0.172, 0.19, 0.096, 0.052, 0.062, 0.054, 0.034, 0.043, 0.06, 0.129, 0.06, 0.015, 0.017, 0.012, 0.017, 1e-4, 1e-4, 0.018, 9e-3, 0.023, 9e-3, 0.011, 2e-3, 6e-3, 4e-3, 0.035, 2e-3, 5e-3, 7e-3, 0.014, 8e-3, 8e-3, 9e-3, 1e-3, 9e-3, 0.019, 8e-3, 5e-3, 4e-3, 7e-3, 7e-3, 1e-3, 2e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.381, 0.035, 0.167, 0.122, 0.44, 0.045, 0.036, 0.034, 0.432, 5e-3, 0.016, 0.206, 0.12, 0.248, 0.177, 0.096, 3e-3, 0.253, 0.183, 0.236, 0.214, 0.038, 0.01, 0.011, 0.011, 0.03, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.01, 1.642, 2.712, 2.46, 0.4, 0.066, 0.487, 0.515, 0.507, 1e-3, 1e-3, 0.622, 0.372, 0.933, 0.029, 0.581, 0.134, 0.087, 0.042, 0.032, 0.081, 0.073, 0.022, 8e-3, 0.061, 4e-3, 0.139, 0.063, 0.145, 0.05, 0.043, 0.149, 0.144, 0.143, 0.069, 0.113, 0.038, 0.031, 7e-3, 0.03, 0.013, 2e-3, 1e-3, 0.064, 2e-3, 1e-3, 0.029, 7e-3, 3.78, 0.37, 0.558, 0.274, 1.316, 4.346, 0.072, 0.319, 3.558, 0.657, 1.356, 2.204, 1.073, 2.802, 2.13, 1.099, 1e-4, 1e-4, 0.025, 0.051, 0.091, 0.068, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 5e-3, 1e-4, 8e-3, 4e-3, 27.537, 14.047, 1e-3, 0.161, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 5e-3, 0.022, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mr": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.525, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.348, 2e-3, 0.043, 1e-4, 1e-4, 4e-3, 1e-4, 0.024, 0.061, 0.064, 1e-4, 1e-3, 0.221, 0.063, 0.539, 9e-3, 9e-3, 9e-3, 6e-3, 3e-3, 3e-3, 3e-3, 3e-3, 3e-3, 3e-3, 5e-3, 0.03, 0.01, 3e-3, 4e-3, 3e-3, 3e-3, 1e-4, 8e-3, 4e-3, 6e-3, 4e-3, 3e-3, 3e-3, 3e-3, 3e-3, 7e-3, 2e-3, 2e-3, 3e-3, 6e-3, 3e-3, 2e-3, 5e-3, 1e-4, 4e-3, 8e-3, 9e-3, 1e-3, 2e-3, 2e-3, 1e-4, 1e-3, 1e-4, 7e-3, 1e-4, 7e-3, 1e-4, 1e-3, 1e-4, 0.138, 0.021, 0.046, 0.053, 0.162, 0.029, 0.028, 0.063, 0.114, 3e-3, 0.011, 0.062, 0.038, 0.106, 0.103, 0.03, 2e-3, 0.096, 0.09, 0.116, 0.04, 0.015, 0.019, 3e-3, 0.023, 2e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 1.224, 0.397, 1.061, 0.056, 1e-3, 0.297, 0.351, 1.664, 0.084, 0.127, 0.02, 0.461, 0.026, 2.286, 1e-4, 0.096, 5e-3, 0.018, 1e-3, 0.019, 5e-3, 1.098, 0.145, 0.403, 0.083, 0.015, 0.659, 0.012, 0.404, 0.067, 0.014, 0.287, 0.125, 0.236, 0.039, 0.415, 24.995, 7.065, 0.585, 0.404, 1.081, 0.036, 0.727, 0.118, 0.317, 0.211, 0.844, 1.342, 1.809, 0.018, 1.056, 0.198, 1e-3, 0.975, 0.327, 0.194, 1.035, 0.79, 1e-3, 1e-3, 3e-3, 1e-3, 3.71, 0.926, 1e-4, 1e-4, 0.015, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.418, 1e-3, 0.048, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mrj": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.556, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.792, 4e-3, 0.111, 1e-4, 1e-4, 8e-3, 1e-3, 0.036, 0.371, 0.372, 1e-4, 1e-3, 0.508, 0.256, 0.9, 0.015, 0.334, 0.401, 0.27, 0.169, 0.152, 0.17, 0.137, 0.141, 0.168, 0.185, 0.1, 0.046, 9e-3, 5e-3, 8e-3, 0.012, 1e-4, 0.017, 0.012, 0.012, 0.011, 6e-3, 6e-3, 8e-3, 6e-3, 0.083, 4e-3, 0.011, 6e-3, 0.014, 7e-3, 0.024, 0.016, 1e-3, 8e-3, 0.014, 9e-3, 3e-3, 0.03, 2e-3, 0.042, 2e-3, 1e-3, 8e-3, 1e-4, 9e-3, 1e-4, 3e-3, 1e-4, 0.281, 0.025, 0.082, 0.065, 0.202, 0.013, 0.027, 0.052, 0.157, 3e-3, 0.032, 0.08, 0.041, 0.09, 0.092, 0.03, 5e-3, 0.117, 0.072, 0.076, 0.073, 0.015, 0.012, 4e-3, 0.024, 0.01, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.356, 0.846, 2.179, 0.887, 0.116, 0.285, 0.312, 0.236, 2.316, 7e-3, 4e-3, 2.565, 0.266, 0.252, 0.05, 0.215, 0.187, 0.062, 0.078, 1.679, 0.285, 0.024, 5e-3, 0.016, 0.067, 0.046, 0.237, 0.053, 0.116, 0.054, 0.059, 0.117, 0.058, 0.115, 0.145, 0.033, 0.102, 0.049, 0.064, 0.062, 0.066, 6e-3, 1e-3, 0.056, 3e-3, 0.041, 7e-3, 0.023, 2.651, 0.259, 1.194, 0.797, 1.113, 1.956, 0.572, 0.253, 2.277, 2.969, 1.78, 2.755, 1.532, 2.591, 1.704, 0.818, 1e-4, 1e-4, 0.138, 0.095, 0.012, 6e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 0.011, 1e-4, 8e-3, 6e-3, 24.363, 12.5, 2e-3, 4.142, 1e-4, 1e-4, 1e-4, 1e-3, 0.015, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 4e-3, 0.341, 5e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ms": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.423, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.116, 4e-3, 0.276, 1e-3, 3e-3, 0.028, 5e-3, 0.04, 0.153, 0.154, 0.011, 2e-3, 0.825, 0.313, 0.841, 0.02, 0.335, 0.324, 0.225, 0.11, 0.099, 0.112, 0.094, 0.087, 0.096, 0.171, 0.041, 0.019, 0.01, 5e-3, 0.01, 2e-3, 1e-3, 0.327, 0.313, 0.169, 0.197, 0.08, 0.09, 0.097, 0.122, 0.22, 0.145, 0.326, 0.158, 0.369, 0.143, 0.065, 0.427, 0.013, 0.147, 0.487, 0.268, 0.071, 0.05, 0.063, 7e-3, 0.038, 0.022, 0.015, 1e-4, 0.015, 1e-4, 2e-3, 1e-4, 15.253, 2.008, 0.502, 3.234, 6.807, 0.209, 2.704, 2.141, 5.701, 0.605, 3.195, 3.049, 3.025, 7.562, 1.688, 2.054, 0.019, 4.172, 2.861, 3.513, 3.855, 0.159, 0.407, 0.024, 1.19, 0.123, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 0.025, 5e-3, 3e-3, 4e-3, 3e-3, 2e-3, 2e-3, 4e-3, 3e-3, 2e-3, 2e-3, 1e-3, 2e-3, 7e-3, 4e-3, 2e-3, 1e-3, 2e-3, 1e-3, 9e-3, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.01, 1e-3, 3e-3, 4e-3, 4e-3, 1e-3, 7e-3, 0.031, 0.013, 3e-3, 3e-3, 3e-3, 2e-3, 1e-3, 6e-3, 7e-3, 0.017, 2e-3, 3e-3, 1e-3, 7e-3, 2e-3, 2e-3, 4e-3, 0.011, 3e-3, 6e-3, 5e-3, 1e-3, 6e-3, 1e-3, 4e-3, 2e-3, 3e-3, 2e-3, 8e-3, 3e-3, 3e-3, 1e-3, 1e-4, 1e-4, 0.034, 0.074, 0.022, 0.02, 1e-4, 1e-4, 1e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.012, 0.015, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 0.024, 4e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mt": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.717, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.569, 3e-3, 0.319, 1e-3, 1e-3, 9e-3, 1e-3, 0.699, 0.116, 0.117, 1e-3, 2e-3, 0.868, 2.789, 0.736, 0.014, 0.299, 0.341, 0.218, 0.093, 0.081, 0.087, 0.085, 0.082, 0.1, 0.201, 0.053, 0.022, 0.013, 0.012, 0.013, 2e-3, 1e-4, 0.223, 0.171, 0.118, 0.162, 0.107, 0.236, 0.127, 0.076, 0.3, 0.048, 0.158, 0.199, 0.315, 0.08, 0.056, 0.187, 0.018, 0.103, 0.221, 0.127, 0.065, 0.054, 0.053, 0.02, 7e-3, 9e-3, 0.022, 1e-4, 0.023, 1e-4, 8e-3, 2e-3, 9.087, 1.533, 0.244, 1.812, 5.201, 1.498, 1.212, 0.809, 8.439, 2.13, 1.92, 5.784, 2.557, 4.221, 2.69, 1.16, 0.488, 3.837, 2.631, 5.521, 3.106, 0.451, 1.062, 0.484, 0.085, 0.753, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.211, 4e-3, 4e-3, 2e-3, 3e-3, 1e-3, 1e-3, 4e-3, 2e-3, 1e-3, 0.016, 0.407, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 0.042, 3e-3, 1e-3, 1e-3, 1e-3, 5e-3, 0.141, 1e-3, 1e-3, 0.01, 0.01, 1e-3, 2e-3, 0.13, 0.527, 2e-3, 4e-3, 2e-3, 1e-3, 0.025, 1.521, 7e-3, 0.014, 1e-3, 4e-3, 5e-3, 8e-3, 1e-3, 1e-3, 4e-3, 5e-3, 9e-3, 4e-3, 2e-3, 2e-3, 3e-3, 1e-3, 3e-3, 0.01, 3e-3, 0.015, 0.566, 3e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.015, 0.129, 2.554, 0.578, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.011, 5e-3, 0.011, 4e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 4e-3, 6e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 4e-3, 0.212, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mus": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.612, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 19.388, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.02, 1e-4, 1.02, 1e-4, 1.02, 1.02, 1e-4, 2.041, 1.02, 1e-4, 1.02, 1.02, 4.082, 1.02, 1.02, 2.041, 1e-4, 1.02, 1.02, 1.02, 1.02, 1.02, 1.02, 1e-4, 1.02, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.061, 1e-4, 1e-4, 1e-4, 5.102, 1e-4, 1.02, 1e-4, 1.02, 1e-4, 5.102, 1e-4, 1.02, 1.02, 2.041, 1e-4, 1e-4, 1e-4, 2.041, 1e-4, 1e-4, 2.041, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.02, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.02, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "my": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.476, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.676, 1e-4, 0.018, 1e-4, 1e-4, 1e-3, 1e-4, 9e-3, 0.072, 0.072, 1e-4, 1e-3, 0.013, 0.027, 0.014, 4e-3, 7e-3, 6e-3, 5e-3, 3e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 1e-3, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 9e-3, 7e-3, 0.011, 6e-3, 4e-3, 4e-3, 5e-3, 4e-3, 6e-3, 2e-3, 3e-3, 4e-3, 8e-3, 5e-3, 4e-3, 7e-3, 1e-4, 5e-3, 0.011, 8e-3, 3e-3, 2e-3, 3e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.087, 0.015, 0.033, 0.032, 0.11, 0.015, 0.02, 0.035, 0.072, 1e-3, 0.01, 0.046, 0.027, 0.071, 0.073, 0.021, 1e-3, 0.069, 0.054, 0.072, 0.03, 0.01, 0.011, 3e-3, 0.016, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 32.171, 1.737, 0.141, 0.03, 1.382, 0.783, 0.273, 0.069, 0.03, 0.083, 0.874, 0.307, 0.061, 0.061, 9e-3, 0.119, 1.037, 0.261, 0.115, 0.031, 0.966, 0.888, 0.304, 0.058, 0.131, 1.12, 0.266, 0.843, 0.619, 0.172, 1.057, 0.095, 6e-3, 0.703, 1e-3, 1e-3, 9e-3, 0.019, 0.041, 6e-3, 1e-4, 5e-3, 1e-4, 0.239, 1.811, 1.255, 0.357, 1.497, 0.246, 1.317, 0.249, 1e-4, 1e-4, 1e-4, 0.294, 0.751, 1.889, 0.152, 3.975, 0.6, 0.881, 0.616, 0.651, 4e-3, 1e-4, 1e-4, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 31.801, 0.03, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "myv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.363, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.917, 0.015, 0.248, 1e-4, 1e-4, 0.022, 1e-4, 1e-3, 0.283, 0.286, 2e-3, 4e-3, 0.691, 0.215, 0.812, 9e-3, 0.174, 0.262, 0.16, 0.093, 0.073, 0.077, 0.073, 0.069, 0.078, 0.133, 0.142, 0.014, 0.011, 5e-3, 0.01, 8e-3, 1e-4, 3e-3, 2e-3, 5e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 0.012, 1e-3, 1e-3, 2e-3, 3e-3, 1e-3, 1e-3, 4e-3, 1e-4, 2e-3, 3e-3, 2e-3, 1e-3, 4e-3, 1e-3, 7e-3, 1e-4, 1e-3, 4e-3, 1e-4, 4e-3, 1e-4, 1e-4, 3e-3, 0.048, 0.012, 0.02, 7e-3, 0.038, 2e-3, 5e-3, 6e-3, 0.024, 2e-3, 8e-3, 0.023, 8e-3, 0.017, 0.019, 8e-3, 1e-4, 0.032, 0.018, 0.013, 0.014, 4e-3, 1e-3, 1e-3, 4e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 2.092, 2.863, 2.802, 0.895, 0.06, 0.084, 0.303, 0.361, 0.574, 0.012, 6e-3, 0.456, 2.653, 0.734, 0.106, 1.014, 0.129, 0.284, 0.186, 0.058, 0.27, 0.019, 7e-3, 0.024, 0.083, 6e-3, 0.182, 0.079, 0.175, 0.059, 0.072, 0.148, 0.231, 0.176, 0.101, 0.047, 0.012, 0.013, 0.018, 0.046, 0.024, 1e-3, 1e-4, 0.091, 2e-3, 0.065, 0.014, 0.024, 3.393, 0.354, 1.588, 0.391, 1, 3.63, 0.2, 0.667, 2.033, 0.447, 2.062, 1.616, 1.324, 3.27, 3.572, 0.635, 1e-4, 1e-4, 0.332, 6e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.017, 1e-4, 1e-3, 1e-3, 27.959, 14.855, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 0.281, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.032, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "mzn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.201, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.629, 2e-3, 0.049, 1e-4, 1e-4, 1e-3, 4e-3, 2e-3, 0.134, 0.134, 1e-4, 1e-4, 0.026, 0.054, 0.593, 0.02, 0.019, 0.017, 0.017, 8e-3, 4e-3, 6e-3, 0.012, 5e-3, 0.01, 0.015, 0.042, 1e-4, 1e-3, 0.014, 1e-3, 4e-3, 1e-4, 4e-3, 3e-3, 5e-3, 3e-3, 6e-3, 0.016, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 9e-3, 6e-3, 2e-3, 1e-3, 4e-3, 1e-4, 3e-3, 5e-3, 7e-3, 1e-3, 1e-3, 0.01, 1e-4, 1e-3, 1e-3, 2e-3, 1e-4, 2e-3, 1e-4, 9e-3, 1e-4, 0.072, 0.016, 0.031, 0.045, 0.106, 0.011, 0.011, 0.023, 0.094, 4e-3, 0.019, 0.044, 0.012, 0.044, 0.054, 0.042, 1e-3, 0.056, 0.056, 0.055, 0.021, 7e-3, 0.011, 5e-3, 0.015, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.44, 0.427, 0.449, 0.013, 1.516, 2.042, 3.291, 3.912, 3.162, 1e-3, 0.032, 0.014, 4.412, 2e-3, 0.195, 7e-3, 0.446, 0.17, 1e-3, 2e-3, 0.012, 4e-3, 1e-4, 1e-3, 0.045, 5e-3, 1e-4, 6e-3, 1e-3, 1e-4, 1e-4, 3e-3, 3e-3, 0.013, 0.18, 0.011, 8e-3, 1e-3, 0.211, 5.124, 1.425, 1.013, 2.263, 0.078, 0.559, 0.214, 0.344, 2.205, 0.318, 3.605, 0.725, 1.866, 1.033, 0.295, 0.164, 0.271, 0.156, 0.676, 0.058, 0.031, 1e-3, 1e-3, 0.258, 1e-4, 1e-4, 1e-4, 0.056, 8e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 9e-3, 3e-3, 1e-4, 3e-3, 1e-4, 1e-3, 1e-3, 2e-3, 19.953, 15.923, 1.548, 5.327, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 0.427, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "na": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.998, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.709, 0.015, 0.646, 1e-4, 2e-3, 1e-4, 4e-3, 0.021, 0.659, 0.659, 0.017, 2e-3, 0.883, 0.333, 1.719, 0.03, 1.451, 2.231, 1.063, 0.565, 0.61, 0.611, 0.586, 0.586, 0.597, 1.829, 0.199, 0.094, 9e-3, 6e-3, 9e-3, 2e-3, 1e-4, 0.49, 0.423, 0.263, 0.348, 0.486, 0.143, 0.225, 0.131, 0.617, 0.095, 0.263, 0.178, 0.552, 0.272, 0.136, 0.483, 0.013, 0.313, 0.36, 0.336, 0.074, 0.114, 0.249, 0.018, 0.046, 0.052, 6e-3, 1e-4, 7e-3, 1e-4, 6e-3, 1e-4, 7.914, 1.267, 0.542, 1.393, 6.136, 0.161, 1.565, 0.525, 5.317, 0.298, 1.632, 1.173, 1.479, 6.133, 5.204, 0.602, 0.04, 3.812, 1.491, 2.75, 1.848, 0.267, 2.105, 0.037, 0.79, 0.308, 1e-4, 1e-4, 1e-4, 0.013, 1e-4, 0.299, 0.053, 0.064, 0.017, 0.038, 0.029, 0.014, 8e-3, 0.026, 3e-3, 7e-3, 7e-3, 0.016, 0.016, 6e-3, 8e-3, 0.013, 0.032, 4e-3, 0.043, 0.108, 2e-3, 4e-3, 0.01, 0.017, 0.017, 0.017, 0.015, 0.011, 8e-3, 9e-3, 0.017, 0.085, 0.124, 0.117, 0.04, 0.025, 0.023, 0.025, 0.032, 0.017, 0.097, 7e-3, 0.031, 0.013, 0.031, 9e-3, 0.016, 0.079, 0.095, 0.056, 0.083, 0.021, 0.063, 0.052, 0.013, 0.046, 0.015, 0.047, 0.045, 0.034, 0.035, 0.045, 0.013, 1e-4, 1e-4, 0.04, 0.466, 0.079, 0.167, 1e-3, 2e-3, 1e-4, 0.023, 0.01, 0.013, 2e-3, 1e-3, 0.027, 6e-3, 0.292, 0.12, 1e-4, 1e-4, 9e-3, 0.199, 0.04, 7e-3, 0.055, 0.037, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.021, 0.074, 0.244, 1e-4, 5e-3, 0.01, 6e-3, 1e-3, 2e-3, 6e-3, 3e-3, 3e-3, 9e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nah": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.08, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.795, 4e-3, 0.316, 1e-4, 1e-4, 1e-3, 1e-4, 0.011, 0.502, 0.505, 6e-3, 0.329, 1.148, 0.317, 0.599, 1.663, 0.178, 0.339, 0.18, 0.099, 0.094, 0.088, 0.135, 0.085, 0.092, 0.204, 0.686, 0.012, 1e-3, 2e-3, 2e-3, 0.012, 1e-4, 0.583, 0.136, 0.486, 0.282, 0.369, 0.108, 0.135, 0.149, 0.382, 0.043, 0.01, 0.153, 0.41, 0.267, 0.154, 0.356, 0.041, 0.209, 0.348, 0.531, 0.077, 0.099, 6e-3, 0.046, 0.078, 0.021, 0.306, 1e-4, 0.304, 1e-4, 0.018, 1e-4, 8.12, 0.52, 3.826, 1.716, 6.024, 0.239, 0.598, 2.703, 7.016, 0.169, 0.062, 5.071, 1.759, 4.856, 5.013, 1.61, 0.66, 3.183, 2.38, 4.798, 3.279, 0.368, 0.013, 0.578, 0.571, 0.892, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.023, 0.52, 3e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 7e-3, 1e-3, 1e-3, 5e-3, 0.446, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 0.26, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 3e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 0.117, 5e-3, 1e-3, 4e-3, 1e-3, 1e-3, 2e-3, 3e-3, 0.168, 0.013, 0.475, 1e-3, 0.136, 0.018, 8e-3, 4e-3, 0.071, 3e-3, 0.269, 2e-3, 3e-3, 1e-3, 1e-3, 3e-3, 2e-3, 0.068, 5e-3, 5e-3, 2e-3, 3e-3, 0.016, 1e-4, 1e-4, 0.033, 0.838, 1.259, 0.446, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 9e-3, 4e-3, 0.012, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 3e-3, 5e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.027, 2e-3, 8e-3, 4e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nap": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.664, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.609, 0.012, 0.443, 1e-4, 1e-4, 5e-3, 2e-3, 3.603, 0.188, 0.187, 1e-3, 1e-3, 0.851, 0.111, 0.916, 0.025, 0.289, 0.464, 0.288, 0.212, 0.187, 0.195, 0.184, 0.177, 0.191, 0.229, 0.063, 0.027, 0.064, 4e-3, 0.064, 4e-3, 1e-4, 0.359, 0.17, 0.431, 0.088, 0.101, 0.128, 0.139, 0.019, 0.153, 0.024, 0.014, 0.18, 0.269, 0.172, 0.129, 0.252, 0.015, 0.136, 0.331, 0.141, 0.042, 0.154, 0.012, 0.021, 4e-3, 0.014, 7e-3, 1e-4, 7e-3, 1e-4, 1e-3, 1e-4, 8.472, 0.677, 3.575, 1.818, 8.836, 0.628, 1.161, 0.605, 5.326, 0.294, 0.072, 2.854, 1.959, 5.855, 5.118, 1.978, 0.107, 4.154, 2.774, 4.302, 3.256, 1.068, 0.047, 0.011, 0.049, 0.778, 1e-4, 0.014, 1e-4, 1e-4, 1e-4, 0.167, 5e-3, 4e-3, 5e-3, 3e-3, 2e-3, 1e-3, 1e-3, 0.017, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 8e-3, 5e-3, 1e-3, 1e-3, 1e-3, 0.033, 0.118, 1e-3, 1e-3, 5e-3, 5e-3, 1e-3, 2e-3, 0.266, 0.085, 0.051, 2e-3, 3e-3, 1e-3, 3e-3, 3e-3, 0.62, 0.161, 0.023, 0.139, 0.069, 0.03, 1e-3, 2e-3, 0.025, 4e-3, 0.164, 0.026, 0.08, 2e-3, 3e-3, 2e-3, 2e-3, 0.107, 0.016, 7e-3, 5e-3, 3e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.057, 1.779, 7e-3, 0.055, 1e-4, 1e-3, 1e-4, 3e-3, 2e-3, 3e-3, 1e-4, 1e-4, 0.013, 6e-3, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 2e-3, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 0.165, 3e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nds": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.919, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.282, 1e-3, 0.235, 1e-4, 1e-4, 0.09, 2e-3, 0.046, 0.155, 0.155, 0.017, 1e-3, 0.777, 0.214, 1.137, 0.014, 0.414, 0.571, 0.279, 0.157, 0.152, 0.165, 0.151, 0.162, 0.212, 0.299, 0.042, 0.019, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 0.383, 0.397, 0.141, 0.527, 0.184, 0.228, 0.238, 0.278, 0.228, 0.153, 0.317, 0.238, 0.331, 0.224, 0.164, 0.212, 7e-3, 0.201, 0.654, 0.206, 0.119, 0.194, 0.231, 3e-3, 8e-3, 0.039, 0.011, 1e-4, 0.011, 1e-4, 1e-3, 1e-4, 4.393, 1.051, 1.267, 3.394, 10.917, 0.767, 1.396, 2.581, 3.914, 0.085, 1.325, 2.618, 1.593, 8.321, 3.314, 0.889, 9e-3, 5.125, 3.768, 5.421, 2.363, 1.177, 0.929, 0.056, 0.171, 0.239, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.454, 2e-3, 2e-3, 1e-3, 6e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 0.023, 1e-3, 1e-4, 0.022, 1e-3, 9e-3, 0.334, 1e-3, 1e-3, 0.057, 1e-3, 0.038, 0.018, 0.048, 4e-3, 1e-3, 1e-3, 0.208, 2e-3, 1e-3, 1e-3, 2e-3, 9e-3, 1e-3, 1e-3, 1e-4, 2e-3, 1e-4, 1e-3, 5e-3, 2e-3, 0.014, 3e-3, 2e-3, 2e-3, 0.82, 1e-3, 4e-3, 1e-3, 1e-3, 1e-3, 0.763, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.055, 1.884, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 7e-3, 3e-3, 8e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.454, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ne": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.49, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.629, 2e-3, 0.033, 1e-4, 1e-4, 6e-3, 1e-4, 0.018, 0.053, 0.057, 1e-4, 1e-3, 0.2, 0.042, 0.073, 8e-3, 3e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.015, 2e-3, 5e-3, 2e-3, 6e-3, 2e-3, 1e-4, 4e-3, 3e-3, 4e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 2e-3, 2e-3, 2e-3, 2e-3, 3e-3, 1e-4, 2e-3, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 0.056, 0.012, 0.021, 0.02, 0.066, 0.011, 0.012, 0.023, 0.048, 1e-3, 5e-3, 0.027, 0.017, 0.042, 0.043, 0.015, 1e-3, 0.044, 0.036, 0.045, 0.017, 5e-3, 8e-3, 1e-3, 0.01, 1e-3, 1e-4, 9e-3, 1e-4, 1e-4, 1e-4, 0.608, 0.76, 0.405, 0.065, 1e-4, 0.231, 0.124, 1.05, 0.333, 0.225, 3e-3, 1.089, 0.054, 2.553, 1e-4, 0.268, 5e-3, 1e-4, 1e-4, 0.016, 9e-3, 1.681, 0.188, 0.574, 0.05, 0.059, 0.235, 0.302, 0.411, 0.024, 0.038, 0.296, 0.063, 0.16, 0.029, 0.16, 24.986, 7.481, 0.637, 0.298, 1.766, 0.034, 0.895, 0.142, 0.406, 0.37, 1.169, 0.857, 2.172, 1e-4, 1.023, 1e-4, 1e-4, 0.652, 0.263, 0.209, 1.099, 0.646, 1e-4, 1e-4, 1e-3, 1e-3, 3.096, 1.51, 1e-4, 1e-4, 6e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.857, 1e-4, 0.028, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "new": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.658, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.736, 1e-4, 5e-3, 1e-4, 1e-4, 0.016, 1e-4, 0.016, 0.053, 0.053, 1e-4, 1e-4, 0.168, 0.064, 0.05, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 0.014, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 3e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.045, 6e-3, 0.015, 0.015, 0.048, 8e-3, 9e-3, 0.021, 0.034, 1e-3, 3e-3, 0.019, 0.011, 0.032, 0.03, 0.01, 1e-4, 0.03, 0.026, 0.034, 0.014, 4e-3, 5e-3, 1e-3, 7e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.748, 1.473, 1.078, 0.313, 1e-4, 0.165, 0.087, 0.934, 0.049, 0.145, 4e-3, 0.213, 0.295, 3.035, 1e-3, 0.021, 0.01, 1e-4, 1e-3, 3e-3, 2e-3, 0.891, 0.378, 1.026, 7e-3, 7e-3, 0.145, 0.227, 0.557, 2e-3, 8e-3, 0.138, 0.03, 0.275, 0.076, 0.203, 24.519, 8.651, 0.655, 0.317, 1.238, 0.066, 0.765, 0.114, 0.288, 0.474, 0.695, 2.038, 1.25, 6e-3, 0.967, 5e-3, 0.016, 1.209, 0.15, 0.223, 0.893, 0.295, 1e-4, 1e-3, 0.016, 1e-4, 3.268, 1.125, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.648, 1e-4, 0.246, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ng": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.332, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.852, 0.014, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.028, 0.028, 1e-4, 1e-4, 0.569, 0.014, 0.833, 1e-4, 1e-4, 0.028, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.042, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.291, 0.028, 0.014, 0.069, 0.125, 1e-4, 0.194, 0.153, 0.5, 0.042, 0.069, 1e-4, 0.056, 0.153, 0.402, 0.083, 1e-4, 1e-4, 0.014, 0.18, 0.222, 1e-4, 0.222, 1e-4, 0.014, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.728, 1.221, 0.236, 1.443, 7.106, 0.347, 2.859, 3.65, 4.136, 0.125, 4.316, 3.539, 3.983, 7.412, 7.883, 1.596, 1e-4, 1.138, 1.901, 3.511, 6.62, 0.402, 2.776, 1e-4, 2.11, 0.194, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.028, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 0.014, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.056, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.056, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.028, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nov": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.223, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.739, 5e-3, 0.371, 1e-4, 1e-4, 4e-3, 1e-4, 0.014, 0.258, 0.258, 3e-3, 8e-3, 0.827, 0.256, 1.132, 0.016, 0.643, 0.521, 0.435, 0.122, 0.19, 0.117, 0.125, 0.112, 0.14, 0.247, 0.122, 0.023, 0.02, 0.012, 0.021, 4e-3, 1e-4, 0.495, 0.126, 0.101, 0.11, 0.205, 0.084, 0.113, 0.079, 0.113, 0.072, 0.274, 0.517, 0.205, 0.19, 0.072, 0.148, 0.01, 0.107, 0.475, 0.124, 0.103, 0.078, 0.049, 6e-3, 0.028, 0.032, 2e-3, 1e-4, 3e-3, 1e-4, 2e-3, 1e-4, 6.407, 1.088, 0.275, 3.233, 10.596, 0.875, 0.958, 0.605, 7.974, 0.212, 2.738, 4.237, 2.737, 5.182, 4.585, 1.557, 0.08, 4.568, 4.834, 4.299, 2.875, 0.823, 0.156, 0.296, 0.238, 0.085, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.026, 9e-3, 0.01, 5e-3, 6e-3, 3e-3, 1e-3, 3e-3, 3e-3, 3e-3, 1e-3, 1e-3, 3e-3, 4e-3, 1e-4, 1e-4, 3e-3, 1e-3, 3e-3, 0.016, 3e-3, 3e-3, 1e-3, 1e-3, 1e-3, 7e-3, 2e-3, 3e-3, 3e-3, 7e-3, 1e-3, 1e-4, 0.012, 8e-3, 2e-3, 5e-3, 5e-3, 2e-3, 3e-3, 3e-3, 8e-3, 0.015, 2e-3, 1e-3, 4e-3, 7e-3, 4e-3, 4e-3, 3e-3, 5e-3, 0.01, 0.013, 3e-3, 2e-3, 6e-3, 4e-3, 0.012, 4e-3, 8e-3, 8e-3, 0.012, 8e-3, 4e-3, 6e-3, 1e-4, 1e-4, 0.013, 0.071, 0.012, 0.013, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.04, 0.019, 0.02, 7e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 8e-3, 0.025, 4e-3, 1e-4, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nrm": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.521, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.376, 4e-3, 0.467, 1e-4, 1e-4, 3e-3, 1e-4, 1.947, 0.163, 0.162, 1e-4, 1e-4, 0.761, 0.157, 0.914, 0.012, 1.102, 1.934, 0.564, 0.483, 0.476, 0.487, 0.557, 0.61, 0.644, 0.66, 0.069, 0.027, 3e-3, 1e-3, 3e-3, 1e-3, 1e-4, 0.78, 0.094, 0.435, 0.253, 0.108, 0.06, 0.094, 0.042, 0.231, 0.101, 9e-3, 0.332, 0.216, 0.104, 0.043, 0.114, 0.015, 0.096, 0.165, 0.06, 0.048, 0.107, 0.012, 0.147, 0.029, 2e-3, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 4.848, 0.485, 1.639, 2.302, 7.56, 0.544, 0.696, 1.469, 3.879, 0.15, 0.04, 3.065, 1.372, 5.618, 3.164, 1.345, 0.499, 2.846, 4.958, 4.48, 3.809, 0.712, 0.015, 0.135, 0.467, 0.062, 1e-4, 1.427, 1e-4, 1e-4, 1e-4, 0.085, 3e-3, 0.016, 2e-3, 4e-3, 2e-3, 1e-3, 1e-4, 2e-3, 0.014, 0.026, 1e-4, 1e-3, 1e-3, 0.016, 1e-4, 1e-3, 1e-3, 1e-3, 0.016, 2e-3, 1e-3, 1e-4, 1e-4, 2e-3, 0.06, 1e-4, 0.023, 2e-3, 1e-3, 1e-4, 1e-3, 0.219, 4e-3, 0.233, 4e-3, 5e-3, 0.011, 1e-4, 0.016, 0.454, 2.065, 0.259, 0.013, 2e-3, 4e-3, 0.368, 8e-3, 1e-3, 8e-3, 2e-3, 4e-3, 0.081, 4e-3, 2e-3, 0.012, 2e-3, 0.151, 4e-3, 0.112, 3e-3, 5e-3, 1e-3, 3e-3, 1e-4, 1e-4, 0.015, 4.079, 0.017, 0.014, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.029, 0.013, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.077, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nso": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.78, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.755, 2e-3, 0.038, 1e-3, 1e-4, 4e-3, 1e-4, 9e-3, 0.457, 0.457, 1e-4, 1e-4, 0.676, 0.052, 0.694, 5e-3, 0.466, 0.863, 0.377, 0.269, 0.237, 0.244, 0.243, 0.245, 0.241, 0.264, 0.019, 4e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.278, 0.349, 0.291, 0.135, 0.079, 0.05, 0.105, 0.055, 0.212, 0.029, 0.164, 0.314, 0.912, 0.402, 0.025, 0.107, 5e-3, 0.046, 0.407, 0.145, 0.02, 0.095, 0.034, 0.21, 5e-3, 0.034, 3e-3, 1e-4, 3e-3, 1e-4, 1e-3, 1e-4, 11.556, 1.304, 0.158, 0.76, 9.745, 0.742, 5.815, 1.511, 2.097, 0.062, 3.221, 3.795, 3.273, 4.341, 8.239, 1.391, 0.015, 2.291, 2.998, 2.898, 0.946, 0.091, 3.286, 0.014, 0.713, 0.058, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 0.019, 0.718, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 0.045, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.083, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 0.134, 1e-4, 0.733, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "nv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.509, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.471, 1e-4, 0.553, 1e-4, 1e-4, 2e-3, 1e-4, 1e-3, 0.132, 0.131, 1e-4, 1e-4, 0.333, 0.05, 0.853, 8e-3, 0.262, 0.198, 0.155, 0.093, 0.082, 0.107, 0.089, 0.066, 0.073, 0.069, 0.012, 0.267, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.105, 0.358, 0.12, 0.313, 0.022, 5e-3, 0.023, 0.24, 0.014, 0.023, 0.045, 0.016, 0.036, 0.298, 0.014, 0.019, 1e-3, 0.01, 0.1, 0.28, 4e-3, 5e-3, 0.04, 1e-3, 0.048, 4e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 5.817, 1.241, 0.605, 3.905, 1.9, 0.016, 1.415, 4.266, 6.018, 0.364, 1.038, 1.394, 0.149, 2.559, 2.764, 0.063, 3e-3, 0.149, 2.248, 2.042, 0.092, 0.019, 0.145, 0.037, 1.033, 1.245, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.08, 1.403, 1.567, 0.013, 0.082, 1.105, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 1e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.067, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.294, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 2.758, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 2.445, 1e-4, 0.311, 1e-4, 4.591, 1e-4, 0.504, 1e-3, 1e-3, 1e-3, 2.002, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.013, 4.172, 1e-3, 1e-4, 0.013, 1e-4, 1e-4, 2e-3, 11.893, 1.899, 1.744, 1e-4, 0.311, 1e-4, 1e-4, 4.171, 1e-4, 1.234, 1e-4, 2e-3, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.08, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ny": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.625, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.431, 1e-3, 0.161, 1e-4, 1e-3, 0.013, 4e-3, 0.199, 0.151, 0.149, 1e-3, 1e-4, 0.726, 0.052, 1.005, 0.011, 0.425, 0.321, 0.242, 0.114, 0.121, 0.146, 0.109, 0.097, 0.1, 0.188, 0.119, 8e-3, 3e-3, 6e-3, 3e-3, 1e-3, 1e-4, 0.324, 0.194, 0.362, 0.113, 0.083, 0.06, 0.055, 0.057, 0.099, 0.059, 0.134, 0.101, 0.607, 0.172, 0.041, 0.204, 5e-3, 0.064, 0.151, 0.1, 0.088, 0.025, 0.048, 3e-3, 0.047, 0.083, 0.018, 1e-4, 0.019, 1e-4, 1e-4, 3e-3, 13.746, 1.132, 1.623, 2.856, 4.347, 0.427, 1.15, 2.997, 7.993, 0.223, 3.837, 3.15, 3.985, 6.204, 4.4, 1.606, 0.018, 2.007, 1.898, 3.156, 4.108, 0.173, 2.53, 0.014, 1.184, 1.868, 1e-4, 1e-4, 1e-3, 2e-3, 1e-4, 0.066, 3e-3, 3e-3, 1e-3, 3e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 4e-3, 1e-3, 1e-3, 1e-4, 1e-4, 4e-3, 0.05, 1e-4, 1e-4, 6e-3, 5e-3, 1e-3, 1e-3, 0.013, 3e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.013, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 4e-3, 1e-3, 6e-3, 1e-3, 0.06, 1e-4, 0.011, 2e-3, 3e-3, 3e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.023, 0.029, 4e-3, 0.064, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 1e-3, 1e-4, 1e-4, 9e-3, 2e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.066, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "oc": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.196, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.065, 2e-3, 0.316, 0.046, 1e-4, 7e-3, 1e-3, 0.708, 0.193, 0.193, 2e-3, 1e-3, 0.913, 0.337, 0.785, 0.01, 0.177, 0.339, 0.143, 0.091, 0.092, 0.097, 0.087, 0.093, 0.11, 0.155, 0.065, 0.02, 0.037, 0.032, 0.038, 2e-3, 1e-4, 0.316, 0.163, 0.28, 0.118, 0.18, 0.101, 0.108, 0.046, 0.126, 0.059, 0.019, 0.366, 0.206, 0.087, 0.061, 0.2, 0.02, 0.116, 0.247, 0.092, 0.045, 0.108, 0.016, 0.03, 9e-3, 7e-3, 0.013, 1e-4, 0.013, 1e-4, 2e-3, 1e-4, 9.22, 0.793, 2.634, 3.53, 8.653, 0.714, 1.084, 0.594, 5.176, 0.154, 0.069, 4.196, 2.017, 5.599, 4.023, 1.809, 0.517, 4.973, 5.482, 4.438, 3.287, 0.768, 0.022, 0.148, 0.146, 0.139, 1e-4, 0.011, 2e-3, 2e-3, 1e-4, 0.071, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 7e-3, 9e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 1e-3, 1e-3, 1e-3, 6e-3, 7e-3, 5e-3, 1e-3, 1e-4, 1e-4, 1e-3, 0.051, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 0.145, 0.074, 0.024, 2e-3, 2e-3, 1e-3, 2e-3, 0.134, 0.929, 0.452, 0.016, 0.026, 1e-3, 0.096, 5e-3, 0.03, 5e-3, 4e-3, 0.448, 0.027, 0.01, 2e-3, 2e-3, 2e-3, 2e-3, 4e-3, 0.011, 0.027, 0.011, 2e-3, 2e-3, 2e-3, 1e-4, 1e-4, 0.068, 2.417, 3e-3, 7e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 8e-3, 4e-3, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.067, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "olo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.555, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.165, 1e-3, 0.091, 1e-4, 1e-4, 9e-3, 1e-3, 0.061, 0.221, 0.221, 1e-4, 1e-3, 0.891, 0.306, 1.442, 0.031, 0.305, 0.513, 0.256, 0.174, 0.154, 0.153, 0.124, 0.134, 0.157, 0.296, 0.102, 0.011, 0.01, 3e-3, 0.01, 2e-3, 1e-3, 0.151, 0.077, 0.024, 0.041, 0.069, 0.036, 0.06, 0.101, 0.085, 0.112, 0.389, 0.128, 0.177, 0.115, 0.068, 0.258, 1e-3, 0.092, 0.352, 0.141, 0.032, 0.27, 0.012, 0.021, 0.024, 0.01, 6e-3, 1e-4, 6e-3, 1e-4, 1e-3, 5e-3, 7.441, 0.351, 0.076, 1.841, 5.414, 0.122, 0.914, 2.187, 8.145, 1.143, 3.3, 4.3, 1.89, 6.075, 4.589, 1.29, 1e-3, 2.71, 3.519, 3.872, 5.598, 2.436, 0.016, 8e-3, 1.054, 0.985, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.389, 0.086, 0.073, 0.032, 0.01, 0.011, 6e-3, 0.01, 8e-3, 1e-3, 2e-3, 6e-3, 0.036, 0.349, 5e-3, 0.017, 9e-3, 4e-3, 0.01, 0.105, 0.013, 2e-3, 2e-3, 2e-3, 5e-3, 0.148, 0.017, 6e-3, 0.011, 0.056, 1e-3, 0.018, 0.051, 0.118, 3e-3, 2e-3, 1.86, 3e-3, 1e-3, 7e-3, 3e-3, 3e-3, 1e-3, 0.01, 1e-3, 3e-3, 1e-3, 2e-3, 0.143, 0.012, 0.077, 0.019, 0.054, 0.096, 0.298, 0.031, 0.077, 0.038, 0.064, 0.07, 0.021, 0.096, 0.259, 0.018, 1e-4, 1e-4, 0.075, 2.173, 0.359, 0.275, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.01, 6e-3, 0.977, 0.34, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 8e-3, 7e-3, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 4e-3, 1e-3, 0.32, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "om": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.856, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.47, 7e-3, 0.135, 1e-3, 1e-3, 0.02, 1e-3, 0.415, 0.149, 0.148, 3e-3, 1e-3, 0.598, 0.088, 0.774, 0.024, 0.177, 0.196, 0.107, 0.055, 0.058, 0.069, 0.055, 0.055, 0.062, 0.111, 0.03, 0.031, 0.014, 3e-3, 0.015, 4e-3, 1e-4, 0.377, 0.227, 0.059, 0.14, 0.066, 0.078, 0.179, 0.124, 0.131, 0.063, 0.149, 0.064, 0.172, 0.076, 0.188, 0.061, 0.049, 0.057, 0.159, 0.099, 0.042, 0.016, 0.108, 0.015, 0.076, 0.01, 0.011, 1e-4, 0.011, 1e-4, 3e-3, 0.13, 18.959, 2.318, 0.672, 2.536, 5.221, 1.607, 1.449, 2.234, 8.071, 0.935, 2.586, 2.201, 2.811, 5.266, 4.391, 0.29, 0.68, 3.658, 3.072, 4.065, 4.017, 0.087, 0.574, 0.143, 1.425, 0.099, 0.01, 1e-3, 0.01, 1e-4, 1e-4, 0.186, 3e-3, 2e-3, 3e-3, 6e-3, 2e-3, 2e-3, 1e-3, 4e-3, 2e-3, 3e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 6e-3, 4e-3, 1e-4, 1e-4, 1e-4, 7e-3, 0.12, 1e-4, 1e-4, 0.011, 0.011, 5e-3, 1e-4, 0.099, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.03, 8e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 3e-3, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.105, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 2e-3, 1e-4, 1e-4, 7e-3, 4e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.024, 0.018, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.191, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "or": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.414, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.789, 1e-3, 0.049, 1e-4, 1e-4, 0.027, 1e-4, 0.016, 0.066, 0.066, 1e-3, 1e-4, 0.194, 0.029, 0.065, 8e-3, 0.012, 0.014, 9e-3, 5e-3, 4e-3, 5e-3, 4e-3, 4e-3, 4e-3, 6e-3, 0.014, 4e-3, 3e-3, 1e-3, 3e-3, 1e-4, 1e-4, 6e-3, 4e-3, 6e-3, 4e-3, 3e-3, 2e-3, 2e-3, 3e-3, 7e-3, 1e-3, 2e-3, 3e-3, 5e-3, 3e-3, 3e-3, 5e-3, 1e-4, 3e-3, 7e-3, 6e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 0.081, 0.011, 0.027, 0.026, 0.08, 0.013, 0.015, 0.029, 0.067, 2e-3, 6e-3, 0.037, 0.021, 0.058, 0.062, 0.019, 1e-3, 0.059, 0.056, 0.058, 0.033, 7e-3, 8e-3, 3e-3, 0.014, 2e-3, 1e-4, 9e-3, 1e-4, 1e-4, 1e-4, 0.461, 0.87, 0.209, 0.086, 1e-4, 0.314, 0.231, 1.688, 0.023, 0.138, 1e-3, 0.379, 0.073, 2.56, 1e-4, 0.427, 2e-3, 1e-4, 1e-4, 0.16, 0.011, 1.385, 0.13, 0.389, 0.041, 0.233, 0.239, 0.105, 0.371, 0.014, 0.058, 0.871, 0.144, 0.225, 0.017, 0.346, 1.495, 0.883, 0.609, 0.353, 1.21, 0.043, 0.827, 0.113, 24.372, 7.183, 0.945, 0.296, 2.678, 0.059, 0.571, 0.283, 1e-4, 0.05, 0.328, 0.264, 0.929, 0.701, 1e-4, 1e-4, 0.094, 1e-4, 2.794, 2.229, 1e-4, 1e-4, 0.045, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.66, 1e-4, 0.069, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "os": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.314, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.198, 1e-3, 0.075, 1e-4, 1e-4, 9e-3, 1e-4, 3e-3, 0.221, 0.221, 1e-4, 1e-3, 0.656, 0.268, 0.647, 3e-3, 0.149, 0.239, 0.119, 0.07, 0.068, 0.074, 0.065, 0.065, 0.08, 0.138, 0.043, 0.023, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 3e-3, 3e-3, 4e-3, 2e-3, 2e-3, 2e-3, 2e-3, 1e-3, 0.024, 1e-3, 1e-3, 2e-3, 3e-3, 2e-3, 2e-3, 3e-3, 1e-4, 2e-3, 5e-3, 2e-3, 1e-3, 7e-3, 1e-3, 0.014, 1e-3, 1e-4, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 0.032, 5e-3, 9e-3, 8e-3, 0.024, 4e-3, 5e-3, 6e-3, 0.02, 1e-3, 5e-3, 0.014, 8e-3, 0.019, 0.019, 4e-3, 1e-4, 0.021, 0.013, 0.014, 0.012, 3e-3, 2e-3, 1e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.723, 1.959, 2.433, 1.742, 0.485, 1.045, 0.733, 0.104, 0.039, 3e-3, 0.515, 3.703, 0.088, 0.047, 0.033, 0.054, 0.152, 0.11, 0.038, 0.09, 0.183, 0.021, 5e-3, 0.03, 0.137, 0.06, 0.132, 0.043, 0.092, 0.063, 0.026, 0.055, 0.062, 0.15, 0.074, 0.109, 0.063, 0.115, 4.882, 0.027, 0.022, 1e-3, 1e-3, 0.076, 1e-4, 0.018, 5e-3, 7e-3, 3.663, 0.542, 0.469, 1.346, 2.223, 0.835, 0.243, 0.949, 1.778, 1.262, 0.952, 1.134, 1.447, 2.532, 1.739, 0.347, 1e-4, 1e-4, 0.16, 4.829, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.01, 1e-4, 2e-3, 1e-3, 23.204, 15.519, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.01, 0.127, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pa": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.424, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.354, 3e-3, 0.052, 1e-4, 1e-4, 5e-3, 1e-4, 0.026, 0.07, 0.07, 1e-4, 1e-3, 0.252, 0.083, 0.057, 8e-3, 0.09, 0.134, 0.073, 0.034, 0.034, 0.037, 0.032, 0.033, 0.039, 0.073, 0.023, 7e-3, 5e-3, 3e-3, 5e-3, 1e-3, 1e-4, 4e-3, 2e-3, 4e-3, 2e-3, 3e-3, 2e-3, 2e-3, 2e-3, 6e-3, 1e-3, 1e-3, 2e-3, 3e-3, 2e-3, 2e-3, 3e-3, 1e-4, 2e-3, 5e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 7e-3, 1e-4, 7e-3, 1e-4, 2e-3, 3e-3, 0.035, 6e-3, 0.011, 0.011, 0.037, 6e-3, 8e-3, 0.011, 0.028, 1e-3, 4e-3, 0.018, 0.013, 0.026, 0.027, 9e-3, 1e-3, 0.025, 0.019, 0.024, 0.012, 4e-3, 4e-3, 1e-3, 5e-3, 1e-3, 1e-4, 8e-3, 1e-4, 1e-4, 1e-4, 1.534, 0.423, 1.17, 1e-3, 1e-3, 0.437, 0.548, 1.695, 0.606, 0.237, 0.024, 0.573, 0.09, 0.23, 1e-3, 0.065, 0.035, 1e-4, 1e-3, 0.028, 0.011, 1.172, 0.229, 0.428, 0.077, 0.013, 0.442, 0.041, 0.755, 0.032, 1e-3, 0.286, 0.066, 0.192, 0.017, 0.267, 1.499, 0.487, 1.308, 0.154, 24.532, 6.371, 0.647, 0.143, 0.447, 0.172, 0.696, 0.068, 2.373, 0.727, 0.943, 5e-3, 1e-3, 0.891, 1e-3, 1e-3, 1.461, 1.12, 1e-3, 1e-3, 0.465, 1e-3, 2.611, 1.487, 1e-4, 1e-4, 0.039, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 6e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 30.092, 1e-3, 0.038, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pag": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.03, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.592, 0.019, 0.241, 1e-4, 1e-4, 2e-3, 1e-4, 0.022, 0.579, 0.579, 1e-3, 2e-3, 1.012, 0.179, 1.28, 4e-3, 0.607, 0.517, 0.439, 0.246, 0.233, 0.22, 0.206, 0.189, 0.188, 0.203, 0.287, 0.029, 0.2, 3e-3, 0.2, 7e-3, 1e-4, 0.514, 0.233, 0.299, 0.377, 0.293, 0.091, 0.061, 0.039, 0.141, 0.067, 0.298, 0.143, 0.228, 0.153, 0.107, 0.323, 0.017, 0.066, 0.835, 0.144, 0.158, 0.036, 0.141, 1e-3, 0.016, 0.024, 0.044, 1e-4, 0.045, 1e-4, 1e-3, 1e-4, 14.553, 2.155, 0.612, 2.213, 4.092, 0.158, 2.144, 0.652, 5.448, 0.026, 2.943, 4.371, 1.62, 6.468, 4.169, 1.489, 0.134, 1.92, 4.171, 4.111, 1.822, 0.133, 0.774, 0.019, 2.966, 0.181, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.082, 3e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 5e-3, 2e-3, 1e-4, 1e-3, 1e-3, 1e-3, 0.048, 1e-4, 1e-3, 0.01, 9e-3, 1e-4, 1e-4, 4e-3, 0.017, 1e-4, 1e-3, 2e-3, 1e-3, 4e-3, 2e-3, 1e-3, 8e-3, 1e-3, 1e-3, 1e-3, 5e-3, 1e-4, 1e-3, 3e-3, 0.012, 2e-3, 5e-3, 2e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 5e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 4e-3, 0.049, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 9e-3, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 3e-3, 0.075, 4e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pam": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.69, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.089, 8e-3, 0.379, 1e-3, 2e-3, 6e-3, 2e-3, 0.032, 0.278, 0.278, 2e-3, 2e-3, 1.032, 0.272, 0.824, 0.024, 0.328, 0.294, 0.247, 0.119, 0.115, 0.114, 0.097, 0.092, 0.106, 0.173, 0.084, 0.034, 0.037, 5e-3, 0.037, 4e-3, 1e-4, 0.446, 0.258, 0.283, 0.225, 0.147, 0.167, 0.119, 0.095, 0.427, 0.078, 0.159, 0.17, 0.339, 0.137, 0.085, 0.26, 0.014, 0.119, 0.316, 0.173, 0.073, 0.129, 0.078, 0.01, 0.038, 0.027, 0.056, 1e-4, 0.058, 1e-4, 3e-3, 1e-4, 11.717, 1.42, 1.079, 1.934, 5.65, 0.412, 5.535, 0.984, 6.498, 0.051, 2.215, 3.499, 2.546, 9.826, 2.443, 1.882, 0.041, 3.326, 2.846, 3.809, 3.421, 0.311, 0.524, 0.064, 1.429, 0.196, 1e-4, 0.012, 1e-3, 1e-4, 1e-4, 0.064, 7e-3, 4e-3, 5e-3, 4e-3, 2e-3, 3e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 6e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 0.019, 4e-3, 2e-3, 2e-3, 2e-3, 3e-3, 9e-3, 2e-3, 2e-3, 0.017, 8e-3, 9e-3, 0.013, 0.012, 0.022, 7e-3, 2e-3, 0.067, 5e-3, 5e-3, 5e-3, 9e-3, 0.033, 4e-3, 3e-3, 3e-3, 6e-3, 6e-3, 4e-3, 0.01, 0.012, 0.01, 0.01, 6e-3, 3e-3, 0.032, 2e-3, 4e-3, 3e-3, 8e-3, 7e-3, 0.067, 1e-3, 5e-3, 3e-3, 1e-4, 1e-4, 0.014, 0.263, 5e-3, 6e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 8e-3, 6e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.04, 0.011, 0.063, 1e-4, 1e-3, 4e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pap": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.577, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 17.041, 6e-3, 0.256, 2e-3, 1e-3, 8e-3, 5e-3, 0.088, 0.145, 0.144, 1e-3, 1e-3, 0.829, 0.082, 0.948, 0.014, 0.296, 0.379, 0.247, 0.133, 0.132, 0.125, 0.108, 0.098, 0.111, 0.184, 0.198, 0.046, 9e-3, 3e-3, 9e-3, 0.012, 1e-4, 0.325, 0.157, 0.17, 0.173, 0.346, 0.09, 0.081, 0.124, 0.155, 0.09, 0.129, 0.105, 0.233, 0.162, 0.14, 0.176, 5e-3, 0.132, 0.285, 0.134, 0.07, 0.056, 0.051, 3e-3, 0.069, 0.012, 0.014, 1e-4, 0.014, 1e-4, 3e-3, 1e-4, 10.584, 1.755, 0.96, 3.481, 6.611, 0.57, 0.793, 1.086, 6.922, 0.094, 2.168, 2.197, 2.209, 6.462, 5.124, 1.889, 0.017, 4.387, 3.838, 4.459, 3.468, 0.348, 0.249, 0.043, 0.415, 0.112, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.051, 6e-3, 3e-3, 6e-3, 4e-3, 1e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.012, 2e-3, 5e-3, 3e-3, 1e-3, 1e-3, 1e-3, 6e-3, 0.016, 1e-3, 1e-3, 0.01, 0.01, 1e-3, 1e-3, 0.023, 0.288, 3e-3, 3e-3, 3e-3, 1e-3, 2e-3, 7e-3, 0.143, 0.171, 2e-3, 3e-3, 1e-3, 0.133, 1e-4, 2e-3, 3e-3, 0.162, 0.171, 0.076, 1e-3, 2e-3, 2e-3, 1e-3, 4e-3, 0.053, 0.027, 3e-3, 0.086, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 0.023, 1.326, 4e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 7e-3, 4e-3, 0.023, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 7e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 7e-3, 0.048, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pcd": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.27, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.657, 8e-3, 0.673, 1e-4, 1e-4, 3e-3, 4e-3, 1.579, 0.485, 0.482, 4e-3, 2e-3, 0.764, 0.743, 0.844, 0.029, 0.205, 0.439, 0.185, 0.104, 0.105, 0.099, 0.112, 0.109, 0.159, 0.228, 0.141, 0.017, 0.014, 0.103, 0.015, 5e-3, 1e-4, 0.322, 0.315, 0.578, 0.163, 0.158, 0.188, 0.128, 0.139, 0.259, 0.095, 0.035, 0.293, 0.23, 0.148, 0.082, 0.416, 0.024, 0.141, 0.362, 0.132, 0.056, 0.121, 0.049, 0.026, 0.011, 8e-3, 8e-3, 1e-4, 9e-3, 1e-4, 4e-3, 4e-3, 4.164, 0.548, 3.109, 2.876, 7.669, 0.633, 0.742, 2.062, 6.133, 0.168, 0.261, 3.265, 1.584, 5.6, 3.825, 1.718, 0.299, 3.984, 4.345, 3.994, 3.516, 0.729, 0.062, 0.099, 0.331, 0.121, 1e-4, 8e-3, 1e-3, 1e-3, 1e-4, 0.34, 6e-3, 9e-3, 4e-3, 3e-3, 2e-3, 3e-3, 3e-3, 0.01, 0.086, 2e-3, 1e-3, 4e-3, 5e-3, 3e-3, 2e-3, 3e-3, 2e-3, 2e-3, 0.018, 9e-3, 1e-3, 1e-3, 2e-3, 3e-3, 0.283, 1e-3, 3e-3, 3e-3, 2e-3, 1e-3, 1e-3, 0.283, 6e-3, 0.038, 3e-3, 5e-3, 6e-3, 3e-3, 0.025, 0.548, 2.644, 0.014, 0.04, 2e-3, 5e-3, 9e-3, 0.049, 0.019, 6e-3, 0.015, 7e-3, 0.051, 4e-3, 2e-3, 0.022, 7e-3, 0.018, 5e-3, 0.043, 8e-3, 5e-3, 4e-3, 7e-3, 1e-4, 1e-4, 0.109, 3.762, 7e-3, 0.017, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 3e-3, 1e-4, 1e-4, 0.018, 8e-3, 0.022, 7e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 9e-3, 5e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 6e-3, 0.329, 1e-3, 2e-3, 9e-3, 6e-3, 2e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pdc": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.347, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.345, 0.014, 0.296, 1e-4, 2e-3, 1e-3, 4e-3, 0.083, 0.252, 0.251, 4e-3, 1e-4, 0.899, 0.34, 1.232, 0.016, 0.318, 0.569, 0.233, 0.139, 0.122, 0.133, 0.151, 0.187, 0.197, 0.319, 0.11, 0.028, 9e-3, 1e-3, 9e-3, 0.014, 1e-3, 0.435, 0.396, 0.269, 0.612, 0.446, 0.261, 0.34, 0.266, 0.158, 0.126, 0.345, 0.316, 0.408, 0.189, 0.112, 0.446, 0.018, 0.164, 0.922, 0.173, 0.1, 0.127, 0.257, 3e-3, 0.091, 0.087, 1e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-3, 5.822, 0.784, 2.856, 3.127, 10.434, 0.913, 1.544, 3.717, 6.407, 0.033, 0.633, 2.751, 1.821, 6.435, 2.483, 0.545, 0.012, 4.834, 4.912, 3.94, 2.397, 0.665, 1.309, 0.053, 0.442, 0.521, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.13, 3e-3, 1e-3, 2e-3, 4e-3, 2e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.012, 1e-3, 1e-4, 1e-3, 1e-4, 0.012, 0.052, 1e-4, 1e-4, 0.021, 0.02, 0.013, 0.012, 5e-3, 5e-3, 1e-3, 2e-3, 0.087, 1e-3, 2e-3, 4e-3, 2e-3, 0.014, 2e-3, 1e-3, 2e-3, 5e-3, 1e-4, 2e-3, 2e-3, 7e-3, 5e-3, 0.01, 0.013, 1e-3, 0.014, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 0.03, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.019, 0.191, 4e-3, 4e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 3e-3, 3e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 0.011, 7e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.129, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pfl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.263, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.706, 9e-3, 0.364, 1e-4, 1e-4, 0.013, 1e-3, 0.091, 0.195, 0.195, 3e-3, 1e-3, 0.686, 0.342, 1.046, 0.015, 0.201, 0.285, 0.126, 0.084, 0.075, 0.083, 0.073, 0.08, 0.09, 0.133, 0.057, 7e-3, 4e-3, 2e-3, 5e-3, 3e-3, 1e-4, 0.282, 0.468, 0.129, 0.696, 0.183, 0.211, 0.353, 0.23, 0.145, 0.127, 0.364, 0.254, 0.349, 0.172, 0.165, 0.214, 7e-3, 0.306, 0.587, 0.085, 0.112, 0.133, 0.253, 4e-3, 4e-3, 0.083, 4e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-3, 5.458, 1.123, 3.147, 5.166, 9.364, 1.012, 2.021, 4.491, 5.715, 0.138, 0.564, 2.856, 2.578, 5.721, 2.982, 0.339, 0.016, 4.316, 5.155, 2.124, 2.997, 0.789, 1.349, 0.04, 0.119, 0.948, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.073, 1e-3, 1e-3, 1e-3, 0.025, 7e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 0.014, 1e-3, 5e-3, 2e-3, 1e-4, 1e-3, 4e-3, 1e-3, 1e-3, 0.027, 1e-3, 0.026, 0.15, 0.041, 8e-3, 0.01, 1e-3, 1.309, 0.09, 1e-4, 2e-3, 0.017, 0.105, 2e-3, 2e-3, 0.07, 0.023, 1e-4, 2e-3, 4e-3, 1e-3, 0.016, 0.015, 3e-3, 0.033, 0.029, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 0.044, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.024, 1.987, 1e-3, 0.015, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 1e-3, 1e-3, 1e-4, 2e-3, 1e-3, 6e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.07, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.055, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.983, 3e-3, 0.019, 1e-4, 1e-4, 1e-3, 1e-4, 5e-3, 0.015, 0.015, 1e-4, 1e-4, 0.196, 0.05, 0.162, 1e-3, 0.012, 0.032, 0.016, 0.014, 0.013, 0.015, 0.012, 0.01, 8e-3, 0.011, 0.012, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 1e-4, 0.014, 8e-3, 5e-3, 0.012, 9e-3, 3e-3, 3e-3, 8e-3, 3e-3, 3e-3, 5e-3, 5e-3, 6e-3, 0.016, 4e-3, 0.013, 1e-4, 5e-3, 0.023, 0.015, 0.011, 2e-3, 3e-3, 1e-4, 0.036, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.761, 0.196, 0.276, 0.305, 0.454, 0.017, 0.165, 0.648, 0.799, 0.068, 0.545, 0.11, 0.265, 0.512, 0.167, 0.383, 1e-4, 0.263, 0.542, 0.555, 0.3, 0.254, 0.017, 2e-3, 0.396, 0.01, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.585, 1.349, 0.631, 0.309, 1e-3, 0.704, 0.099, 0.738, 0.496, 0.135, 2e-3, 0.598, 0.015, 3.249, 1e-4, 0.471, 4e-3, 1e-3, 1e-4, 7e-3, 8e-3, 1.087, 0.017, 0.945, 0.067, 0.032, 0.055, 4e-3, 0.076, 2e-3, 0.011, 0.133, 0.012, 0.507, 1e-3, 0.315, 18.309, 9.394, 0.355, 1.002, 0.59, 0.225, 0.335, 0.42, 0.344, 0.341, 0.537, 1.408, 2.487, 0.078, 0.724, 1e-3, 1e-4, 0.527, 0.043, 0.432, 2.004, 0.558, 1e-4, 1e-4, 0.014, 1e-4, 1.176, 0.438, 1e-4, 1e-4, 1e-4, 0.095, 0.876, 0.019, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 26.149, 0.497, 0.061, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pih": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.022, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.521, 9e-3, 0.204, 1e-4, 1e-4, 4e-3, 1e-3, 2.454, 0.291, 0.293, 2e-3, 1e-3, 0.888, 0.295, 1.488, 0.018, 0.431, 0.479, 0.302, 0.13, 0.163, 0.176, 0.152, 0.154, 0.17, 0.228, 0.107, 0.024, 2e-3, 4e-3, 2e-3, 1e-4, 1e-4, 0.58, 0.327, 0.222, 0.2, 0.438, 0.166, 0.153, 0.179, 0.225, 0.154, 0.281, 0.167, 0.407, 0.329, 0.234, 0.386, 4e-3, 0.196, 0.528, 0.379, 0.134, 0.065, 0.116, 1e-4, 0.083, 0.034, 2e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 8.21, 0.769, 1.021, 1.638, 6.843, 0.747, 0.93, 1.82, 7.969, 0.261, 1.7, 3.13, 1.378, 5.431, 3.567, 1.341, 0.022, 3.668, 4.749, 4.715, 2.394, 0.289, 0.906, 0.045, 1.135, 0.094, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.092, 0.039, 0.046, 0.01, 0.019, 8e-3, 6e-3, 3e-3, 9e-3, 1e-3, 1e-3, 0.017, 0.011, 7e-3, 6e-3, 0.02, 0.015, 9e-3, 1e-3, 0.019, 0.012, 1e-4, 1e-3, 6e-3, 3e-3, 0.028, 4e-3, 9e-3, 2e-3, 7e-3, 2e-3, 6e-3, 0.077, 0.019, 6e-3, 4e-3, 2e-3, 1e-3, 1e-3, 4e-3, 6e-3, 0.035, 0.017, 4e-3, 4e-3, 0.012, 4e-3, 1e-4, 0.082, 0.011, 0.044, 0.037, 0.018, 0.034, 7e-3, 0.017, 0.057, 8e-3, 0.047, 0.04, 0.021, 0.031, 0.077, 0.012, 1e-4, 1e-4, 0.098, 0.125, 0.02, 0.026, 2e-3, 1e-4, 1e-4, 0.016, 7e-3, 4e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.45, 0.193, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 0.026, 0.048, 1e-4, 1e-4, 3e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-3, 2e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pms": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.299, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.832, 1e-3, 0.162, 1e-4, 1e-4, 4e-3, 1e-3, 1.011, 0.156, 0.156, 1e-4, 1e-4, 1.253, 0.787, 0.992, 0.342, 0.318, 0.594, 0.327, 0.281, 0.214, 0.205, 0.231, 0.17, 0.187, 0.641, 0.121, 0.014, 0.149, 0.035, 0.149, 0.034, 1e-4, 0.513, 0.293, 0.3, 0.101, 0.054, 0.096, 0.128, 0.035, 0.079, 0.03, 0.029, 0.305, 0.216, 0.126, 0.053, 0.205, 8e-3, 0.226, 0.291, 0.098, 0.028, 0.104, 0.023, 0.014, 0.012, 0.01, 2e-3, 1e-4, 2e-3, 1e-4, 0.011, 1e-4, 9.348, 0.753, 2.346, 3.335, 4.488, 0.731, 0.919, 0.76, 4.936, 0.31, 0.385, 3.85, 2.042, 6.393, 3.543, 1.375, 0.084, 3.728, 4.566, 4.041, 1.559, 0.688, 0.145, 0.036, 0.118, 0.134, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.165, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 7e-3, 1e-3, 0.059, 2e-3, 1e-3, 4e-3, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 0.02, 0.115, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 0.661, 7e-3, 5e-3, 1e-3, 4e-3, 1e-4, 1e-3, 4e-3, 0.295, 0.64, 2e-3, 2.121, 0.312, 6e-3, 1e-3, 1e-3, 2e-3, 6e-3, 0.658, 0.012, 0.019, 1e-3, 3e-3, 1e-4, 1e-3, 0.07, 2e-3, 2e-3, 5e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.286, 4.639, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 2e-3, 7e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.137, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pnb": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.056, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.3, 1e-3, 0.061, 1e-4, 1e-4, 4e-3, 1e-4, 0.019, 0.084, 0.084, 1e-4, 1e-3, 0.02, 0.088, 0.041, 8e-3, 0.132, 0.201, 0.102, 0.067, 0.062, 0.067, 0.058, 0.058, 0.067, 0.099, 0.044, 0.011, 0.014, 0.019, 0.014, 1e-4, 1e-4, 5e-3, 0.015, 4e-3, 7e-3, 4e-3, 2e-3, 6e-3, 2e-3, 6e-3, 4e-3, 1e-3, 2e-3, 2e-3, 3e-3, 2e-3, 3e-3, 1e-4, 4e-3, 4e-3, 5e-3, 1e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-4, 0.016, 1e-4, 0.016, 1e-4, 1e-3, 1e-3, 0.078, 7e-3, 0.025, 0.032, 0.067, 0.025, 0.012, 0.031, 0.075, 1e-3, 5e-3, 0.047, 0.03, 0.057, 0.061, 0.011, 1e-3, 0.056, 0.035, 0.078, 0.015, 0.016, 5e-3, 1e-3, 0.026, 1e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.037, 1.78, 0.208, 2e-3, 1.668, 1.155, 3.673, 0.01, 3.168, 1e-3, 5e-3, 3e-3, 4.417, 1e-3, 0.019, 0.031, 0.026, 0.339, 2.06, 0.022, 0.634, 1e-3, 1e-4, 1e-4, 0.015, 9e-3, 1e-4, 4e-3, 2e-3, 2e-3, 1e-4, 2e-3, 0.01, 0.033, 0.198, 1e-3, 0.068, 2e-3, 0.419, 5.965, 1.027, 1.695, 1.567, 0.022, 0.752, 0.178, 0.132, 2.73, 0.025, 2.399, 0.214, 1.507, 0.366, 0.211, 0.103, 0.103, 0.037, 0.788, 1.21, 1e-3, 1e-3, 2e-3, 1.61, 1e-3, 1e-4, 1e-4, 0.01, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 7e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 17.991, 10.598, 5.545, 8.408, 1e-4, 4e-3, 1e-4, 1e-4, 8e-3, 1e-3, 0.037, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "pnt": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.111, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8.571, 1e-3, 0.271, 1e-4, 1e-4, 1e-3, 1e-3, 0.535, 0.166, 0.167, 3e-3, 1e-3, 0.374, 0.066, 0.728, 6e-3, 0.22, 0.256, 0.213, 0.123, 0.09, 0.093, 0.091, 0.105, 0.105, 0.136, 0.082, 3e-3, 6e-3, 5e-3, 6e-3, 1e-4, 1e-4, 0.027, 9e-3, 0.018, 7e-3, 8e-3, 2e-3, 7e-3, 7e-3, 0.011, 5e-3, 0.01, 6e-3, 0.014, 4e-3, 3e-3, 0.01, 1e-3, 9e-3, 9e-3, 0.01, 1e-3, 2e-3, 9e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.102, 0.019, 0.03, 0.031, 0.116, 0.01, 0.025, 0.028, 0.096, 2e-3, 0.026, 0.047, 0.026, 0.078, 0.081, 0.022, 2e-3, 0.09, 0.05, 0.057, 0.045, 0.011, 5e-3, 4e-3, 0.012, 9e-3, 1e-4, 0.182, 1e-4, 1e-4, 1e-4, 1.086, 2.28, 1.131, 1.649, 3.333, 0.911, 0.24, 0.496, 0.069, 0.319, 0.04, 1e-3, 0.823, 0.357, 0.222, 2e-3, 0.015, 0.24, 0.073, 0.124, 0.043, 0.159, 8e-3, 0.102, 0.032, 0.07, 0.198, 0.037, 0.134, 0.044, 5e-3, 0.136, 0.134, 0.042, 1e-3, 0.198, 0.245, 5e-3, 0.018, 0.079, 3e-3, 8e-3, 1e-3, 0.042, 1.012, 0.786, 0.269, 1.272, 0.017, 4.369, 0.221, 0.746, 0.384, 2.578, 0.144, 1.385, 0.301, 1.937, 1.463, 1.533, 1.22, 4.421, 0.103, 3.268, 1e-4, 1e-4, 0.091, 0.022, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 29.379, 12.776, 0.049, 0.015, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 3e-3, 0.011, 9e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.059, 0.041, 1e-4, 1e-3, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ps": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.579, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.932, 4e-3, 0.044, 1e-4, 1e-4, 3e-3, 1e-4, 2e-3, 0.118, 0.118, 1e-3, 1e-3, 0.026, 0.037, 0.443, 9e-3, 0.022, 0.03, 0.021, 0.014, 0.011, 0.012, 0.01, 9e-3, 0.01, 0.013, 0.062, 1e-3, 2e-3, 5e-3, 2e-3, 1e-4, 1e-4, 0.015, 7e-3, 0.011, 7e-3, 6e-3, 5e-3, 4e-3, 7e-3, 9e-3, 2e-3, 3e-3, 5e-3, 0.01, 6e-3, 4e-3, 9e-3, 1e-3, 6e-3, 0.013, 9e-3, 3e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-4, 4e-3, 1e-4, 3e-3, 1e-4, 0.147, 0.023, 0.055, 0.054, 0.165, 0.027, 0.031, 0.061, 0.131, 2e-3, 0.012, 0.073, 0.048, 0.109, 0.113, 0.034, 2e-3, 0.103, 0.097, 0.116, 0.047, 0.015, 0.017, 5e-3, 0.027, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.103, 0.528, 0.202, 0.231, 2.393, 1.822, 2.655, 3.163, 4.608, 0.307, 2.451, 6e-3, 1.513, 0.136, 0.015, 9e-3, 1.675, 4e-3, 9e-3, 0.507, 5e-3, 1e-4, 0.154, 1e-3, 0.093, 2e-3, 0.229, 7e-3, 5e-3, 3e-3, 1e-4, 6e-3, 0.024, 0.025, 0.048, 0.014, 0.025, 8e-3, 0.038, 4.145, 0.839, 1.375, 1.43, 0.077, 0.25, 0.229, 0.647, 2.983, 0.085, 2.528, 0.449, 1.14, 0.525, 0.146, 0.073, 0.106, 0.064, 0.333, 0.407, 0.02, 0.265, 5e-3, 1.278, 2e-3, 1e-4, 1e-4, 0.016, 3e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.028, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 16.081, 19.012, 3.763, 3.368, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 0.026, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.038, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "qu": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.204, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.108, 2e-3, 0.638, 1e-4, 1e-4, 4e-3, 2e-3, 0.39, 0.494, 0.494, 0.05, 2e-3, 1.04, 0.188, 0.977, 0.036, 0.261, 0.409, 0.214, 0.137, 0.12, 0.137, 0.117, 0.112, 0.136, 0.208, 0.401, 0.061, 0.041, 6e-3, 0.041, 4e-3, 1e-4, 0.371, 0.173, 0.36, 0.119, 0.076, 0.064, 0.097, 0.189, 0.192, 0.096, 0.255, 0.187, 0.305, 0.078, 0.042, 0.428, 0.148, 0.146, 0.31, 0.198, 0.198, 0.061, 0.174, 0.014, 0.102, 0.014, 0.014, 1e-4, 0.015, 1e-4, 2e-3, 1e-4, 14.813, 0.229, 1.579, 0.795, 1.296, 0.084, 0.286, 2.331, 7.773, 0.067, 3.004, 4.09, 3.086, 5.006, 1.165, 2.96, 3.746, 3.293, 3.447, 3.494, 5.678, 0.135, 1.682, 0.024, 2.244, 0.111, 1e-4, 3e-3, 1e-3, 1e-4, 1e-4, 0.055, 0.016, 9e-3, 0.013, 8e-3, 6e-3, 4e-3, 6e-3, 4e-3, 4e-3, 3e-3, 2e-3, 6e-3, 7e-3, 3e-3, 2e-3, 0.012, 0.023, 2e-3, 0.011, 4e-3, 4e-3, 3e-3, 2e-3, 4e-3, 0.015, 3e-3, 3e-3, 5e-3, 3e-3, 2e-3, 3e-3, 0.038, 0.068, 4e-3, 5e-3, 0.014, 5e-3, 6e-3, 9e-3, 7e-3, 0.056, 5e-3, 5e-3, 5e-3, 0.075, 4e-3, 6e-3, 0.014, 0.34, 0.013, 0.069, 7e-3, 8e-3, 6e-3, 5e-3, 0.016, 9e-3, 0.022, 8e-3, 0.011, 9e-3, 0.01, 0.01, 1e-4, 1e-4, 0.026, 0.649, 0.01, 9e-3, 1e-3, 1e-3, 1e-4, 2e-3, 1e-3, 8e-3, 2e-3, 1e-4, 0.042, 0.02, 0.051, 0.016, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 6e-3, 0.016, 0.012, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.031, 0.016, 0.047, 1e-3, 1e-3, 6e-3, 5e-3, 2e-3, 2e-3, 2e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "rm": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.612, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.511, 3e-3, 0.167, 1e-4, 1e-4, 0.015, 1e-4, 0.104, 0.151, 0.151, 3e-3, 1e-4, 0.439, 0.065, 0.823, 0.012, 0.199, 0.275, 0.114, 0.07, 0.072, 0.078, 0.067, 0.073, 0.099, 0.138, 0.045, 0.054, 5e-3, 2e-3, 5e-3, 2e-3, 1e-4, 0.139, 0.111, 0.151, 0.1, 0.17, 0.069, 0.113, 0.045, 0.217, 0.028, 0.029, 0.208, 0.121, 0.055, 0.036, 0.132, 0.042, 0.086, 0.226, 0.106, 0.051, 0.07, 0.023, 3e-3, 3e-3, 8e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-3, 11.404, 0.601, 3.031, 3.677, 6.353, 0.757, 1.578, 1.412, 6.549, 0.076, 0.068, 4.778, 1.866, 6.046, 2.159, 1.856, 0.265, 4.97, 5.963, 4.375, 3.712, 1.407, 0.03, 0.131, 0.049, 0.802, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.828, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.043, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 0.675, 1e-4, 1e-3, 3e-3, 1e-3, 1e-3, 1e-4, 0.294, 3e-3, 2e-3, 1e-4, 6e-3, 1e-3, 1e-3, 2e-3, 0.333, 0.017, 2e-3, 0.02, 0.128, 3e-3, 1e-4, 1e-3, 4e-3, 2e-3, 0.027, 4e-3, 1e-3, 1e-3, 0.012, 1e-4, 1e-3, 0.054, 0.054, 0.02, 0.042, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.079, 0.841, 4e-3, 4e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.828, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "rmy": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.439, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.022, 9e-3, 0.624, 1e-3, 1e-4, 0.014, 3e-3, 0.015, 0.443, 0.441, 3e-3, 3e-3, 1.038, 0.232, 0.983, 0.037, 0.243, 0.24, 0.172, 0.071, 0.075, 0.081, 0.064, 0.056, 0.058, 0.153, 0.179, 0.028, 1e-4, 7e-3, 1e-4, 7e-3, 1e-4, 0.429, 0.231, 0.183, 0.167, 0.219, 0.086, 0.091, 0.078, 0.193, 0.094, 0.424, 0.255, 0.23, 0.124, 0.22, 0.316, 9e-3, 0.404, 0.577, 0.193, 0.066, 0.142, 0.014, 8e-3, 0.107, 0.022, 3e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-3, 10.986, 1.012, 0.769, 2.129, 6.975, 0.334, 0.958, 2.547, 6.287, 0.364, 2.952, 3.16, 1.944, 5.241, 5.031, 1.512, 0.108, 4.343, 3.649, 3.301, 2.127, 1.805, 0.051, 0.119, 2.702, 0.234, 1e-4, 3e-3, 1e-3, 1e-3, 1e-4, 0.065, 0.024, 0.024, 0.136, 0.011, 6e-3, 0.01, 0.023, 9e-3, 1e-3, 5e-3, 0.016, 0.01, 0.054, 0.02, 4e-3, 3e-3, 7e-3, 1e-3, 0.025, 8e-3, 9e-3, 4e-3, 7e-3, 4e-3, 0.054, 5e-3, 0.044, 6e-3, 2e-3, 3e-3, 8e-3, 0.038, 0.056, 0.061, 4e-3, 0.069, 0.023, 0.011, 0.016, 0.012, 0.016, 0.02, 6e-3, 3e-3, 0.014, 0.084, 0.01, 0.051, 0.028, 0.039, 0.03, 0.013, 0.014, 9e-3, 7e-3, 0.027, 7e-3, 0.021, 0.023, 0.024, 0.034, 0.062, 0.014, 1e-4, 1e-4, 0.036, 0.28, 0.165, 0.061, 1e-4, 0.011, 0.089, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 7e-3, 3e-3, 0.242, 0.129, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 0.026, 0.02, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.128, 5e-3, 0.037, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 4e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "rn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.466, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.984, 0.029, 0.062, 1e-4, 1e-4, 3e-3, 1e-4, 0.574, 0.079, 0.089, 0.011, 1e-4, 1.075, 0.049, 1.054, 0.052, 0.102, 0.296, 0.219, 0.136, 0.097, 0.085, 0.071, 0.069, 0.063, 0.086, 0.222, 0.076, 0.048, 1e-4, 0.048, 0.055, 1e-4, 0.35, 0.153, 0.043, 0.033, 0.087, 0.042, 0.05, 0.106, 0.336, 0.016, 0.136, 0.035, 0.208, 0.24, 0.02, 0.055, 1e-3, 0.138, 0.132, 0.082, 0.29, 0.029, 0.019, 1e-4, 0.195, 0.032, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 10.973, 3.104, 0.817, 1.265, 5.117, 0.295, 2.193, 1.806, 7.318, 0.542, 2.677, 0.668, 3.393, 5.179, 4.081, 0.677, 4e-3, 4.518, 2.135, 2.161, 5.935, 1.185, 2.07, 7e-3, 2.3, 1.432, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.174, 0.023, 2e-3, 5e-3, 7e-3, 4e-3, 3e-3, 3e-3, 6e-3, 1e-4, 4e-3, 1e-4, 0.015, 0.271, 0.012, 2e-3, 8e-3, 4e-3, 4e-3, 8e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 0.284, 1e-4, 0.196, 5e-3, 2e-3, 4e-3, 0.014, 0.082, 0.437, 9e-3, 1e-4, 1e-4, 6e-3, 1e-3, 0.018, 2e-3, 0.13, 2e-3, 0.17, 1e-4, 0.586, 7e-3, 0.108, 4e-3, 0.019, 1e-3, 0.014, 7e-3, 1e-3, 0.01, 1e-3, 1e-3, 2e-3, 0.049, 0.153, 0.015, 0.123, 0.121, 1e-4, 1e-4, 1e-4, 0.386, 1.335, 0.539, 0.45, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.015, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.02, 0.053, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 0.167, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "rue": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.059, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.931, 3e-3, 0.134, 4e-3, 1e-4, 6e-3, 1e-4, 4e-3, 0.175, 0.175, 4e-3, 1e-3, 0.601, 0.077, 0.708, 7e-3, 0.16, 0.303, 0.147, 0.097, 0.093, 0.095, 0.084, 0.09, 0.099, 0.137, 0.031, 0.011, 3e-3, 6e-3, 2e-3, 1e-3, 1e-4, 9e-3, 6e-3, 0.011, 5e-3, 5e-3, 4e-3, 5e-3, 7e-3, 0.017, 2e-3, 3e-3, 6e-3, 8e-3, 0.01, 4e-3, 8e-3, 1e-4, 6e-3, 0.012, 8e-3, 4e-3, 5e-3, 3e-3, 5e-3, 1e-3, 1e-3, 2e-3, 0.011, 3e-3, 1e-4, 4e-3, 1e-4, 0.091, 0.013, 0.033, 0.032, 0.099, 0.015, 0.014, 0.02, 0.081, 6e-3, 0.012, 0.045, 0.028, 0.055, 0.071, 0.018, 2e-3, 0.069, 0.058, 0.052, 0.039, 0.016, 6e-3, 4e-3, 0.014, 0.011, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 2.51, 1.935, 2.11, 1.119, 0.168, 0.507, 0.468, 0.486, 0.356, 0.046, 9e-3, 1.422, 0.678, 3e-3, 0.239, 0.784, 0.089, 0.301, 0.121, 0.074, 0.371, 0.035, 1.647, 0.529, 0.012, 9e-3, 0.09, 0.04, 0.101, 0.07, 0.061, 0.137, 0.108, 0.152, 0.055, 0.234, 0.024, 0.016, 0.017, 0.032, 0.025, 5e-3, 1e-3, 0.015, 2e-3, 4e-3, 9e-3, 0.015, 3.672, 0.621, 2.19, 0.526, 1.267, 2.143, 0.348, 0.764, 1.53, 0.62, 1.849, 1.595, 1.255, 2.617, 4.166, 1, 1e-4, 1e-4, 0.065, 0.026, 3e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 6e-3, 1e-4, 0.02, 9e-3, 27.547, 15.28, 0.159, 1e-4, 1e-4, 1e-3, 1e-3, 4e-3, 6e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 4e-3, 0.115, 4e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "rw": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.278, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.768, 7e-3, 0.605, 1e-4, 1e-4, 0.01, 5e-3, 0.156, 0.48, 0.479, 1e-4, 1e-3, 0.554, 0.104, 0.846, 0.03, 0.199, 0.216, 0.155, 0.113, 0.085, 0.082, 0.092, 0.069, 0.073, 0.138, 0.279, 0.158, 0.014, 6e-3, 0.014, 0.022, 1e-4, 0.463, 0.203, 0.115, 0.093, 0.067, 0.068, 0.134, 0.078, 0.521, 0.056, 0.247, 0.076, 0.283, 0.278, 0.063, 0.134, 6e-3, 0.219, 0.18, 0.135, 0.469, 0.053, 0.038, 3e-3, 0.047, 0.033, 2e-3, 5e-3, 3e-3, 1e-4, 5e-3, 3e-3, 10.187, 2.795, 0.85, 1.072, 4.678, 0.399, 2.704, 1.553, 8.747, 0.332, 2.605, 0.938, 3.443, 4.833, 3.164, 0.42, 0.036, 4.477, 2.07, 2.396, 6.084, 0.329, 1.941, 0.023, 2.813, 1.358, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.976, 0.03, 0.025, 0.03, 0.043, 0.049, 0.025, 0.021, 0.028, 9e-3, 0.036, 0.011, 0.018, 0.014, 0.026, 0.013, 0.02, 0.015, 0.01, 0.15, 8e-3, 0.015, 9e-3, 8e-3, 0.011, 0.787, 7e-3, 8e-3, 0.021, 0.011, 0.011, 0.034, 0.016, 0.016, 9e-3, 0.011, 0.025, 0.012, 0.025, 0.083, 0.028, 0.057, 0.013, 0.014, 0.038, 0.019, 0.024, 0.039, 0.055, 0.067, 0.03, 0.036, 0.018, 0.034, 0.017, 0.013, 0.045, 0.024, 0.03, 0.026, 0.034, 0.02, 0.028, 0.012, 1e-4, 1e-4, 0.03, 0.13, 0.052, 0.028, 1e-3, 1e-3, 1e-3, 9e-3, 2e-3, 1e-3, 3e-3, 1e-4, 0.02, 7e-3, 0.21, 0.107, 8e-3, 5e-3, 1e-3, 6e-3, 5e-3, 0.025, 0.234, 0.162, 5e-3, 9e-3, 1e-4, 1e-4, 9e-3, 1e-4, 0.108, 0.055, 0.961, 1e-3, 2e-3, 0.013, 8e-3, 4e-3, 3e-3, 2e-3, 1e-3, 1e-3, 3e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sa": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.358, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.441, 3e-3, 0.019, 1e-4, 1e-4, 3e-3, 1e-4, 0.034, 0.04, 0.042, 1e-4, 1e-3, 0.189, 0.124, 0.061, 9e-3, 3e-3, 4e-3, 3e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.022, 1e-3, 5e-3, 3e-3, 5e-3, 5e-3, 1e-4, 2e-3, 1e-3, 7e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 3e-3, 2e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.036, 6e-3, 9e-3, 0.018, 0.033, 3e-3, 5e-3, 0.01, 0.026, 1e-3, 3e-3, 0.015, 9e-3, 0.022, 0.022, 0.013, 1e-4, 0.02, 0.014, 0.02, 7e-3, 2e-3, 5e-3, 1e-3, 4e-3, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 0.485, 0.531, 0.737, 0.892, 1e-3, 0.437, 0.14, 1.014, 0.103, 0.083, 3e-3, 0.31, 0.053, 4.186, 1e-3, 0.123, 4e-3, 1e-3, 1e-4, 0.016, 5e-3, 0.929, 0.077, 0.397, 0.036, 0.098, 0.308, 0.026, 0.311, 0.017, 0.076, 0.146, 0.037, 0.11, 8e-3, 0.362, 26.378, 7.803, 0.723, 0.32, 1.5, 0.025, 0.84, 0.05, 0.176, 0.36, 1.148, 1.481, 1.847, 1e-4, 0.431, 0.017, 1e-3, 1.168, 0.412, 0.409, 1.347, 0.264, 1e-4, 1e-4, 2e-3, 0.029, 2.443, 1.602, 1e-4, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 31.344, 1e-4, 0.071, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sah": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.686, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.508, 2e-3, 0.063, 1e-4, 1e-4, 6e-3, 1e-4, 1e-3, 0.091, 0.092, 1e-4, 1e-3, 0.559, 0.22, 0.713, 8e-3, 0.141, 0.211, 0.115, 0.061, 0.06, 0.065, 0.051, 0.05, 0.056, 0.124, 0.035, 0.013, 6e-3, 2e-3, 6e-3, 2e-3, 1e-4, 5e-3, 4e-3, 5e-3, 3e-3, 2e-3, 2e-3, 2e-3, 2e-3, 0.017, 1e-3, 2e-3, 2e-3, 4e-3, 3e-3, 2e-3, 3e-3, 1e-4, 2e-3, 6e-3, 4e-3, 1e-3, 4e-3, 1e-3, 7e-3, 2e-3, 1e-4, 3e-3, 1e-4, 3e-3, 1e-4, 4e-3, 1e-4, 0.029, 8e-3, 0.012, 8e-3, 0.028, 5e-3, 6e-3, 0.038, 0.023, 1e-3, 4e-3, 0.015, 0.01, 0.02, 0.025, 7e-3, 1e-4, 0.024, 0.015, 0.017, 0.012, 3e-3, 3e-3, 1e-3, 5e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.31, 1.601, 3.034, 2.129, 0.054, 0.947, 0.056, 0.303, 0.028, 8e-3, 2e-3, 2.384, 0.325, 2.811, 0.018, 0.129, 0.129, 0.118, 0.035, 0.051, 0.111, 0.426, 0.011, 7e-3, 0.063, 2e-3, 0.123, 0.02, 0.075, 0.059, 0.083, 0.041, 0.09, 0.172, 0.066, 0.042, 0.018, 0.342, 5e-3, 0.017, 0.028, 0.688, 1e-4, 0.065, 3e-3, 0.027, 0.027, 0.911, 6.03, 1.253, 0.256, 0.681, 0.862, 0.464, 0.024, 0.065, 2.76, 0.764, 1.431, 3.082, 0.589, 3.175, 2.114, 0.327, 1e-4, 1e-4, 0.173, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 2e-3, 1e-4, 2e-3, 1e-3, 24.486, 17.038, 2.234, 0.706, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.102, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sc": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.057, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.585, 5e-3, 0.337, 1e-4, 1e-4, 0.01, 1e-3, 0.519, 0.179, 0.179, 1e-4, 1e-3, 0.997, 0.097, 0.746, 0.025, 0.237, 0.292, 0.15, 0.087, 0.082, 0.09, 0.079, 0.083, 0.093, 0.166, 0.067, 0.032, 7e-3, 2e-3, 8e-3, 3e-3, 1e-4, 0.224, 0.132, 0.261, 0.092, 0.103, 0.086, 0.108, 0.028, 0.255, 0.028, 0.024, 0.103, 0.181, 0.091, 0.054, 0.171, 6e-3, 0.093, 0.455, 0.116, 0.064, 0.058, 0.024, 0.025, 8e-3, 0.012, 0.012, 1e-4, 0.012, 1e-4, 1e-4, 1e-4, 9.363, 0.921, 2.394, 4.179, 7.513, 0.745, 1.075, 0.764, 6.94, 0.075, 0.096, 1.956, 1.851, 5.606, 4.069, 1.688, 0.018, 4.534, 7.393, 5.178, 5.316, 0.445, 0.037, 0.029, 0.067, 0.854, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.107, 0.01, 6e-3, 8e-3, 4e-3, 2e-3, 2e-3, 3e-3, 6e-3, 2e-3, 2e-3, 2e-3, 6e-3, 4e-3, 2e-3, 1e-3, 3e-3, 2e-3, 3e-3, 8e-3, 4e-3, 1e-3, 2e-3, 1e-3, 3e-3, 0.058, 1e-3, 2e-3, 0.016, 0.017, 1e-3, 1e-3, 0.306, 9e-3, 2e-3, 3e-3, 3e-3, 2e-3, 1e-3, 4e-3, 0.232, 0.016, 3e-3, 7e-3, 0.252, 7e-3, 1e-3, 2e-3, 8e-3, 7e-3, 0.176, 8e-3, 2e-3, 4e-3, 3e-3, 6e-3, 5e-3, 0.096, 7e-3, 7e-3, 6e-3, 4e-3, 4e-3, 4e-3, 1e-4, 1e-4, 0.032, 1.097, 7e-3, 6e-3, 1e-4, 1e-4, 1e-4, 0.011, 3e-3, 7e-3, 1e-3, 1e-4, 0.018, 9e-3, 0.023, 9e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 3e-3, 6e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 6e-3, 0.096, 7e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "scn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.769, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.859, 5e-3, 0.376, 1e-3, 1e-4, 6e-3, 1e-3, 0.62, 0.187, 0.189, 1e-3, 1e-3, 0.862, 0.093, 0.813, 0.026, 0.237, 0.31, 0.158, 0.093, 0.09, 0.099, 0.092, 0.087, 0.104, 0.161, 0.085, 0.032, 0.027, 8e-3, 0.034, 3e-3, 1e-4, 0.211, 0.12, 0.299, 0.095, 0.077, 0.106, 0.122, 0.053, 0.143, 0.031, 0.023, 0.333, 0.207, 0.158, 0.044, 0.198, 0.02, 0.123, 0.32, 0.125, 0.061, 0.101, 0.022, 0.022, 8e-3, 0.012, 0.019, 1e-4, 0.019, 1e-4, 7e-3, 1e-3, 8.698, 0.715, 3.649, 2.751, 2.764, 0.729, 1.223, 0.71, 11.435, 0.098, 0.087, 3.105, 2.009, 5.881, 1.955, 1.977, 0.125, 4.751, 3.262, 4.998, 7.156, 1.012, 0.04, 0.022, 0.077, 0.978, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 0.123, 5e-3, 5e-3, 5e-3, 3e-3, 1e-3, 2e-3, 1e-3, 9e-3, 2e-3, 1e-3, 1e-3, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 2e-3, 0.01, 3e-3, 1e-3, 2e-3, 1e-3, 0.012, 0.059, 1e-3, 2e-3, 0.014, 0.013, 1e-3, 1e-3, 0.271, 6e-3, 0.312, 2e-3, 1e-3, 1e-3, 1e-3, 4e-3, 0.478, 0.013, 0.046, 0.017, 0.359, 7e-3, 0.096, 2e-3, 8e-3, 4e-3, 0.23, 6e-3, 0.189, 3e-3, 2e-3, 3e-3, 4e-3, 0.145, 6e-3, 0.184, 3e-3, 4e-3, 2e-3, 3e-3, 1e-4, 1e-4, 0.038, 2.342, 7e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.018, 8e-3, 0.018, 9e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 6e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 6e-3, 0.107, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sco": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.424, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.792, 3e-3, 0.394, 1e-3, 2e-3, 0.018, 3e-3, 0.122, 0.265, 0.265, 1e-3, 1e-3, 1.079, 0.194, 0.878, 0.014, 0.365, 0.437, 0.262, 0.125, 0.119, 0.131, 0.116, 0.116, 0.135, 0.238, 0.065, 0.052, 4e-3, 2e-3, 4e-3, 1e-3, 1e-4, 0.38, 0.213, 0.323, 0.162, 0.132, 0.149, 0.164, 0.147, 0.281, 0.103, 0.117, 0.162, 0.281, 0.134, 0.098, 0.228, 0.015, 0.18, 0.416, 0.389, 0.071, 0.084, 0.096, 9e-3, 0.031, 0.022, 4e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-3, 7.525, 0.973, 2.32, 1.915, 9.145, 0.867, 0.966, 3.175, 6.858, 0.086, 0.556, 2.986, 1.72, 5.779, 4.854, 1.317, 0.066, 4.925, 4.607, 6.432, 2.109, 0.676, 1.003, 0.125, 1.018, 0.144, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.052, 9e-3, 5e-3, 4e-3, 4e-3, 3e-3, 2e-3, 4e-3, 2e-3, 3e-3, 2e-3, 1e-3, 2e-3, 5e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 0.033, 6e-3, 1e-3, 2e-3, 2e-3, 2e-3, 9e-3, 1e-3, 2e-3, 3e-3, 3e-3, 1e-3, 5e-3, 0.039, 0.026, 3e-3, 6e-3, 0.015, 4e-3, 2e-3, 7e-3, 5e-3, 0.025, 2e-3, 6e-3, 2e-3, 0.019, 1e-3, 2e-3, 0.01, 0.012, 0.013, 0.016, 4e-3, 5e-3, 0.011, 2e-3, 7e-3, 3e-3, 7e-3, 3e-3, 9e-3, 4e-3, 4e-3, 2e-3, 1e-4, 1e-4, 0.051, 0.152, 0.018, 0.014, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.011, 5e-3, 0.019, 7e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 9e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 5e-3, 0.05, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sd": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.527, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.452, 4e-3, 0.026, 1e-3, 1e-4, 2e-3, 1e-4, 4e-3, 0.108, 0.108, 4e-3, 1e-3, 9e-3, 0.252, 0.565, 0.015, 0.09, 0.18, 0.083, 0.051, 0.047, 0.052, 0.047, 0.048, 0.055, 0.112, 0.038, 3e-3, 4e-3, 4e-3, 4e-3, 1e-4, 1e-4, 0.01, 7e-3, 9e-3, 5e-3, 4e-3, 3e-3, 4e-3, 4e-3, 5e-3, 2e-3, 3e-3, 4e-3, 7e-3, 4e-3, 3e-3, 7e-3, 1e-3, 4e-3, 0.011, 7e-3, 2e-3, 2e-3, 3e-3, 1e-4, 1e-3, 1e-4, 5e-3, 1e-4, 5e-3, 1e-3, 3e-3, 1e-4, 0.093, 0.018, 0.025, 0.03, 0.086, 0.014, 0.018, 0.031, 0.075, 2e-3, 9e-3, 0.041, 0.026, 0.061, 0.064, 0.018, 1e-3, 0.061, 0.048, 0.062, 0.025, 0.01, 9e-3, 5e-3, 0.016, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.358, 0.355, 0.367, 0.044, 1.492, 1.56, 3.771, 2.24, 3.043, 3e-3, 5.411, 6e-3, 0.747, 0.045, 0.229, 0.346, 0.139, 6e-3, 0.013, 2e-3, 0.041, 1e-3, 1e-3, 3e-3, 0.036, 0.237, 1e-4, 7e-3, 0.063, 0.063, 1e-3, 9e-3, 0.066, 0.346, 0.511, 5e-3, 0.013, 4e-3, 0.6, 4.552, 0.858, 0.458, 2.417, 0.053, 1.486, 0.357, 0.248, 1.426, 0.07, 2.412, 0.238, 1.475, 0.403, 0.209, 0.078, 0.141, 0.068, 0.553, 0.222, 0.578, 1e-3, 0.647, 1.291, 0.291, 1e-4, 1e-4, 0.065, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 17.302, 19.772, 4.118, 0.84, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 0.198, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.104, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "se": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.476, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.534, 2e-3, 0.233, 1e-3, 1e-3, 8e-3, 1e-3, 0.011, 0.255, 0.258, 1e-4, 1e-3, 1.05, 0.297, 1.247, 0.015, 0.373, 0.513, 0.317, 0.174, 0.148, 0.157, 0.145, 0.145, 0.159, 0.258, 0.106, 8e-3, 0.018, 2e-3, 0.018, 2e-3, 1e-4, 0.188, 0.166, 0.071, 0.251, 0.09, 0.093, 0.235, 0.162, 0.082, 0.134, 0.245, 0.18, 0.186, 0.183, 0.112, 0.147, 4e-3, 0.206, 0.487, 0.123, 0.053, 0.171, 0.019, 3e-3, 0.015, 6e-3, 5e-3, 1e-4, 5e-3, 1e-4, 1e-3, 1e-4, 10.038, 0.915, 0.217, 3.327, 5.602, 0.262, 2.678, 1.589, 6.671, 1.512, 2.136, 5.043, 2.364, 3.492, 4.102, 0.745, 0.01, 2.956, 3.613, 3.601, 3.337, 2.349, 0.035, 0.018, 0.282, 0.057, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.058, 0.044, 3e-3, 4e-3, 8e-3, 9e-3, 2e-3, 3e-3, 2e-3, 2e-3, 1e-3, 0.119, 0.035, 0.369, 1e-3, 2e-3, 2e-3, 0.302, 4e-3, 0.024, 2e-3, 2e-3, 6e-3, 1e-3, 7e-3, 6e-3, 3e-3, 5e-3, 9e-3, 0.024, 1e-3, 3e-3, 0.073, 3.336, 0.013, 2e-3, 0.299, 0.044, 0.019, 0.052, 4e-3, 0.017, 1e-3, 0.011, 1e-3, 6e-3, 1e-3, 4e-3, 0.019, 4e-3, 0.042, 6e-3, 0.01, 8e-3, 0.063, 1e-3, 0.053, 1e-3, 6e-3, 9e-3, 8e-3, 6e-3, 0.098, 1e-3, 1e-4, 1e-4, 0.118, 3.226, 0.711, 1, 1e-4, 4e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 8e-3, 3e-3, 0.027, 8e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 3e-3, 4e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 8e-3, 0.055, 2e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sg": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.098, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.879, 0.044, 0.115, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 0.198, 0.211, 1e-4, 1e-4, 0.85, 0.464, 1.499, 7e-3, 0.524, 0.5, 0.381, 0.203, 0.246, 0.244, 0.244, 0.191, 0.262, 0.229, 0.082, 0.038, 1e-4, 1e-4, 1e-4, 0.029, 1e-4, 0.282, 0.315, 0.126, 0.106, 0.101, 0.06, 0.092, 0.086, 0.092, 0.093, 0.251, 0.348, 0.227, 0.266, 0.057, 0.128, 1e-4, 0.081, 0.346, 0.343, 0.013, 0.053, 0.416, 5e-3, 0.029, 0.062, 2e-3, 1e-4, 2e-3, 1e-4, 0.015, 1e-4, 5.706, 1.515, 0.218, 1.433, 4.537, 0.262, 2.208, 0.762, 2.069, 0.092, 2.86, 1.7, 1.242, 5.365, 3.328, 0.599, 0.022, 1.81, 1.981, 3.619, 0.984, 0.189, 0.434, 0.086, 1.565, 0.929, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 4e-3, 0.029, 1e-4, 0.015, 1e-4, 1e-4, 7e-3, 4e-3, 2e-3, 7e-3, 0.016, 4e-3, 4e-3, 0.022, 0.015, 0.018, 1e-4, 4e-3, 7e-3, 0.022, 1e-4, 9e-3, 4e-3, 1e-4, 5e-3, 1e-4, 0.016, 2e-3, 1e-4, 2e-3, 0.059, 7e-3, 9e-3, 1.785, 0.013, 1.12, 7e-3, 2e-3, 0.044, 0.027, 0.112, 1.609, 0.647, 2e-3, 0.026, 3.804, 0.577, 7e-3, 4e-3, 1e-4, 0.022, 0.564, 1e-4, 1.689, 2e-3, 5e-3, 0.046, 2e-3, 0.403, 0.176, 1e-4, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 12.759, 5e-3, 0.07, 1e-4, 7e-3, 1e-4, 7e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.024, 0.011, 7e-3, 1e-4, 1e-4, 0.015, 4e-3, 2e-3, 1e-4, 2e-3, 2e-3, 4e-3, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sh": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.387, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.061, 2e-3, 0.275, 1e-4, 1e-3, 0.015, 1e-3, 0.014, 0.187, 0.187, 1e-4, 2e-3, 0.95, 0.147, 1.223, 0.02, 0.376, 0.495, 0.321, 0.161, 0.177, 0.142, 0.127, 0.123, 0.133, 0.217, 0.047, 0.016, 3e-3, 3e-3, 3e-3, 2e-3, 1e-4, 0.169, 0.152, 0.152, 0.124, 0.074, 0.068, 0.115, 0.09, 0.132, 0.082, 0.135, 0.104, 0.207, 0.208, 0.116, 0.297, 5e-3, 0.117, 0.252, 0.137, 0.082, 0.102, 0.023, 8e-3, 9e-3, 0.058, 0.012, 1e-4, 0.012, 1e-4, 3e-3, 1e-4, 8.404, 0.811, 0.782, 2.282, 6.596, 0.226, 1.221, 0.511, 7.186, 3.593, 2.512, 2.698, 2.143, 5.119, 6.434, 1.798, 0.011, 3.759, 3.618, 2.964, 3.066, 2.297, 0.032, 0.02, 0.068, 1.245, 1e-3, 3e-3, 1e-3, 1e-4, 1e-4, 0.106, 0.072, 0.05, 0.059, 3e-3, 6e-3, 0.013, 0.266, 0.014, 1e-3, 1e-3, 1e-3, 0.012, 0.537, 1e-3, 1e-3, 5e-3, 0.13, 5e-3, 0.01, 6e-3, 1e-3, 1e-3, 2e-3, 0.039, 0.019, 0.011, 0.012, 0.016, 6e-3, 0.015, 6e-3, 0.037, 0.532, 5e-3, 5e-3, 3e-3, 1e-3, 1e-3, 2e-3, 3e-3, 0.013, 1e-3, 4e-3, 1e-3, 0.013, 1e-3, 1e-3, 0.155, 0.023, 0.063, 0.029, 0.039, 0.108, 9e-3, 0.019, 0.119, 2e-3, 0.045, 0.036, 0.04, 0.092, 0.525, 0.041, 1e-4, 1e-4, 0.038, 0.074, 0.943, 0.945, 1e-4, 1e-4, 9e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.013, 6e-3, 0.916, 0.332, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 0.045, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "si": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.314, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.928, 1e-3, 0.061, 1e-3, 1e-3, 5e-3, 1e-4, 9e-3, 0.059, 0.059, 1e-4, 1e-3, 0.185, 0.034, 0.404, 9e-3, 0.086, 0.094, 0.056, 0.028, 0.026, 0.03, 0.026, 0.025, 0.029, 0.049, 0.012, 4e-3, 2e-3, 2e-3, 2e-3, 2e-3, 1e-4, 0.015, 8e-3, 0.015, 8e-3, 7e-3, 6e-3, 5e-3, 7e-3, 0.015, 2e-3, 3e-3, 6e-3, 0.01, 6e-3, 6e-3, 0.01, 1e-3, 6e-3, 0.015, 0.013, 4e-3, 4e-3, 5e-3, 1e-3, 1e-3, 1e-3, 5e-3, 1e-4, 5e-3, 1e-4, 3e-3, 1e-4, 0.173, 0.028, 0.067, 0.071, 0.23, 0.039, 0.038, 0.081, 0.157, 3e-3, 0.016, 0.086, 0.051, 0.142, 0.142, 0.042, 2e-3, 0.132, 0.124, 0.159, 0.054, 0.019, 0.027, 7e-3, 0.032, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2.252, 0.201, 0.275, 1.149, 0.707, 0.497, 0.106, 0.13, 3e-3, 0.08, 2.719, 0.062, 0.013, 0.472, 1e-4, 1.466, 0.446, 0.166, 2.231, 0.489, 1.129, 7e-3, 0.144, 1e-4, 0.039, 0.612, 2.039, 0.034, 0.759, 0.19, 0.015, 0.026, 0.094, 8e-3, 0.192, 1e-3, 5e-3, 0.01, 1e-3, 0.537, 0.012, 0.162, 1e-3, 0.275, 3e-3, 1.26, 0.067, 0.843, 0.165, 1.921, 1e-3, 0.089, 0.809, 8e-3, 15.577, 14.437, 1.305, 0.017, 1.681, 1.481, 1e-4, 0.796, 1e-4, 1e-3, 1e-4, 1e-4, 0.014, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 29.588, 1e-4, 0.504, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sm": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.213, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 19.463, 8e-3, 0.168, 1e-4, 3e-3, 0.014, 2e-3, 0.885, 0.148, 0.148, 1e-4, 1e-3, 1, 0.173, 0.914, 9e-3, 0.254, 0.312, 0.179, 0.14, 0.095, 0.115, 0.095, 0.086, 0.112, 0.168, 0.033, 0.027, 6e-3, 2e-3, 6e-3, 5e-3, 1e-4, 0.462, 0.087, 0.119, 0.039, 0.23, 0.233, 0.074, 0.06, 0.345, 0.031, 0.147, 0.149, 0.348, 0.135, 0.431, 0.236, 3e-3, 0.115, 0.459, 0.28, 0.072, 0.088, 0.128, 0.02, 7e-3, 9e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 15.436, 0.147, 0.251, 0.268, 7.552, 1.798, 1.939, 0.261, 7.65, 0.014, 0.507, 6.117, 2.84, 3.141, 6.14, 1.094, 0.011, 1.189, 2.656, 4.384, 4.707, 0.608, 0.084, 0.018, 0.145, 0.038, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.05, 0.151, 1e-4, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 3e-3, 2e-3, 0.017, 2e-3, 1e-3, 3e-3, 1e-4, 1e-4, 0.02, 1e-3, 1e-3, 1e-4, 1e-3, 0.039, 2e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 5e-3, 4e-3, 1e-4, 0.011, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 6e-3, 1e-3, 0.028, 1e-3, 4e-3, 1e-3, 1e-3, 3e-3, 3e-3, 1e-3, 3e-3, 2e-3, 2e-3, 1e-4, 1e-3, 2e-3, 1e-3, 2e-3, 0.086, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 5e-3, 0.033, 0.176, 0.042, 1e-4, 1e-4, 1e-4, 1e-3, 0.085, 1e-3, 1e-4, 1e-4, 7e-3, 1e-4, 6e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 0.046, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.006, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.427, 1e-3, 0.194, 1e-4, 1e-3, 7e-3, 3e-3, 0.024, 0.281, 0.281, 1e-4, 5e-3, 0.597, 0.124, 0.956, 0.038, 0.114, 0.113, 0.073, 0.04, 0.036, 0.036, 0.026, 0.025, 0.034, 0.053, 0.08, 0.124, 2e-3, 9e-3, 2e-3, 6e-3, 1e-4, 0.169, 0.097, 0.234, 0.083, 0.107, 0.043, 0.1, 0.097, 0.095, 0.037, 0.196, 0.037, 0.454, 0.178, 0.024, 0.119, 3e-3, 0.094, 0.231, 0.097, 0.036, 0.089, 0.031, 3e-3, 9e-3, 0.113, 0.039, 1e-4, 0.038, 1e-4, 2e-3, 1e-4, 12.237, 1.335, 1.505, 2.374, 5.54, 0.412, 1.524, 3.199, 8.126, 0.115, 3.86, 0.667, 3.205, 6.578, 4.667, 1.202, 0.019, 4.537, 2.41, 2.721, 5.562, 2.325, 2.211, 0.043, 1.41, 2.325, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 0.012, 3e-3, 1e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.017, 1e-3, 4e-3, 1e-3, 4e-3, 1e-4, 1e-3, 1e-3, 0.01, 5e-3, 3e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 0.016, 1e-3, 4e-3, 1e-3, 1e-3, 1e-4, 1e-4, 9e-3, 4e-3, 1e-3, 1e-3, 1e-3, 1e-3, 3e-3, 3e-3, 3e-3, 4e-3, 8e-3, 1e-3, 1e-4, 2e-3, 1e-4, 1e-3, 4e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.011, 0.016, 3e-3, 2e-3, 1e-4, 1e-4, 1e-4, 0.037, 8e-3, 0.027, 1e-3, 1e-3, 2e-3, 1e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "so": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.235, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.454, 3e-3, 0.106, 1e-4, 1e-3, 0.01, 6e-3, 0.044, 0.175, 0.179, 1e-3, 6e-3, 0.698, 0.181, 0.663, 0.023, 0.173, 0.237, 0.118, 0.074, 0.068, 0.076, 0.069, 0.062, 0.061, 0.116, 0.103, 0.039, 6e-3, 0.095, 8e-3, 6e-3, 1e-3, 0.277, 0.176, 0.197, 0.21, 0.058, 0.067, 0.135, 0.123, 0.156, 0.069, 0.122, 0.08, 0.279, 0.092, 0.046, 0.025, 0.078, 0.077, 0.341, 0.096, 0.053, 9e-3, 0.145, 0.085, 0.037, 9e-3, 0.058, 1e-3, 0.058, 1e-4, 9e-3, 1e-3, 20.28, 1.752, 0.781, 4.408, 3.807, 0.467, 1.801, 2.804, 6.156, 0.344, 2.692, 2.981, 1.937, 3.517, 5.007, 0.065, 0.666, 2.59, 2.645, 1.488, 3.47, 0.033, 1.517, 1.277, 3.257, 0.024, 6e-3, 7e-3, 6e-3, 1e-4, 1e-4, 0.044, 0.021, 0.016, 0.015, 0.092, 0.046, 0.041, 0.026, 0.037, 7e-3, 0.048, 5e-3, 2e-3, 4e-3, 0.027, 0.011, 0.01, 9e-3, 0.012, 4e-3, 2e-3, 1e-3, 1e-3, 2e-3, 3e-3, 0.016, 1e-4, 1e-4, 9e-3, 0.011, 2e-3, 5e-3, 0.026, 5e-3, 4e-3, 0.02, 8e-3, 9e-3, 4e-3, 0.102, 0.029, 0.015, 0.023, 8e-3, 9e-3, 0.018, 9e-3, 0.021, 0.011, 0.034, 6e-3, 0.02, 9e-3, 0.011, 6e-3, 6e-3, 5e-3, 0.024, 0.019, 0.018, 4e-3, 3e-3, 1e-3, 4e-3, 1e-4, 1e-4, 0.03, 0.015, 7e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 0.36, 0.404, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 0.045, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.034, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sq": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.871, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.83, 5e-3, 0.212, 1e-4, 1e-3, 8e-3, 2e-3, 0.025, 0.142, 0.143, 1e-3, 2e-3, 0.876, 0.197, 0.817, 0.021, 0.247, 0.322, 0.187, 0.096, 0.094, 0.095, 0.084, 0.083, 0.096, 0.185, 0.067, 0.019, 3e-3, 4e-3, 3e-3, 4e-3, 1e-4, 0.232, 0.164, 0.084, 0.121, 0.088, 0.104, 0.113, 0.084, 0.118, 0.051, 0.274, 0.113, 0.216, 0.178, 0.042, 0.229, 0.027, 0.103, 0.291, 0.126, 0.044, 0.092, 0.017, 0.024, 9e-3, 0.037, 0.024, 1e-4, 0.024, 1e-4, 5e-3, 1e-3, 5.42, 0.732, 0.432, 2.174, 7.144, 0.635, 1.01, 2.972, 6.09, 2.066, 2.05, 2.101, 2.386, 4.875, 2.895, 1.724, 0.557, 5.177, 3.826, 5.956, 2.462, 1.012, 0.037, 0.057, 0.423, 0.487, 1e-4, 7e-3, 1e-4, 1e-4, 1e-4, 0.107, 6e-3, 4e-3, 5e-3, 3e-3, 2e-3, 2e-3, 0.017, 2e-3, 2e-3, 1e-3, 0.01, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 8e-3, 1e-3, 0.019, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 0.015, 1e-3, 1e-3, 0.032, 0.031, 2e-3, 3e-3, 0.048, 5e-3, 5e-3, 2e-3, 5e-3, 2e-3, 2e-3, 0.098, 5e-3, 0.011, 1e-3, 5.762, 2e-3, 4e-3, 2e-3, 2e-3, 6e-3, 6e-3, 0.012, 4e-3, 5e-3, 3e-3, 3e-3, 2e-3, 3e-3, 3e-3, 3e-3, 4e-3, 6e-3, 3e-3, 3e-3, 3e-3, 1e-4, 1e-4, 0.063, 5.926, 8e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.023, 9e-3, 0.015, 0.012, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 7e-3, 8e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 0.106, 2e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "srn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.777, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 18.537, 4e-3, 0.236, 1e-4, 1e-4, 9e-3, 1e-4, 0.081, 0.222, 0.175, 1e-4, 1e-4, 0.673, 0.268, 1.397, 5e-3, 0.412, 0.368, 0.15, 0.085, 0.102, 0.103, 0.102, 0.071, 0.07, 0.14, 0.041, 0.016, 0.015, 2e-3, 0.015, 1e-4, 1e-4, 0.384, 0.184, 0.068, 0.478, 0.061, 0.057, 0.098, 0.039, 0.172, 0.08, 0.05, 0.052, 0.288, 0.1, 0.075, 0.116, 4e-3, 0.117, 0.271, 0.146, 8e-3, 0.023, 0.047, 4e-3, 0.014, 7e-3, 5e-3, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 8.95, 2.176, 0.221, 2.431, 7.818, 1.651, 1.874, 0.226, 8.782, 0.064, 2.479, 1.698, 2.095, 8.318, 4.117, 1.376, 3e-3, 4.52, 3.577, 2.919, 3.347, 0.156, 1.329, 0.018, 1.038, 0.054, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.042, 7e-3, 7e-3, 2e-3, 3e-3, 2e-3, 3e-3, 6e-3, 3e-3, 1e-3, 2e-3, 1e-3, 6e-3, 3e-3, 2e-3, 5e-3, 4e-3, 2e-3, 1e-3, 0.035, 2e-3, 2e-3, 2e-3, 6e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 7e-3, 2e-3, 2e-3, 0.024, 0.012, 2e-3, 5e-3, 4e-3, 7e-3, 2e-3, 2e-3, 0.012, 0.012, 6e-3, 9e-3, 2e-3, 0.021, 5e-3, 3e-3, 3e-3, 3e-3, 0.034, 7e-3, 2e-3, 2e-3, 2e-3, 1e-4, 5e-3, 7e-3, 0.019, 9e-3, 5e-3, 3e-3, 4e-3, 0.012, 1e-4, 1e-4, 0.029, 0.098, 0.021, 0.025, 2e-3, 2e-3, 2e-3, 5e-3, 1e-3, 3e-3, 1e-4, 1e-4, 0.01, 4e-3, 9e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.053, 1e-4, 1e-4, 0.016, 0.016, 1e-4, 0.01, 1e-4, 1e-4, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ss": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.873, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.454, 0.015, 0.301, 1e-3, 3e-3, 0.01, 3e-3, 0.035, 0.203, 0.202, 1e-3, 1e-4, 0.685, 0.328, 0.962, 0.019, 0.22, 0.221, 0.137, 0.048, 0.066, 0.07, 0.054, 0.061, 0.082, 0.144, 0.105, 0.052, 7e-3, 3e-3, 8e-3, 3e-3, 1e-4, 0.231, 0.18, 0.097, 0.094, 0.111, 0.055, 0.072, 0.058, 0.259, 0.082, 0.196, 0.342, 0.348, 0.356, 0.028, 0.088, 3e-3, 0.097, 0.319, 0.164, 0.113, 0.024, 0.061, 0.025, 0.043, 0.044, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 10.793, 2.656, 0.706, 1.31, 8.505, 1.004, 2.081, 2.919, 7.091, 0.258, 4.271, 5.701, 2.568, 6.606, 3.595, 0.825, 0.028, 0.782, 3.437, 3.569, 4.546, 0.696, 2.323, 0.017, 1.567, 0.734, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.037, 0.016, 7e-3, 0.01, 0.014, 8e-3, 7e-3, 4e-3, 9e-3, 7e-3, 0.013, 4e-3, 3e-3, 0.014, 0.015, 4e-3, 3e-3, 6e-3, 3e-3, 8e-3, 6e-3, 2e-3, 7e-3, 4e-3, 2e-3, 4e-3, 7e-3, 2e-3, 0.01, 3e-3, 7e-3, 3e-3, 0.09, 0.039, 0.013, 6e-3, 0.01, 5e-3, 5e-3, 0.023, 7e-3, 0.024, 7e-3, 9e-3, 5e-3, 0.109, 6e-3, 7e-3, 0.018, 0.014, 9e-3, 0.035, 0.024, 0.01, 7e-3, 5e-3, 0.015, 6e-3, 0.031, 0.01, 5e-3, 0.01, 8e-3, 5e-3, 1e-4, 1e-4, 0.085, 0.273, 0.013, 8e-3, 1e-4, 1e-4, 1e-4, 5e-3, 1e-3, 2e-3, 2e-3, 1e-4, 3e-3, 2e-3, 0.061, 0.022, 1e-3, 1e-4, 1e-4, 3e-3, 2e-3, 3e-3, 0.059, 0.053, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 0.042, 0.021, 0.034, 1e-4, 1e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 3e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "st": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.411, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.42, 2e-3, 0.079, 1e-4, 1e-3, 0.016, 3e-3, 0.083, 0.165, 0.167, 1e-3, 1e-3, 0.789, 0.143, 0.973, 0.021, 0.355, 0.325, 0.221, 0.104, 0.116, 0.113, 0.108, 0.098, 0.108, 0.15, 0.061, 0.016, 7e-3, 5e-3, 6e-3, 1e-3, 1e-4, 0.408, 0.587, 0.149, 0.148, 0.115, 0.088, 0.067, 0.172, 0.071, 0.055, 0.339, 0.212, 0.509, 0.175, 0.046, 0.141, 0.01, 0.115, 0.317, 0.165, 0.126, 0.071, 0.047, 1e-4, 0.019, 0.026, 0.011, 1e-4, 0.01, 1e-4, 5e-3, 1e-4, 12.26, 2.144, 0.403, 1.165, 9.234, 0.827, 1.837, 3.801, 3.704, 0.349, 2.878, 4.66, 2.188, 4.177, 7.024, 1.54, 0.085, 2.344, 4.067, 4.22, 1.114, 0.282, 1.372, 0.049, 0.996, 0.173, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.013, 0.01, 9e-3, 1e-4, 5e-3, 7e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 0.013, 3e-3, 1e-3, 9e-3, 1e-3, 1e-3, 4e-3, 5e-3, 1e-4, 1e-4, 2e-3, 1e-3, 0.01, 6e-3, 4e-3, 4e-3, 3e-3, 1e-4, 1e-4, 0.049, 0.052, 3e-3, 3e-3, 6e-3, 2e-3, 1e-3, 6e-3, 2e-3, 0.022, 0.037, 1e-3, 3e-3, 0.01, 1e-4, 1e-3, 4e-3, 2e-3, 1e-3, 0.03, 0.056, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 2e-3, 7e-3, 1e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 0.046, 0.167, 0.019, 0.086, 1e-4, 3e-3, 1e-3, 0.01, 1e-3, 3e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.01, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 8e-3, 0.013, 1e-4, 1e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "stq": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.516, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.229, 3e-3, 0.416, 7e-3, 1e-3, 0.015, 1e-3, 0.047, 0.208, 0.207, 8e-3, 3e-3, 0.814, 0.425, 1.065, 0.021, 0.376, 0.623, 0.234, 0.148, 0.183, 0.183, 0.241, 0.167, 0.231, 0.214, 0.089, 0.019, 0.072, 7e-3, 0.069, 6e-3, 1e-4, 0.293, 0.408, 0.089, 0.454, 0.155, 0.334, 0.214, 0.273, 0.205, 0.248, 0.241, 0.264, 0.372, 0.199, 0.14, 0.214, 5e-3, 0.245, 0.798, 0.226, 0.158, 0.049, 0.246, 3e-3, 6e-3, 0.016, 0.02, 1e-4, 0.02, 1e-4, 1e-3, 1e-4, 3.929, 0.935, 0.799, 3.858, 10.176, 1.298, 1.131, 1.308, 4.615, 0.883, 2.156, 2.674, 1.358, 6.685, 4.841, 0.816, 0.012, 4.246, 3.53, 4.621, 4.666, 0.159, 1.055, 0.042, 0.141, 0.124, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.049, 4e-3, 3e-3, 1e-3, 0.07, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 4e-3, 2e-3, 1e-3, 3e-3, 1e-3, 9e-3, 0.014, 1e-3, 2e-3, 8e-3, 4e-3, 5e-3, 4e-3, 0.021, 9e-3, 0.015, 1e-3, 2.394, 1e-3, 1e-3, 2e-3, 4e-3, 0.014, 3e-3, 2e-3, 1e-3, 7e-3, 2e-3, 2e-3, 4e-3, 2e-3, 0.026, 6e-3, 3e-3, 1e-3, 0.134, 1e-3, 3e-3, 2e-3, 4e-3, 4e-3, 0.245, 3e-3, 2e-3, 3e-3, 1e-4, 1e-4, 0.038, 2.918, 6e-3, 0.011, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.013, 6e-3, 8e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 0.048, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "su": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.293, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.195, 1e-3, 0.272, 1e-4, 1e-3, 6e-3, 1e-3, 0.02, 0.129, 0.129, 1e-4, 2e-3, 1.05, 0.168, 1.046, 0.037, 0.48, 0.412, 0.411, 0.202, 0.173, 0.175, 0.161, 0.145, 0.144, 0.197, 0.036, 0.015, 3e-3, 3e-3, 3e-3, 1e-3, 1e-4, 0.394, 0.22, 0.151, 0.149, 0.042, 0.047, 0.094, 0.073, 0.227, 0.16, 0.402, 0.071, 0.278, 0.12, 0.097, 0.305, 0.014, 0.09, 0.368, 0.175, 0.05, 0.031, 0.057, 0.016, 0.027, 9e-3, 8e-3, 1e-4, 8e-3, 1e-4, 5e-3, 1e-4, 13.373, 1.612, 0.819, 2.725, 4.093, 0.314, 2.685, 1.583, 5.788, 0.997, 2.729, 2.341, 2.09, 7.706, 2.801, 1.889, 0.016, 3.889, 3.272, 4.14, 4.781, 0.134, 0.635, 0.029, 0.708, 0.032, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.025, 5e-3, 3e-3, 4e-3, 6e-3, 4e-3, 4e-3, 2e-3, 4e-3, 0.073, 3e-3, 1e-3, 1e-3, 4e-3, 7e-3, 3e-3, 3e-3, 2e-3, 3e-3, 7e-3, 8e-3, 1e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 1e-3, 4e-3, 4e-3, 1e-3, 1e-3, 0.047, 2e-3, 1e-3, 2e-3, 4e-3, 2e-3, 2e-3, 6e-3, 3e-3, 2.276, 3e-3, 2e-3, 1e-3, 2e-3, 7e-3, 2e-3, 4e-3, 5e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 3e-3, 2e-3, 1e-3, 2e-3, 0.033, 1e-3, 0.033, 1e-4, 1e-4, 0.051, 2.355, 3e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.02, 0.037, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 7e-3, 0.025, 4e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.032, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "sw": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.454, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.93, 2e-3, 0.217, 2e-3, 1e-3, 0.01, 3e-3, 0.027, 0.171, 0.171, 1e-3, 1e-3, 0.703, 0.109, 0.942, 0.015, 0.41, 0.383, 0.266, 0.126, 0.108, 0.126, 0.108, 0.107, 0.119, 0.201, 0.062, 0.024, 3e-3, 4e-3, 3e-3, 3e-3, 1e-4, 0.226, 0.167, 0.122, 0.086, 0.058, 0.057, 0.065, 0.116, 0.13, 0.09, 0.638, 0.08, 0.504, 0.137, 0.044, 0.113, 6e-3, 0.074, 0.173, 0.147, 0.165, 0.059, 0.218, 0.013, 0.04, 0.023, 0.04, 1e-4, 0.04, 1e-3, 1e-3, 1e-3, 16.478, 1.326, 0.611, 1.343, 3.374, 0.678, 1.131, 2.383, 9.629, 0.827, 4.598, 2.609, 3.253, 5.284, 3.187, 0.805, 8e-3, 1.616, 2.094, 2.468, 4.443, 0.427, 3.161, 0.026, 2.095, 1.273, 1e-3, 6e-3, 1e-3, 1e-4, 1e-4, 0.04, 5e-3, 4e-3, 2e-3, 4e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 0.013, 2e-3, 1e-3, 1e-3, 1e-3, 2e-3, 6e-3, 1e-3, 1e-3, 9e-3, 8e-3, 1e-3, 4e-3, 9e-3, 3e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 5e-3, 3e-3, 9e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 2e-3, 5e-3, 9e-3, 9e-3, 4e-3, 2e-3, 3e-3, 4e-3, 1e-3, 4e-3, 3e-3, 3e-3, 3e-3, 6e-3, 3e-3, 2e-3, 3e-3, 1e-4, 1e-4, 0.018, 0.029, 9e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.014, 7e-3, 0.011, 4e-3, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 5e-3, 0.012, 0.01, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 0.038, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "szl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.884, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.63, 2e-3, 0.452, 1e-4, 1e-4, 0.012, 1e-3, 0.026, 0.296, 0.296, 1e-3, 1e-3, 1.094, 0.318, 1.181, 0.015, 0.332, 0.469, 0.289, 0.138, 0.131, 0.151, 0.118, 0.131, 0.157, 0.273, 0.087, 0.014, 6e-3, 3e-3, 6e-3, 1e-4, 1e-4, 0.207, 0.209, 0.155, 0.118, 0.048, 0.111, 0.139, 0.08, 0.122, 0.125, 0.213, 0.123, 0.287, 0.122, 0.062, 0.309, 5e-3, 0.156, 0.329, 0.126, 0.154, 0.05, 0.233, 0.034, 0.017, 0.083, 4e-3, 1e-4, 4e-3, 1e-4, 6e-3, 1e-3, 5.741, 0.894, 2.016, 2.128, 5.35, 0.327, 1.279, 0.968, 3.438, 2.841, 2.633, 2.099, 2.293, 3.364, 5.857, 1.423, 0.012, 3.389, 2.85, 2.58, 2.277, 0.102, 3.144, 0.017, 3.623, 2.205, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.191, 0.035, 0.624, 0.044, 0.945, 0.014, 9e-3, 0.333, 8e-3, 3e-3, 6e-3, 5e-3, 0.012, 0.221, 5e-3, 0.196, 6e-3, 5e-3, 3e-3, 0.168, 0.01, 3e-3, 5e-3, 5e-3, 5e-3, 0.109, 0.059, 0.562, 5e-3, 5e-3, 4e-3, 6e-3, 0.062, 0.111, 6e-3, 0.016, 0.01, 4e-3, 4e-3, 0.012, 0.011, 0.03, 5e-3, 0.012, 3e-3, 0.012, 8e-3, 1.67, 0.032, 0.015, 0.058, 0.035, 0.048, 0.018, 0.012, 4e-3, 0.02, 0.013, 0.335, 0.026, 0.282, 0.022, 0.098, 6e-3, 1e-4, 1e-4, 0.109, 0.208, 0.455, 5.073, 1e-4, 1e-3, 1e-4, 8e-3, 3e-3, 3e-3, 4e-3, 1e-4, 0.015, 8e-3, 0.161, 0.06, 3e-3, 2e-3, 1e-4, 3e-3, 1e-3, 9e-3, 0.025, 0.019, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 0.011, 0.01, 0.176, 6e-3, 1e-3, 5e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ta": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.357, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.862, 1e-3, 0.077, 1e-4, 1e-3, 6e-3, 1e-3, 7e-3, 0.055, 0.056, 1e-4, 1e-3, 0.234, 0.03, 0.384, 5e-3, 0.084, 0.106, 0.063, 0.029, 0.028, 0.034, 0.027, 0.032, 0.031, 0.052, 0.017, 6e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-4, 8e-3, 4e-3, 8e-3, 4e-3, 4e-3, 3e-3, 5e-3, 4e-3, 6e-3, 2e-3, 3e-3, 3e-3, 5e-3, 4e-3, 3e-3, 8e-3, 1e-4, 4e-3, 8e-3, 5e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 1e-4, 6e-3, 1e-4, 6e-3, 1e-4, 2e-3, 1e-4, 0.062, 6e-3, 0.017, 0.014, 0.042, 7e-3, 9e-3, 0.018, 0.038, 1e-3, 6e-3, 0.024, 0.018, 0.035, 0.032, 0.011, 1e-3, 0.036, 0.022, 0.032, 0.017, 5e-3, 4e-3, 2e-3, 0.01, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.122, 2.149, 0.144, 0.01, 1e-4, 0.297, 0.436, 0.597, 0.764, 0.136, 0.24, 0.226, 5e-3, 5.298, 0.158, 0.027, 0.013, 1e-4, 0.078, 0.014, 1e-4, 2.36, 1e-4, 1e-4, 1e-3, 0.171, 0.627, 1e-4, 0.037, 2e-3, 0.021, 1.319, 0.014, 1e-4, 1e-3, 0.32, 2.012, 1e-3, 1e-3, 1e-4, 0.539, 0.989, 1.521, 1e-4, 1e-4, 1e-3, 23.215, 10.185, 1.322, 0.801, 1.028, 0.757, 0.189, 0.942, 1e-4, 0.015, 0.06, 0.015, 1e-4, 1e-4, 1e-4, 1e-4, 1.18, 2.177, 1e-4, 1e-4, 0.016, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 31.245, 1e-4, 0.013, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tcy": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.391, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.751, 1e-3, 0.026, 1e-4, 1e-4, 2e-3, 1e-4, 0.028, 0.048, 0.047, 1e-4, 1e-3, 0.244, 0.028, 0.533, 0.012, 0.014, 0.02, 0.01, 5e-3, 5e-3, 7e-3, 6e-3, 4e-3, 8e-3, 9e-3, 9e-3, 3e-3, 2e-3, 3e-3, 2e-3, 2e-3, 1e-4, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 3e-3, 1e-4, 1e-3, 1e-3, 0.02, 2e-3, 8e-3, 6e-3, 0.018, 2e-3, 5e-3, 6e-3, 0.017, 1e-4, 3e-3, 9e-3, 8e-3, 0.014, 0.015, 8e-3, 1e-4, 0.013, 0.012, 0.015, 6e-3, 2e-3, 5e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.354, 1.789, 1.221, 0.031, 1e-4, 0.268, 1.686, 0.484, 0.152, 0.21, 0.745, 0.196, 0.087, 4.125, 0.064, 0.014, 0.014, 1e-4, 0.109, 0.011, 1e-3, 1.28, 0.033, 0.613, 0.012, 7e-3, 0.23, 3e-3, 0.404, 2e-3, 0.011, 0.433, 0.058, 1.007, 2e-3, 0.198, 1.312, 0.064, 1.397, 0.124, 1.439, 0.012, 1.248, 0.035, 0.624, 0.105, 0.769, 0.62, 1.755, 1e-4, 22.872, 9.408, 1e-4, 0.629, 0.164, 0.121, 0.665, 0.124, 1e-4, 1e-4, 3e-3, 1e-4, 1.377, 1.63, 1e-4, 1e-4, 0.05, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.955, 1e-4, 0.194, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "te": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.34, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.746, 3e-3, 0.051, 1e-4, 1e-3, 3e-3, 2e-3, 7e-3, 0.042, 0.043, 1e-4, 1e-3, 0.336, 0.028, 0.611, 0.018, 0.129, 0.152, 0.069, 0.038, 0.034, 0.073, 0.03, 0.032, 0.034, 0.047, 0.02, 7e-3, 2e-3, 4e-3, 2e-3, 2e-3, 1e-4, 8e-3, 4e-3, 6e-3, 5e-3, 3e-3, 3e-3, 2e-3, 2e-3, 6e-3, 1e-3, 2e-3, 3e-3, 5e-3, 3e-3, 2e-3, 5e-3, 1e-4, 3e-3, 8e-3, 5e-3, 3e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 6e-3, 1e-4, 7e-3, 1e-4, 5e-3, 1e-4, 0.053, 8e-3, 0.019, 0.022, 0.056, 9e-3, 0.01, 0.021, 0.046, 1e-3, 4e-3, 0.022, 0.015, 0.038, 0.038, 0.014, 1e-4, 0.036, 0.036, 0.045, 0.017, 6e-3, 6e-3, 2e-3, 7e-3, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.485, 1.801, 1.898, 0.051, 1e-4, 0.236, 0.427, 0.575, 0.238, 0.222, 0.152, 0.685, 0.105, 2.799, 0.055, 0.027, 6e-3, 1e-4, 0.047, 7e-3, 5e-3, 1.329, 0.049, 0.668, 0.014, 2e-3, 0.428, 4e-3, 0.25, 1e-3, 4e-3, 0.537, 0.039, 0.598, 2e-3, 0.137, 0.864, 0.099, 0.843, 0.149, 1.628, 1e-4, 0.909, 0.085, 0.267, 0.128, 0.942, 0.804, 25.531, 7.165, 1.487, 0.074, 1e-4, 0.877, 0.211, 0.153, 0.855, 0.145, 1e-4, 1e-3, 1e-4, 1e-4, 2.169, 2.359, 1e-4, 1e-4, 0.014, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 30.736, 1e-4, 0.069, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tet": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.506, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.056, 0.014, 0.345, 1e-4, 4e-3, 0.018, 1e-3, 0.455, 0.383, 0.382, 1e-3, 4e-3, 1.067, 0.53, 0.968, 0.029, 0.443, 0.39, 0.316, 0.132, 0.112, 0.137, 0.105, 0.106, 0.119, 0.181, 0.186, 0.018, 0.015, 5e-3, 0.015, 3e-3, 1e-4, 0.338, 0.226, 0.145, 0.169, 0.132, 0.156, 0.098, 0.111, 0.215, 0.061, 0.136, 0.43, 0.301, 0.181, 0.101, 0.266, 0.01, 0.137, 0.345, 0.37, 0.107, 0.065, 0.041, 0.021, 8e-3, 0.014, 0.01, 1e-4, 0.01, 1e-4, 1e-4, 1e-4, 11.569, 1.502, 0.408, 2.068, 6.067, 0.587, 0.66, 2.225, 7.509, 0.16, 2.246, 2.814, 2.311, 6.307, 4.401, 1.282, 0.035, 4.022, 4.063, 3.545, 4.826, 0.518, 0.1, 0.064, 0.126, 0.341, 1e-4, 9e-3, 1e-4, 1e-4, 1e-4, 0.318, 0.081, 3e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 2e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.015, 1e-3, 1e-4, 1e-4, 1e-3, 4e-3, 0.275, 1e-3, 1e-4, 0.014, 0.013, 1e-3, 2e-3, 0.021, 0.254, 2e-3, 0.025, 1e-4, 1e-4, 3e-3, 0.02, 2e-3, 0.389, 6e-3, 1e-3, 1e-3, 0.167, 1e-3, 1e-3, 2e-3, 0.048, 0.071, 0.284, 0.01, 3e-3, 1e-3, 1e-4, 1e-3, 1e-3, 0.076, 3e-3, 0.014, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.1, 1.362, 4e-3, 6e-3, 1e-4, 1e-4, 1e-4, 9e-3, 0.011, 1e-4, 1e-4, 1e-4, 7e-3, 3e-3, 6e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.316, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tg": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.272, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.893, 1e-3, 0.026, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 0.324, 0.326, 1e-4, 1e-3, 0.765, 0.105, 0.581, 6e-3, 0.139, 0.257, 0.13, 0.073, 0.063, 0.072, 0.065, 0.068, 0.082, 0.185, 0.026, 0.048, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.026, 0.01, 0.018, 7e-3, 5e-3, 0.01, 6e-3, 7e-3, 0.018, 2e-3, 5e-3, 8e-3, 9e-3, 6e-3, 4e-3, 9e-3, 1e-3, 7e-3, 0.015, 7e-3, 3e-3, 6e-3, 4e-3, 6e-3, 2e-3, 2e-3, 4e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 0.081, 0.01, 0.03, 0.023, 0.086, 0.012, 0.015, 0.021, 0.065, 2e-3, 9e-3, 0.037, 0.017, 0.055, 0.061, 0.017, 1e-3, 0.07, 0.039, 0.054, 0.023, 0.01, 7e-3, 3e-3, 0.013, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.968, 1.483, 1.764, 1.455, 0.398, 0.384, 8e-3, 0.116, 0.704, 2e-3, 0.17, 0.01, 0.024, 0.035, 0.045, 0.663, 0.178, 0.263, 0.119, 0.126, 0.303, 7e-3, 9e-3, 0.022, 0.136, 3e-3, 0.143, 0.343, 0.148, 0.063, 0.071, 0.071, 0.134, 0.159, 0.101, 0.347, 0.121, 0.05, 2e-3, 0.026, 0.059, 3e-3, 3e-3, 0.057, 3e-3, 0.035, 0.012, 0.164, 5.899, 1.075, 1.071, 1.816, 2.336, 1.339, 0.082, 0.882, 4.885, 0.258, 1.014, 1.438, 1.445, 2.22, 3.885, 0.208, 1e-4, 1e-4, 0.132, 6e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 2e-3, 1e-3, 30.166, 10.131, 1.965, 0.481, 1e-4, 1e-4, 1e-4, 1e-4, 0.024, 0.016, 1e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 0.209, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ti": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.164, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.862, 0.026, 0.05, 1e-4, 1e-4, 0.012, 1e-4, 0.044, 0.1, 0.1, 1e-4, 1e-4, 0.075, 0.114, 0.14, 0.02, 0.098, 0.121, 0.073, 0.033, 0.026, 0.04, 0.027, 0.03, 0.029, 0.042, 0.024, 4e-3, 1e-3, 0.013, 1e-3, 7e-3, 1e-4, 0.018, 0.013, 0.015, 7e-3, 6e-3, 7e-3, 0.011, 0.013, 0.022, 4e-3, 4e-3, 0.024, 0.018, 0.012, 5e-3, 0.015, 4e-3, 0.01, 0.013, 0.022, 7e-3, 9e-3, 6e-3, 2e-3, 4e-3, 2e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.329, 0.063, 0.099, 0.16, 0.451, 0.14, 0.111, 0.211, 0.297, 0.027, 0.053, 0.155, 0.097, 0.283, 0.275, 0.071, 7e-3, 0.228, 0.261, 0.255, 0.122, 0.059, 0.08, 7e-3, 0.069, 0.014, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.358, 0.069, 0.074, 0.236, 7e-3, 0.331, 0.023, 1e-3, 9.303, 5.576, 6.47, 5.805, 1.549, 3.066, 0.251, 3e-3, 0.505, 0.172, 0.135, 1.034, 0.015, 2.293, 0.054, 1e-3, 0.75, 0.233, 0.32, 0.51, 0.12, 1.725, 0.08, 2e-3, 0.83, 0.546, 0.753, 1.425, 0.111, 2.053, 0.138, 0.011, 0.764, 0.373, 0.244, 0.731, 0.034, 1.854, 0.258, 4e-3, 1.053, 0.166, 0.551, 0.69, 0.031, 2.007, 0.179, 5e-3, 0.189, 0.048, 0.045, 0.156, 0.011, 0.447, 0.067, 2e-3, 1e-4, 1e-4, 0.386, 0.04, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.027, 0.012, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 8e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 27.967, 0.209, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tk": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.842, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.847, 5e-3, 0.052, 1e-4, 1e-3, 8e-3, 1e-3, 6e-3, 0.121, 0.125, 4e-3, 2e-3, 0.691, 0.455, 1.024, 0.011, 0.191, 0.306, 0.153, 0.096, 0.091, 0.095, 0.077, 0.079, 0.095, 0.155, 0.055, 0.012, 0.028, 3e-3, 0.028, 5e-3, 1e-4, 0.227, 0.204, 0.012, 0.086, 0.083, 0.04, 0.177, 0.112, 0.174, 0.027, 0.109, 0.037, 0.173, 0.054, 0.141, 0.071, 1e-3, 0.074, 0.173, 0.153, 0.029, 0.028, 0.04, 0.045, 0.029, 0.016, 0.01, 1e-4, 0.01, 1e-3, 3e-3, 1e-4, 8.711, 1.574, 0.069, 3.499, 5.666, 0.119, 2.22, 0.895, 5.266, 0.476, 2.165, 5.087, 2.1, 4.83, 1.754, 1.161, 2e-3, 5.326, 1.953, 2.216, 1.612, 0.014, 0.863, 3e-3, 4.905, 0.889, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.208, 0.022, 0.019, 0.011, 0.017, 7e-3, 3e-3, 0.027, 1.247, 1e-3, 1e-4, 8e-3, 5e-3, 3e-3, 2e-3, 6e-3, 3e-3, 5e-3, 2e-3, 0.04, 0.02, 1e-3, 0.017, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 0.068, 0.139, 0.083, 1.114, 0.015, 4e-3, 9e-3, 2e-3, 0.694, 3e-3, 3e-3, 0.67, 1e-3, 2e-3, 1e-4, 0.027, 1e-4, 0.192, 1e-3, 2e-3, 0.056, 0.114, 0.02, 0.061, 0.013, 0.043, 0.813, 6e-3, 0.038, 7e-3, 0.016, 0.096, 0.984, 2.385, 0.053, 0.019, 1e-4, 1e-4, 0.268, 5.753, 0.012, 2.464, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.324, 0.111, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.054, 0.182, 1e-4, 5e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tl": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.527, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.015, 6e-3, 0.416, 1e-3, 1e-3, 6e-3, 2e-3, 0.043, 0.2, 0.202, 1e-3, 2e-3, 0.702, 0.264, 0.789, 0.017, 0.219, 0.272, 0.17, 0.08, 0.075, 0.082, 0.072, 0.075, 0.087, 0.155, 0.061, 0.022, 0.066, 4e-3, 0.066, 2e-3, 1e-4, 0.555, 0.199, 0.186, 0.134, 0.118, 0.059, 0.112, 0.181, 0.214, 0.066, 0.204, 0.127, 0.268, 0.176, 0.063, 0.292, 0.011, 0.11, 0.398, 0.188, 0.06, 0.045, 0.055, 8e-3, 0.035, 0.014, 0.016, 1e-4, 0.015, 1e-3, 3e-3, 1e-4, 16.44, 1.457, 0.382, 1.246, 2.379, 0.123, 6.741, 1.192, 6.121, 0.033, 2.118, 3.173, 2.569, 9.845, 3.868, 2.142, 0.019, 2.313, 4.125, 3.402, 2.226, 0.121, 0.559, 0.032, 2.131, 0.078, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.038, 8e-3, 5e-3, 4e-3, 4e-3, 3e-3, 2e-3, 2e-3, 4e-3, 2e-3, 2e-3, 2e-3, 3e-3, 7e-3, 3e-3, 2e-3, 4e-3, 4e-3, 2e-3, 0.014, 6e-3, 1e-3, 2e-3, 1e-3, 2e-3, 8e-3, 1e-3, 2e-3, 0.013, 7e-3, 2e-3, 2e-3, 0.028, 0.01, 3e-3, 2e-3, 4e-3, 2e-3, 2e-3, 4e-3, 3e-3, 0.01, 2e-3, 4e-3, 2e-3, 8e-3, 2e-3, 2e-3, 5e-3, 0.01, 3e-3, 7e-3, 3e-3, 3e-3, 2e-3, 2e-3, 6e-3, 3e-3, 4e-3, 3e-3, 5e-3, 3e-3, 3e-3, 3e-3, 1e-4, 1e-4, 0.029, 0.045, 7e-3, 0.011, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.012, 6e-3, 0.01, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 8e-3, 7e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 0.012, 0.037, 5e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tn": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.716, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 17.981, 3e-3, 0.08, 0.013, 1e-3, 9e-3, 2e-3, 0.01, 0.075, 0.075, 1e-4, 1e-4, 0.66, 0.106, 0.757, 0.034, 0.2, 0.226, 0.113, 0.036, 0.039, 0.039, 0.04, 0.035, 0.043, 0.09, 0.021, 0.015, 0.01, 5e-3, 0.011, 4e-3, 1e-4, 0.148, 0.357, 0.071, 0.097, 0.07, 0.054, 0.125, 0.028, 0.051, 0.019, 0.166, 0.104, 0.374, 0.087, 0.085, 0.102, 1e-3, 0.088, 0.173, 0.113, 0.019, 0.017, 0.023, 6e-3, 7e-3, 0.021, 0.023, 1e-4, 0.022, 1e-4, 4e-3, 1e-4, 12.488, 2.445, 0.191, 1.643, 9.389, 0.795, 4.171, 1.899, 3.702, 0.312, 2.67, 5.097, 2.631, 4.499, 8.158, 1.075, 8e-3, 1.917, 4.118, 4.684, 0.837, 0.048, 2.161, 0.014, 0.955, 0.029, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.014, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 1e-4, 1e-4, 3e-3, 3e-3, 1e-4, 1e-4, 0.034, 0.011, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.036, 8e-3, 1e-4, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "to": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.293, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.821, 1e-3, 0.44, 1e-4, 1e-4, 1e-3, 5e-3, 0.111, 0.238, 0.237, 2e-3, 1e-4, 0.847, 0.076, 1.066, 0.045, 0.084, 0.141, 0.063, 0.039, 0.037, 0.032, 0.036, 0.05, 0.065, 0.067, 0.09, 0.023, 3e-3, 0.011, 5e-3, 0.027, 1e-4, 0.126, 0.034, 0.039, 0.011, 0.049, 0.193, 0.01, 0.178, 0.123, 0.01, 0.599, 0.145, 0.204, 0.188, 0.245, 0.136, 1e-3, 0.012, 0.185, 0.547, 0.059, 0.124, 0.026, 1e-3, 5e-3, 1e-3, 4e-3, 1e-4, 5e-3, 1e-4, 2e-3, 1e-3, 10.579, 0.223, 0.423, 0.627, 6.707, 1.724, 1.525, 3.199, 6.545, 0.014, 3.573, 2.547, 1.814, 3.859, 6.712, 1.277, 0.01, 0.909, 1.504, 3.555, 4.441, 0.529, 0.312, 0.02, 0.255, 9e-3, 1e-4, 1e-4, 1e-4, 4e-3, 1e-4, 0.028, 0.432, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.082, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 0.183, 3e-3, 1e-4, 1e-4, 1e-3, 0.011, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 0.057, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 2e-3, 1e-3, 0.078, 1e-4, 0.015, 1e-4, 1e-4, 0.013, 1e-4, 1e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 4.517, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.022, 0.094, 0.659, 0.119, 1e-4, 1e-4, 1e-4, 1e-4, 4.513, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.024, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tpi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.506, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.422, 4e-3, 0.225, 1e-4, 1e-4, 6e-3, 1e-4, 0.033, 0.226, 0.227, 1e-3, 1e-4, 0.976, 0.07, 1.357, 0.011, 0.339, 0.409, 0.202, 0.102, 0.113, 0.106, 0.09, 0.101, 0.134, 0.258, 0.112, 0.01, 0.016, 1e-3, 0.016, 1e-3, 1e-4, 0.28, 0.281, 0.358, 0.108, 0.184, 0.096, 0.132, 0.102, 0.251, 0.103, 0.247, 0.515, 0.27, 0.273, 0.17, 0.405, 0.016, 0.129, 0.696, 0.311, 0.02, 0.133, 0.076, 6e-3, 0.097, 0.011, 6e-3, 1e-4, 6e-3, 1e-4, 3e-3, 1e-4, 9.267, 1.534, 0.295, 1.028, 5.418, 0.186, 3.091, 0.44, 8.286, 0.1, 1.968, 5.697, 3.075, 7.815, 5.428, 2.623, 0.013, 2.618, 3.22, 3.51, 1.911, 0.537, 0.798, 0.013, 0.388, 0.104, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.026, 0.016, 7e-3, 3e-3, 7e-3, 1e-3, 2e-3, 3e-3, 1e-3, 1e-3, 1e-3, 2e-3, 6e-3, 2e-3, 1e-3, 1e-3, 4e-3, 2e-3, 1e-3, 0.01, 2e-3, 2e-3, 2e-3, 3e-3, 1e-3, 4e-3, 1e-3, 5e-3, 9e-3, 9e-3, 3e-3, 2e-3, 0.021, 0.037, 1e-3, 6e-3, 1e-4, 1e-3, 1e-3, 2e-3, 2e-3, 0.013, 5e-3, 3e-3, 4e-3, 0.024, 2e-3, 2e-3, 6e-3, 0.026, 7e-3, 0.298, 2e-3, 5e-3, 3e-3, 3e-3, 0.01, 4e-3, 0.011, 0.015, 5e-3, 5e-3, 3e-3, 4e-3, 1e-4, 1e-4, 0.019, 0.408, 7e-3, 9e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.02, 0.011, 0.021, 8e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 0.012, 0.021, 9e-3, 3e-3, 9e-3, 3e-3, 1e-3, 1e-3, 2e-3, 4e-3, 3e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ts": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.117, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.445, 4e-3, 0.183, 1e-4, 1e-4, 6e-3, 1e-3, 0.136, 0.107, 0.107, 1e-4, 1e-4, 0.868, 0.158, 0.838, 0.021, 0.152, 0.161, 0.081, 0.037, 0.038, 0.052, 0.045, 0.043, 0.056, 0.092, 0.041, 0.025, 0.03, 1e-3, 0.03, 6e-3, 1e-4, 0.18, 0.088, 0.068, 0.084, 0.075, 0.029, 0.061, 0.137, 0.055, 0.032, 0.132, 0.116, 0.387, 0.232, 0.02, 0.062, 2e-3, 0.075, 0.171, 0.121, 0.04, 0.219, 0.021, 0.119, 0.045, 0.021, 3e-3, 1e-4, 3e-3, 1e-4, 2e-3, 5e-3, 13.463, 1.384, 0.275, 1.092, 4.958, 0.572, 1.347, 3.614, 7.958, 0.047, 4.285, 4.291, 2.768, 5.921, 3.615, 0.489, 0.025, 2.056, 2.585, 2.874, 4.929, 1.994, 3.082, 0.68, 2.172, 0.64, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.055, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-4, 5e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 0.031, 1e-4, 1e-3, 8e-3, 8e-3, 1e-4, 1e-4, 0.05, 4e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-3, 3e-3, 1e-4, 2e-3, 1e-3, 5e-3, 2e-3, 0.011, 2e-3, 1e-4, 1e-4, 1e-3, 2e-3, 2e-3, 1e-3, 2e-3, 2e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-4, 0.051, 0.023, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.018, 6e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 0.054, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tt": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.086, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.219, 1e-3, 0.085, 1e-4, 1e-4, 0.04, 1e-4, 2e-3, 0.22, 0.221, 1e-4, 8e-3, 0.529, 0.164, 0.713, 7e-3, 0.223, 0.276, 0.185, 0.093, 0.09, 0.084, 0.067, 0.069, 0.089, 0.159, 0.097, 8e-3, 2e-3, 1e-3, 2e-3, 3e-3, 1e-4, 0.01, 9e-3, 0.017, 9e-3, 6e-3, 3e-3, 2e-3, 3e-3, 0.017, 1e-3, 9e-3, 3e-3, 0.013, 3e-3, 3e-3, 4e-3, 5e-3, 5e-3, 0.013, 0.017, 9e-3, 6e-3, 2e-3, 0.01, 3e-3, 1e-3, 2e-3, 1e-4, 2e-3, 1e-4, 2e-3, 1e-4, 0.245, 0.051, 0.015, 0.059, 0.152, 0.017, 0.027, 0.019, 0.108, 2e-3, 0.051, 0.14, 0.059, 0.158, 0.057, 0.025, 0.035, 0.149, 0.073, 0.108, 0.056, 0.01, 0.015, 0.014, 0.048, 0.025, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.852, 1.726, 1.824, 1.398, 0.151, 0.194, 0.076, 0.605, 0.638, 4e-3, 0.1, 2.623, 0.236, 0.061, 0.057, 0.479, 0.123, 0.129, 0.053, 0.062, 0.279, 0.075, 0.02, 0.174, 0.096, 1.916, 0.222, 0.025, 0.1, 0.049, 0.069, 0.128, 0.159, 0.146, 0.119, 0.43, 0.164, 0.055, 3e-3, 0.065, 0.036, 0.325, 1e-4, 0.038, 1e-3, 0.013, 0.042, 0.429, 4.958, 1.044, 0.394, 1.429, 0.959, 3.011, 0.048, 0.384, 1.557, 0.433, 1.901, 3.01, 1.056, 3.108, 1.043, 0.407, 1e-4, 1e-4, 0.106, 0.225, 0.139, 0.034, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 4e-3, 1e-4, 3e-3, 1e-3, 26.093, 12.748, 1.127, 2.265, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 0.275, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tum": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.34, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.852, 4e-3, 0.573, 3e-3, 4e-3, 4e-3, 0.017, 0.083, 0.308, 0.306, 1e-3, 1e-4, 1.303, 0.412, 1.2, 0.024, 0.557, 0.476, 0.366, 0.176, 0.172, 0.213, 0.206, 0.176, 0.165, 0.191, 0.118, 0.025, 0.012, 7e-3, 0.012, 1e-4, 1e-3, 0.268, 0.377, 0.217, 0.158, 0.11, 0.095, 0.125, 0.123, 0.134, 0.277, 0.29, 0.111, 0.727, 0.21, 0.076, 0.143, 0.01, 0.116, 0.269, 0.294, 0.069, 0.067, 0.069, 3e-3, 0.068, 0.042, 8e-3, 1e-4, 8e-3, 1e-4, 1e-4, 1e-4, 10.116, 1.728, 1.817, 1.937, 5.125, 1.225, 1.488, 3.251, 6.548, 0.159, 2.454, 2.854, 2.514, 5.282, 4.292, 2.074, 0.028, 2.715, 2.7, 3.62, 4.127, 0.602, 1.862, 0.051, 1.299, 0.758, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.102, 0.017, 0.014, 0.014, 0.01, 6e-3, 8e-3, 5e-3, 3e-3, 1e-3, 7e-3, 6e-3, 0.02, 0.058, 0.017, 3e-3, 8e-3, 5e-3, 1e-3, 0.016, 5e-3, 5e-3, 3e-3, 4e-3, 9e-3, 0.043, 4e-3, 1e-3, 8e-3, 5e-3, 6e-3, 2e-3, 0.103, 6e-3, 8e-3, 7e-3, 1e-3, 5e-3, 9e-3, 0.025, 6e-3, 0.01, 3e-3, 0.011, 6e-3, 4e-3, 1e-4, 3e-3, 0.016, 0.015, 3e-3, 0.014, 8e-3, 0.112, 3e-3, 0.014, 0.012, 8e-3, 0.012, 0.012, 8e-3, 9e-3, 0.01, 3e-3, 1e-4, 1e-4, 0.101, 0.045, 6e-3, 0.195, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 3e-3, 0.063, 0.038, 1e-3, 1e-3, 1e-3, 6e-3, 3e-3, 7e-3, 0.053, 0.034, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.016, 0.022, 0.093, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 0.012, 8e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tw": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.984, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.303, 1e-3, 0.389, 1e-4, 1e-3, 1e-4, 4e-3, 0.077, 0.488, 0.486, 1e-4, 1e-4, 0.756, 0.118, 1.791, 0.025, 0.73, 0.614, 0.579, 0.248, 0.221, 0.18, 0.206, 0.176, 0.192, 0.286, 0.065, 0.035, 4e-3, 1e-4, 4e-3, 0.01, 1e-4, 0.602, 0.283, 0.296, 0.116, 0.311, 0.173, 0.2, 0.1, 0.303, 0.048, 0.367, 0.187, 0.399, 0.306, 0.149, 0.189, 0.019, 0.18, 0.508, 0.305, 0.203, 0.099, 0.096, 0.049, 0.077, 0.01, 3e-3, 1e-4, 0.019, 1e-4, 1e-4, 1e-4, 8.315, 0.995, 0.605, 1.602, 5.365, 0.628, 0.659, 0.955, 4.58, 0.091, 2.249, 1.426, 1.892, 5.378, 5.608, 0.884, 0.03, 3.156, 2.583, 1.888, 2.004, 0.328, 1.708, 0.075, 2.441, 0.168, 1e-4, 1e-4, 1e-4, 0.01, 1e-4, 0.083, 0.035, 0.035, 0.017, 0.032, 0.015, 0.093, 0.059, 0.023, 0.016, 0.025, 0.022, 0.019, 0.022, 0.029, 0.012, 0.046, 0.013, 9e-3, 0.017, 0.855, 4e-3, 0.017, 0.017, 6e-3, 4e-3, 0.012, 1.236, 0.017, 0.012, 0.01, 4e-3, 0.081, 0.046, 0.012, 0.012, 0.086, 0.028, 0.017, 0.054, 0.03, 0.075, 0.019, 0.012, 0.016, 0.036, 9e-3, 0.019, 0.074, 0.048, 0.057, 0.049, 0.013, 2.039, 0.016, 0.03, 0.109, 0.023, 0.064, 0.039, 0.051, 0.048, 0.068, 0.015, 1e-4, 1e-4, 0.075, 0.196, 0.058, 0.036, 0.106, 1e-4, 1e-3, 1.812, 4e-3, 1e-4, 1e-3, 1e-4, 2.053, 6e-3, 0.306, 0.086, 1e-4, 1e-4, 1e-4, 0.012, 3e-3, 0.267, 0.158, 0.09, 7e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.209, 0.016, 0.044, 1e-4, 0.016, 0.052, 0.016, 0.023, 0.012, 3e-3, 1e-3, 1e-4, 3e-3, 1e-4, 1e-4, 0.019, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ty": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5.596, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.482, 2e-3, 0.148, 1e-4, 1e-4, 1e-4, 1e-3, 0.103, 0.185, 0.187, 1e-4, 1e-4, 0.459, 0.229, 1.457, 0.013, 0.217, 0.354, 0.181, 0.099, 0.109, 0.09, 0.093, 0.094, 0.097, 0.295, 0.032, 0.014, 2e-3, 1e-3, 0.023, 1e-4, 1e-4, 0.336, 0.259, 0.191, 0.056, 0.549, 0.206, 0.061, 0.142, 0.109, 0.062, 0.031, 0.131, 0.411, 0.099, 0.644, 0.477, 8e-3, 0.194, 0.401, 0.951, 0.146, 0.18, 0.019, 4e-3, 0.015, 7e-3, 8e-3, 1e-4, 0.01, 1e-4, 3e-3, 1e-4, 9.536, 0.253, 0.42, 0.705, 6.452, 0.803, 0.335, 1.722, 7.016, 0.092, 0.277, 1.311, 1.613, 3.693, 4.012, 0.994, 0.04, 4.455, 1.038, 5.804, 2.543, 0.371, 0.019, 0.027, 0.146, 0.201, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.052, 0.908, 7e-3, 2e-3, 7e-3, 1e-3, 1e-4, 3e-3, 6e-3, 1e-3, 3e-3, 2e-3, 2e-3, 1.282, 1e-4, 1e-3, 7e-3, 1e-4, 0.043, 0.549, 0.01, 1e-4, 1e-4, 3e-3, 0.114, 1.916, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.19, 0.144, 0.074, 2e-3, 2e-3, 3e-3, 3e-3, 0.022, 0.06, 0.039, 0.051, 0.598, 0.116, 0.035, 3e-3, 0.018, 3e-3, 0.029, 0.506, 0.059, 5e-3, 3e-3, 1e-4, 1e-3, 2e-3, 8e-3, 0.013, 0.037, 5e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 0.033, 1.417, 1.711, 1.627, 1e-4, 1e-4, 1e-4, 8e-3, 0.01, 5e-3, 2e-3, 1e-3, 1e-4, 1e-4, 9e-3, 6e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 0.012, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 2.037, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "tyv": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.67, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.942, 5e-3, 0.141, 1e-4, 1e-4, 4e-3, 1e-3, 3e-3, 0.097, 0.1, 1e-4, 1e-3, 0.649, 0.583, 0.64, 9e-3, 0.087, 0.151, 0.08, 0.042, 0.04, 0.04, 0.033, 0.032, 0.035, 0.099, 0.046, 0.011, 8e-3, 2e-3, 8e-3, 8e-3, 1e-4, 7e-3, 2e-3, 3e-3, 2e-3, 2e-3, 2e-3, 1e-3, 2e-3, 0.022, 1e-4, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-3, 3e-3, 3e-3, 1e-3, 6e-3, 2e-3, 0.011, 1e-3, 1e-4, 5e-3, 1e-4, 5e-3, 1e-4, 5e-3, 1e-4, 0.081, 5e-3, 6e-3, 8e-3, 0.025, 2e-3, 5e-3, 6e-3, 0.02, 2e-3, 7e-3, 0.012, 0.016, 0.015, 0.021, 0.013, 3e-3, 0.017, 0.01, 0.014, 0.01, 2e-3, 4e-3, 7e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.263, 0.883, 1.755, 1.893, 0.056, 0.377, 0.045, 1.004, 0.604, 5e-3, 0.051, 2.643, 0.086, 0.75, 0.036, 0.173, 0.125, 0.135, 0.03, 0.065, 0.108, 0.011, 0.018, 5e-3, 0.038, 5e-3, 0.129, 0.036, 0.079, 0.041, 0.11, 0.022, 0.066, 0.107, 0.147, 0.782, 0.015, 0.082, 8e-3, 0.088, 0.054, 0.476, 1e-3, 0.089, 1e-3, 0.039, 0.018, 0.892, 5.51, 0.98, 0.415, 1.888, 1.904, 2.436, 0.478, 0.679, 2.249, 0.486, 1.593, 2.459, 0.684, 3.034, 1.582, 0.744, 1e-4, 1e-4, 0.143, 0.011, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 2e-3, 4e-3, 3e-3, 0.01, 1e-3, 0.011, 2e-3, 28.453, 13.514, 1.663, 0.515, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 1e-3, 0.094, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "udm": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.306, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.09, 4e-3, 0.114, 1e-4, 1e-4, 8e-3, 1e-4, 2e-3, 0.237, 0.238, 2e-3, 1e-3, 0.557, 0.317, 0.775, 0.018, 0.183, 0.302, 0.16, 0.086, 0.075, 0.092, 0.071, 0.074, 0.085, 0.189, 0.048, 0.012, 0.017, 0.014, 0.016, 1e-3, 1e-4, 0.018, 8e-3, 0.012, 4e-3, 3e-3, 3e-3, 3e-3, 3e-3, 0.016, 4e-3, 4e-3, 6e-3, 0.014, 3e-3, 0.019, 0.021, 1e-4, 6e-3, 0.011, 6e-3, 3e-3, 6e-3, 1e-3, 9e-3, 1e-3, 1e-3, 3e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 0.242, 0.027, 0.103, 0.053, 0.195, 7e-3, 0.026, 0.039, 0.148, 5e-3, 0.015, 0.074, 0.03, 0.111, 0.083, 0.028, 2e-3, 0.108, 0.083, 0.059, 0.078, 0.015, 4e-3, 4e-3, 0.02, 8e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 2.622, 2.823, 2.068, 1.727, 0.105, 0.092, 0.121, 0.28, 0.404, 0.054, 0.451, 2.424, 1.272, 0.932, 0.131, 0.626, 0.166, 0.634, 0.123, 0.164, 0.252, 0.027, 6e-3, 0.023, 0.083, 9e-3, 0.22, 0.069, 0.124, 0.088, 0.082, 0.223, 0.15, 0.209, 0.107, 0.132, 0.033, 0.405, 0.01, 0.179, 0.05, 4e-3, 1e-3, 0.088, 1e-3, 0.03, 0.018, 0.022, 2.886, 0.44, 0.8, 0.564, 1.075, 2.236, 0.315, 1.165, 1.904, 0.34, 1.795, 2.214, 1.337, 2.854, 2.759, 0.664, 1e-4, 1e-4, 0.24, 0.028, 5e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 0.023, 1e-4, 1e-3, 1e-4, 25.262, 16.34, 5e-3, 0.714, 1e-4, 5e-3, 1e-3, 2e-3, 5e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 6e-3, 0.277, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ug": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6.843, 5e-3, 0.045, 1e-4, 1e-4, 6e-3, 1e-4, 0.05, 0.059, 0.061, 1e-3, 1e-3, 0.064, 0.182, 0.431, 6e-3, 0.116, 0.137, 0.086, 0.058, 0.051, 0.055, 0.044, 0.042, 0.045, 0.072, 0.055, 7e-3, 0.018, 9e-3, 0.017, 1e-4, 1e-4, 0.014, 5e-3, 4e-3, 3e-3, 2e-3, 1e-3, 2e-3, 2e-3, 0.011, 8e-3, 9e-3, 3e-3, 0.013, 2e-3, 2e-3, 5e-3, 1e-3, 2e-3, 0.015, 0.014, 0.019, 1e-3, 2e-3, 2e-3, 3e-3, 1e-4, 3e-3, 1e-3, 3e-3, 1e-4, 8e-3, 1e-4, 0.198, 0.04, 0.041, 0.081, 0.144, 0.022, 0.07, 0.096, 0.317, 9e-3, 0.06, 0.138, 0.069, 0.164, 0.09, 0.038, 0.044, 0.138, 0.091, 0.118, 0.088, 0.011, 0.018, 0.015, 0.072, 0.022, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.146, 0.075, 1.421, 1.142, 2.553, 1.322, 3.07, 1.622, 1.224, 6.252, 1.181, 0.454, 0.501, 0.027, 0.124, 0.02, 0.545, 0.041, 8e-3, 0.046, 0.025, 2.705, 0.02, 0.099, 0.121, 0.09, 0.015, 0.082, 0.041, 0.012, 0.015, 0.06, 0.068, 6e-3, 5e-3, 0.06, 0.019, 0.028, 1.456, 3.601, 1.011, 0.28, 1.856, 0.056, 0.228, 0.623, 0.346, 2.099, 0.163, 2.119, 0.524, 1.075, 0.873, 0.045, 0.014, 0.035, 0.226, 0.052, 1.208, 0.825, 0.077, 0.089, 1.1, 0.024, 1e-4, 1e-4, 0.118, 0.051, 9e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.765, 0.262, 0.112, 0.09, 1e-4, 1e-4, 1e-4, 1e-3, 14.938, 17.649, 1.694, 5.905, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.067, 2e-3, 2e-3, 6e-3, 3e-3, 3e-3, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 7e-3, 1.731, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ur": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.979, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.161, 2e-3, 0.04, 1e-4, 1e-4, 1e-3, 1e-4, 6e-3, 0.157, 0.157, 1e-4, 1e-3, 0.081, 0.085, 0.055, 7e-3, 0.121, 0.179, 0.119, 0.082, 0.072, 0.073, 0.068, 0.065, 0.07, 0.096, 0.098, 2e-3, 4e-3, 3e-3, 4e-3, 1e-4, 1e-4, 0.02, 0.016, 0.035, 0.016, 6e-3, 7e-3, 0.013, 9e-3, 0.011, 9e-3, 0.012, 0.015, 0.025, 0.011, 7e-3, 0.016, 3e-3, 0.012, 0.029, 0.016, 5e-3, 6e-3, 7e-3, 1e-3, 5e-3, 3e-3, 4e-3, 1e-4, 4e-3, 1e-4, 4e-3, 1e-4, 0.265, 0.03, 0.059, 0.059, 0.181, 0.032, 0.039, 0.075, 0.194, 6e-3, 0.027, 0.102, 0.048, 0.197, 0.175, 0.037, 4e-3, 0.142, 0.109, 0.147, 0.083, 0.021, 0.026, 5e-3, 0.049, 0.011, 1e-4, 0.014, 1e-4, 1e-4, 1e-4, 0.055, 2.387, 0.534, 0.013, 1.581, 2.193, 2.297, 9e-3, 2.712, 4e-3, 0.024, 0.012, 4.725, 4e-3, 0.025, 0.025, 0.036, 0.091, 1.735, 8e-3, 0.507, 1e-3, 1e-3, 2e-3, 0.02, 0.012, 1e-4, 5e-3, 5e-3, 4e-3, 1e-3, 5e-3, 9e-3, 0.069, 0.224, 5e-3, 0.08, 2e-3, 0.401, 5.353, 1.186, 2.395, 1.412, 0.054, 0.699, 0.376, 0.232, 1.576, 0.068, 2.734, 0.325, 1.531, 0.466, 0.218, 0.1, 0.222, 0.073, 1.112, 0.88, 0.012, 2e-3, 2e-3, 1.074, 3e-3, 1e-4, 1e-4, 8e-3, 0.011, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 5e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 18.028, 10.547, 4.494, 8.618, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 1e-3, 0.049, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.043, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "uz": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.321, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.468, 1e-3, 0.189, 1e-4, 1e-4, 0.012, 1e-4, 0.019, 0.383, 0.392, 2e-3, 2e-3, 1.018, 0.346, 1.56, 0.012, 0.451, 0.539, 0.363, 0.217, 0.199, 0.207, 0.182, 0.168, 0.187, 0.31, 0.029, 0.042, 3e-3, 5e-3, 3e-3, 2e-3, 1e-4, 0.288, 0.177, 0.127, 0.096, 0.051, 0.092, 0.103, 0.072, 0.123, 0.042, 0.115, 0.075, 0.277, 0.092, 0.158, 0.088, 0.099, 0.095, 0.293, 0.135, 0.08, 0.063, 0.021, 0.043, 0.077, 0.019, 6e-3, 1e-4, 6e-3, 1e-3, 1e-3, 5e-3, 11.395, 1.621, 0.663, 2.97, 1.946, 0.469, 2.488, 2.791, 9.732, 0.446, 2.32, 4.562, 2.354, 4.897, 4.652, 0.487, 1.34, 4.598, 3.575, 3.341, 2.208, 1.083, 0.027, 0.322, 2.128, 0.799, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 0.456, 6e-3, 8e-3, 4e-3, 2e-3, 1e-3, 1e-3, 1e-3, 3e-3, 2e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 0.165, 0.164, 1e-4, 1e-3, 1e-3, 0.064, 0.017, 1e-3, 2e-3, 0.019, 2e-3, 0.019, 2e-3, 0.169, 3e-3, 3e-3, 1e-4, 2e-3, 1e-4, 1e-4, 2e-3, 7e-3, 0.014, 1e-4, 5e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.04, 6e-3, 6e-3, 0.01, 0.015, 9e-3, 6e-3, 2e-3, 0.016, 2e-3, 6e-3, 0.916, 0.127, 9e-3, 0.012, 2e-3, 1e-4, 1e-4, 0.192, 0.06, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1.018, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.124, 0.036, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.449, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "ve": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.731, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.522, 0.012, 0.078, 1e-4, 1e-4, 1e-3, 1e-4, 9e-3, 0.159, 0.16, 1e-4, 1e-3, 0.539, 0.225, 1.016, 0.019, 0.145, 0.2, 0.126, 0.043, 0.046, 0.05, 0.05, 0.043, 0.035, 0.051, 0.043, 0.011, 0.01, 3e-3, 0.01, 7e-3, 1e-3, 0.246, 0.066, 0.041, 0.13, 0.054, 0.04, 0.046, 0.163, 0.081, 0.023, 0.129, 0.141, 0.422, 0.243, 0.021, 0.074, 2e-3, 0.073, 0.154, 0.414, 0.061, 0.436, 0.032, 7e-3, 0.055, 0.059, 1e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 13.088, 1.237, 0.128, 2.934, 4.075, 0.966, 1.256, 7.989, 6.478, 0.01, 1.611, 2.964, 2.428, 5.855, 4.328, 0.793, 3e-3, 1.372, 2.898, 2.532, 4.835, 2.93, 2.215, 0.021, 0.876, 1.698, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.04, 3e-3, 1e-3, 1e-4, 2e-3, 0.021, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 5e-3, 0.137, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 6e-3, 1e-3, 1e-3, 6e-3, 5e-3, 1e-4, 1e-4, 2e-3, 1e-3, 8e-3, 1e-3, 1e-4, 1e-4, 7e-3, 1e-3, 1e-4, 1e-4, 1e-4, 4e-3, 2e-3, 1e-4, 1e-4, 1e-3, 8e-3, 0.049, 3e-3, 4e-3, 1e-4, 1e-4, 1e-3, 1e-4, 0.157, 0.074, 1e-3, 2e-3, 1e-4, 0.026, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 0.017, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.014, 2e-3, 6e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 6e-3, 0.231, 0.039, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "vec": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.253, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.683, 3e-3, 0.435, 1e-4, 1e-4, 0.011, 1e-3, 0.612, 0.188, 0.187, 1e-4, 2e-3, 0.962, 0.099, 0.799, 0.015, 0.255, 0.324, 0.176, 0.103, 0.099, 0.11, 0.096, 0.095, 0.113, 0.179, 0.07, 0.031, 0.016, 4e-3, 0.016, 1e-3, 1e-4, 0.22, 0.135, 0.257, 0.11, 0.212, 0.092, 0.123, 0.029, 0.211, 0.028, 0.03, 0.164, 0.197, 0.115, 0.055, 0.192, 0.012, 0.112, 0.28, 0.113, 0.043, 0.127, 0.024, 0.034, 8e-3, 0.022, 6e-3, 1e-4, 6e-3, 1e-4, 6e-3, 1e-4, 9.014, 0.584, 2.527, 3.084, 9.08, 0.695, 1.267, 0.67, 6.478, 0.14, 0.121, 3.361, 1.486, 5.29, 5.96, 1.776, 0.156, 4.436, 3.403, 4.054, 1.601, 1.042, 0.044, 0.834, 0.071, 0.222, 1e-4, 6e-3, 1e-4, 1e-4, 1e-4, 0.081, 0.084, 1.282, 4e-3, 2e-3, 2e-3, 1e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 3e-3, 4e-3, 1e-3, 1e-3, 2e-3, 0.013, 1e-3, 0.01, 2e-3, 1e-3, 1e-3, 8e-3, 4e-3, 0.058, 0.055, 1e-3, 3e-3, 3e-3, 1e-4, 1e-3, 0.74, 0.012, 2e-3, 2e-3, 5e-3, 1e-3, 2e-3, 0.041, 0.204, 0.163, 2e-3, 4e-3, 0.188, 7e-3, 1e-3, 2e-3, 0.019, 5e-3, 0.113, 0.084, 4e-3, 3e-3, 3e-3, 1e-3, 3e-3, 0.085, 0.013, 6e-3, 6e-3, 0.01, 0.027, 3e-3, 1e-4, 1e-4, 0.074, 1.6, 0.013, 1.389, 0.061, 1e-4, 5e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 0.014, 7e-3, 0.012, 5e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 0.013, 0.075, 2e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "vep": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.78, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.379, 3e-3, 0.471, 1e-4, 1e-3, 0.103, 1e-4, 0.568, 0.495, 0.495, 1e-4, 0.017, 1.052, 0.379, 1.489, 0.012, 0.568, 0.707, 0.478, 0.223, 0.214, 0.232, 0.198, 0.192, 0.203, 0.325, 0.211, 0.045, 2e-3, 1e-3, 2e-3, 1e-3, 1e-4, 0.203, 0.112, 0.053, 0.077, 0.109, 0.05, 0.072, 0.067, 0.085, 0.066, 0.318, 0.157, 0.187, 0.127, 0.087, 0.197, 1e-3, 0.106, 0.305, 0.17, 0.046, 0.359, 8e-3, 5e-3, 4e-3, 0.023, 0.011, 1e-4, 0.011, 1e-4, 1e-4, 1e-4, 7.907, 0.771, 0.299, 4.189, 5.699, 0.182, 1.123, 1.305, 7.031, 1.198, 2.907, 3.562, 2.965, 5.97, 3.852, 1.33, 3e-3, 2.724, 3.29, 3.069, 2.779, 1.746, 0.01, 4e-3, 0.024, 0.95, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.243, 0.042, 0.031, 0.026, 0.016, 9e-3, 7e-3, 7e-3, 0.018, 3e-3, 8e-3, 0.014, 0.04, 0.228, 4e-3, 0.014, 0.011, 8e-3, 7e-3, 6e-3, 0.198, 4e-3, 4e-3, 4e-3, 4e-3, 0.01, 0.011, 6e-3, 0.059, 6e-3, 7e-3, 7e-3, 0.049, 0.512, 5e-3, 4e-3, 1.459, 5e-3, 5e-3, 0.012, 7e-3, 9e-3, 6e-3, 0.076, 3e-3, 5e-3, 6e-3, 8e-3, 0.087, 0.02, 0.049, 0.021, 0.019, 0.048, 0.155, 0.011, 0.041, 0.019, 0.037, 0.102, 0.539, 0.049, 0.808, 0.016, 1e-4, 1e-4, 0.208, 2.197, 0.255, 1.283, 1e-4, 1e-4, 1e-4, 0.018, 7e-3, 0.013, 2e-3, 1e-3, 0.025, 0.012, 0.469, 0.173, 3e-3, 3e-3, 1e-3, 6e-3, 6e-3, 0.011, 0.026, 0.019, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 0.026, 0.012, 0.203, 2e-3, 1e-3, 3e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "vls": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.228, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.739, 3e-3, 0.38, 1e-4, 1e-4, 5e-3, 3e-3, 0.744, 0.196, 0.195, 1e-3, 1e-3, 0.727, 0.325, 0.943, 9e-3, 0.279, 0.491, 0.2, 0.128, 0.127, 0.144, 0.128, 0.137, 0.161, 0.217, 0.083, 0.01, 8e-3, 3e-3, 8e-3, 2e-3, 1e-4, 0.184, 0.236, 0.118, 0.332, 0.112, 0.115, 0.126, 0.103, 0.261, 0.107, 0.122, 0.141, 0.163, 0.108, 0.113, 0.118, 4e-3, 0.127, 0.191, 0.088, 0.03, 0.223, 0.122, 6e-3, 0.022, 0.104, 1e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 4.751, 0.962, 1.1, 3.988, 12.635, 0.533, 2.162, 1.118, 4.159, 0.386, 1.909, 2.864, 1.62, 7.645, 4.865, 1.022, 0.013, 4.762, 3.511, 4.63, 2.292, 1.812, 1.033, 0.041, 0.74, 0.83, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.13, 3e-3, 3e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 8e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 8e-3, 0.015, 1e-4, 1e-4, 1e-4, 0.025, 0.093, 1e-4, 1e-4, 2e-3, 2e-3, 1e-3, 1e-3, 0.016, 3e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-3, 4e-3, 0.09, 0.034, 0.493, 0.075, 1e-3, 2e-3, 1e-3, 6e-3, 6e-3, 3e-3, 4e-3, 4e-3, 0.299, 2e-3, 3e-3, 1e-3, 2e-3, 1e-3, 2e-3, 2e-3, 5e-3, 2e-3, 1e-3, 2e-3, 1e-4, 1e-4, 0.02, 1.045, 2e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 7e-3, 4e-3, 8e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 2e-3, 0.13, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "vo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.865, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 14.101, 1e-4, 0.089, 1e-4, 0.177, 0.768, 1e-4, 0.013, 0.471, 0.471, 1e-4, 1e-4, 1.958, 0.301, 1.263, 2e-3, 1.009, 1.484, 1.145, 0.885, 0.977, 0.988, 0.827, 0.571, 0.867, 0.731, 0.368, 0.112, 3e-3, 1e-4, 3e-3, 1e-4, 1e-4, 0.099, 0.202, 0.186, 0.179, 0.034, 0.122, 0.068, 0.069, 0.028, 0.029, 0.035, 0.486, 0.223, 0.193, 0.038, 0.198, 4e-3, 0.074, 0.506, 0.089, 0.221, 0.126, 0.048, 1e-3, 8e-3, 0.039, 4e-3, 1e-3, 5e-3, 1e-4, 1e-4, 1e-4, 5.558, 2.077, 0.284, 2.834, 4.622, 1.332, 0.379, 0.28, 4.679, 0.128, 1.147, 4.377, 2.51, 5.854, 4.077, 1.175, 0.015, 1.237, 3.788, 2.427, 1.276, 0.657, 0.06, 0.029, 0.621, 0.304, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.73, 1e-3, 1e-4, 5e-3, 0.073, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 1e-4, 0.033, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.623, 1e-4, 1e-4, 0.045, 1e-4, 0.038, 9e-3, 1e-3, 6e-3, 6e-3, 0.01, 2.184, 1e-4, 1e-4, 3e-3, 0.022, 0.052, 2e-3, 1e-3, 1e-4, 4e-3, 1e-4, 1e-4, 0.27, 1e-3, 0.247, 3e-3, 0.014, 6e-3, 1.503, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1.216, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.516, 5.121, 6e-3, 0.01, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.73, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "wa": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.065, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 16.234, 0.018, 0.387, 1e-4, 1e-4, 1e-3, 5e-3, 1.403, 0.391, 0.397, 1e-4, 6e-3, 1.323, 0.328, 1.748, 0.02, 0.212, 0.344, 0.172, 0.086, 0.07, 0.086, 0.076, 0.078, 0.098, 0.148, 0.393, 0.059, 3e-3, 3e-3, 6e-3, 0.012, 1e-4, 0.126, 0.117, 0.176, 0.177, 0.152, 0.211, 0.071, 0.055, 0.154, 0.041, 0.016, 0.325, 0.219, 0.065, 0.097, 0.121, 3e-3, 0.069, 0.125, 0.076, 0.016, 0.053, 0.079, 5e-3, 7e-3, 5e-3, 0.103, 1e-4, 0.103, 1e-4, 1e-4, 1e-4, 4.343, 0.71, 2.121, 3.465, 9.326, 0.692, 0.491, 0.929, 5.047, 0.968, 0.844, 3.108, 1.647, 4.913, 4.614, 1.529, 0.028, 3.303, 5.504, 4.286, 1.947, 1.135, 0.682, 0.179, 1.059, 0.366, 1e-4, 0.075, 1e-4, 1e-4, 1e-4, 0.076, 2e-3, 2e-3, 1e-3, 1e-3, 0.022, 1e-3, 8e-3, 5e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 2e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.065, 1e-4, 1e-3, 4e-3, 3e-3, 1e-4, 1e-3, 0.371, 2e-3, 0.017, 1e-3, 1e-3, 0.706, 3e-3, 0.089, 0.451, 0.662, 0.205, 0.03, 1e-3, 1e-3, 0.639, 2e-3, 6e-3, 2e-3, 2e-3, 1e-3, 0.243, 4e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 0.257, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.478, 3.239, 2e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 6e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.08, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "war": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.118, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 12.933, 1e-4, 1.377, 1e-4, 1e-4, 1e-4, 3e-3, 4e-3, 8e-3, 8e-3, 1e-4, 1e-4, 0.432, 0.073, 1.214, 1e-3, 0.079, 0.266, 0.062, 0.046, 0.041, 0.046, 0.05, 0.055, 0.111, 0.217, 0.037, 4e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1.082, 0.154, 0.38, 0.175, 0.141, 0.098, 0.127, 0.173, 0.102, 0.057, 0.046, 0.208, 0.316, 0.091, 0.096, 0.293, 4e-3, 0.105, 0.232, 0.146, 0.033, 0.038, 0.367, 0.012, 8e-3, 0.019, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.129, 0.835, 2.123, 1.488, 5.092, 0.584, 3.71, 3.47, 8.491, 0.033, 1.376, 3.841, 1.504, 9.228, 3.14, 2.313, 0.025, 2.807, 5.239, 2.428, 2.957, 0.216, 0.413, 0.116, 1.506, 0.106, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 6e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 2e-3, 4e-3, 0.019, 1e-4, 1e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 4e-3, 3e-3, 1e-4, 4e-3, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 6e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.06, 2e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "wo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.906, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 18.371, 7e-3, 0.083, 1e-4, 1e-4, 2e-3, 1e-4, 0.048, 0.243, 0.244, 1e-4, 1e-3, 1.526, 0.299, 0.6, 0.011, 0.077, 0.162, 0.075, 0.048, 0.048, 0.043, 0.038, 0.041, 0.05, 0.065, 0.149, 0.021, 1e-3, 5e-3, 1e-3, 9e-3, 1e-4, 0.248, 0.196, 0.082, 0.079, 0.037, 0.083, 0.06, 0.026, 0.08, 0.079, 0.082, 0.102, 0.179, 0.109, 0.049, 0.052, 5e-3, 0.054, 0.208, 0.113, 0.015, 0.012, 0.059, 0.037, 0.106, 2e-3, 2e-3, 1e-4, 2e-3, 1e-4, 1e-3, 1e-4, 10.502, 2.142, 1.408, 2.296, 5.004, 0.815, 2.647, 0.171, 6.017, 1.265, 2.73, 3.516, 3.296, 5.064, 5.377, 0.616, 0.08, 2.151, 1.518, 2.39, 4.356, 0.021, 1.494, 1.066, 2.37, 0.019, 2e-3, 1e-4, 4e-3, 1e-4, 1e-4, 0.102, 6e-3, 3e-3, 3e-3, 0.01, 5e-3, 4e-3, 3e-3, 5e-3, 1e-3, 5e-3, 0.02, 1e-3, 1e-3, 8e-3, 2e-3, 5e-3, 0.039, 3e-3, 0.026, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 0.041, 1e-3, 1e-4, 0.016, 0.015, 1e-4, 1e-4, 0.641, 1e-3, 2e-3, 4e-3, 2e-3, 1e-3, 1e-3, 0.012, 0.011, 0.402, 4e-3, 0.775, 1e-3, 2e-3, 1e-3, 2e-3, 4e-3, 0.912, 0.013, 0.056, 2e-3, 2e-3, 1e-3, 2e-3, 3e-3, 3e-3, 2e-3, 0.013, 1e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.028, 2.826, 2e-3, 0.019, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 2e-3, 1e-4, 4e-3, 2e-3, 0.016, 0.018, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 7e-3, 0.033, 0.053, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 0.096, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "wuu": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.208, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.344, 1e-3, 0.064, 1e-4, 1e-4, 0.012, 1e-3, 5e-3, 0.037, 0.032, 1e-3, 2e-3, 0.029, 0.05, 0.042, 0.019, 0.267, 0.364, 0.21, 0.108, 0.106, 0.12, 0.107, 0.1, 0.123, 0.181, 0.013, 1e-3, 0.013, 2e-3, 0.013, 1e-3, 1e-4, 0.027, 0.021, 0.029, 0.015, 0.013, 0.01, 0.014, 0.013, 0.018, 7e-3, 0.011, 0.017, 0.022, 0.016, 0.01, 0.023, 2e-3, 0.017, 0.03, 0.019, 9e-3, 6e-3, 8e-3, 2e-3, 3e-3, 2e-3, 0.03, 1e-4, 0.03, 1e-4, 3e-3, 1e-4, 0.184, 0.024, 0.041, 0.051, 0.161, 0.019, 0.037, 0.056, 0.143, 5e-3, 0.024, 0.082, 0.047, 0.138, 0.118, 0.028, 6e-3, 0.111, 0.081, 0.088, 0.07, 0.016, 0.015, 0.01, 0.024, 8e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-4, 2.843, 1.238, 1.324, 0.655, 0.418, 1.022, 0.586, 0.937, 1.267, 1.305, 0.731, 1.421, 2.335, 0.988, 0.859, 1.016, 1.143, 0.568, 0.436, 0.439, 0.836, 0.673, 0.873, 1.003, 0.932, 0.655, 0.691, 1.033, 1.591, 0.82, 0.469, 0.875, 0.536, 0.577, 0.431, 0.453, 0.911, 0.859, 0.578, 0.722, 0.777, 0.496, 1.371, 0.496, 0.553, 1.219, 0.891, 1.125, 1.185, 0.888, 0.563, 0.66, 0.876, 0.472, 0.61, 0.726, 3.021, 1.231, 1.855, 1.189, 2.708, 1.052, 0.869, 1.001, 1e-4, 1e-4, 0.059, 0.019, 3e-3, 3e-3, 1e-3, 1e-4, 1e-4, 5e-3, 2e-3, 2e-3, 2e-3, 1e-4, 0.011, 4e-3, 0.02, 7e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 3e-3, 0.011, 9e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-4, 0.068, 5e-3, 0.208, 1.565, 4.388, 9.361, 5.679, 3.099, 2.882, 2.131, 2e-3, 4e-3, 8e-3, 2e-3, 1e-4, 1.953, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "xal": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2.016, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 7.801, 2e-3, 0.076, 1e-4, 1e-4, 5e-3, 1e-4, 2e-3, 0.134, 0.134, 1e-3, 3e-3, 0.529, 0.574, 0.918, 6e-3, 0.214, 0.423, 0.268, 0.17, 0.177, 0.128, 0.129, 0.128, 0.121, 0.185, 0.028, 7e-3, 6e-3, 1e-3, 6e-3, 6e-3, 1e-4, 5e-3, 4e-3, 4e-3, 1e-3, 2e-3, 2e-3, 2e-3, 2e-3, 6e-3, 1e-3, 2e-3, 2e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-4, 2e-3, 5e-3, 3e-3, 1e-3, 2e-3, 3e-3, 4e-3, 1e-3, 1e-3, 5e-3, 1e-4, 6e-3, 1e-4, 5e-3, 1e-4, 0.064, 0.016, 0.035, 0.026, 0.079, 0.017, 0.024, 0.144, 0.059, 3e-3, 0.012, 0.04, 0.028, 0.059, 0.05, 0.015, 2e-3, 0.048, 0.045, 0.048, 0.035, 8e-3, 9e-3, 6e-3, 0.012, 6e-3, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 2.512, 1.678, 1.585, 1.178, 0.036, 0.859, 0.336, 0.487, 0.211, 8e-3, 0.012, 0.272, 0.319, 0.492, 0.054, 0.135, 0.09, 0.152, 0.041, 0.073, 0.19, 0.017, 0.022, 0.69, 0.054, 1.446, 0.115, 0.043, 0.168, 0.153, 0.159, 0.053, 0.055, 0.105, 0.151, 0.242, 0.028, 0.118, 0.031, 0.02, 0.093, 0.554, 4e-3, 0.02, 2e-3, 0.072, 0.031, 0.849, 3.75, 1.252, 0.825, 1.816, 2.139, 1.256, 0.115, 0.387, 2.666, 0.446, 0.987, 3.364, 1.079, 4.101, 2.147, 0.166, 1e-4, 1e-4, 0.041, 6e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 0.038, 1e-4, 1e-4, 4e-3, 1e-4, 7e-3, 4e-3, 27.749, 10.017, 2.264, 1.98, 1e-4, 3e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.024, 0.035, 0.127, 1e-4, 1e-4, 4e-3, 2e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "xh": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.827, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 11.133, 0.013, 0.259, 4e-3, 1e-3, 9e-3, 2e-3, 0.046, 0.125, 0.123, 1e-3, 5e-3, 0.846, 0.831, 0.912, 0.026, 0.163, 0.218, 0.112, 0.059, 0.052, 0.058, 0.048, 0.051, 0.067, 0.118, 0.048, 0.023, 0.018, 6e-3, 0.018, 6e-3, 1e-4, 0.218, 0.122, 0.114, 0.05, 0.111, 0.054, 0.063, 0.043, 0.32, 0.057, 0.15, 0.086, 0.186, 0.216, 0.074, 0.101, 0.011, 0.057, 0.136, 0.094, 0.198, 0.022, 0.071, 0.041, 0.042, 0.046, 0.076, 1e-3, 0.076, 1e-4, 0.013, 1e-4, 10.703, 2.404, 0.805, 1.231, 8.068, 0.529, 2.029, 3.142, 7.484, 0.244, 4.325, 4.529, 2.518, 6.863, 5.226, 0.943, 0.434, 1.064, 2.867, 2.574, 4.687, 0.307, 2.513, 0.353, 2.341, 2.213, 2e-3, 0.028, 2e-3, 1e-4, 1e-4, 0.043, 3e-3, 1e-3, 1e-3, 2e-3, 1e-4, 4e-3, 0.012, 3e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 2e-3, 1e-3, 4e-3, 0.01, 3e-3, 1e-4, 1e-4, 1e-3, 3e-3, 0.018, 1e-4, 1e-4, 5e-3, 5e-3, 1e-4, 1e-3, 0.1, 5e-3, 1e-3, 4e-3, 1e-3, 1e-4, 1e-4, 3e-3, 1e-3, 7e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-3, 4e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 2e-3, 1e-3, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.101, 0.03, 0.014, 3e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 4e-3, 3e-3, 4e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 0.049, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "xmf": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.601, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4.701, 1e-3, 0.058, 1e-4, 1e-4, 0.01, 1e-4, 2e-3, 0.121, 0.121, 1e-4, 1e-3, 0.458, 0.166, 0.464, 5e-3, 0.164, 0.192, 0.121, 0.06, 0.056, 0.064, 0.055, 0.055, 0.065, 0.102, 0.028, 0.018, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 8e-3, 6e-3, 8e-3, 7e-3, 3e-3, 4e-3, 3e-3, 3e-3, 0.027, 1e-3, 2e-3, 6e-3, 7e-3, 3e-3, 3e-3, 5e-3, 1e-4, 4e-3, 7e-3, 9e-3, 2e-3, 8e-3, 3e-3, 0.01, 1e-3, 1e-4, 6e-3, 1e-4, 6e-3, 1e-4, 1e-3, 1e-4, 0.041, 6e-3, 0.016, 0.012, 0.042, 4e-3, 7e-3, 0.012, 0.032, 1e-3, 6e-3, 0.021, 0.011, 0.029, 0.03, 7e-3, 1e-3, 0.029, 0.023, 0.023, 0.015, 5e-3, 3e-3, 2e-3, 6e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 0.172, 3e-3, 2e-3, 30.333, 2e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 4.083, 0.506, 0.555, 0.957, 2.283, 0.421, 0.156, 0.803, 3.59, 0.653, 1.19, 1.236, 1.788, 2.02, 0.312, 0.098, 2.097, 1.217, 0.638, 1.469, 0.698, 0.389, 0.172, 0.093, 1.339, 0.152, 0.183, 0.083, 0.259, 0.102, 0.41, 0.184, 0.054, 9e-3, 0.013, 2e-3, 1e-3, 3e-3, 1e-3, 0.323, 0.062, 2e-3, 2e-3, 2e-3, 2e-3, 3e-3, 4e-3, 2e-3, 1e-4, 1e-4, 0.043, 4e-3, 1e-3, 1e-3, 7e-3, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 1e-3, 1e-4, 0.011, 2e-3, 0.023, 8e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-3, 4e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9e-3, 30.332, 0.17, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "yi": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.709, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.298, 2e-3, 0.186, 1e-4, 1e-3, 4e-3, 6e-3, 0.121, 0.075, 0.076, 1e-4, 1e-4, 0.466, 0.059, 0.46, 6e-3, 0.099, 0.114, 0.062, 0.037, 0.035, 0.037, 0.03, 0.03, 0.038, 0.064, 0.034, 0.015, 1e-3, 1e-3, 1e-3, 2e-3, 1e-4, 3e-3, 3e-3, 4e-3, 3e-3, 2e-3, 2e-3, 2e-3, 2e-3, 2e-3, 1e-3, 1e-3, 2e-3, 3e-3, 2e-3, 2e-3, 2e-3, 1e-4, 2e-3, 4e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 3e-3, 1e-4, 3e-3, 1e-4, 1e-3, 1e-4, 0.02, 3e-3, 6e-3, 7e-3, 0.022, 3e-3, 4e-3, 6e-3, 0.017, 1e-4, 3e-3, 0.01, 6e-3, 0.015, 0.021, 4e-3, 6e-3, 0.015, 0.011, 0.018, 0.013, 2e-3, 3e-3, 1e-3, 3e-3, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.013, 4e-3, 3e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 1e-3, 1e-4, 1e-4, 1e-3, 5.002, 1.068, 1.228, 1.611, 0.814, 3.904, 1.071, 0.178, 2.364, 5.673, 0.275, 0.347, 1.459, 0.389, 1.018, 2.472, 1.73, 1.057, 4.356, 0.098, 1.356, 0.06, 0.547, 0.832, 3.227, 0.975, 0.239, 1e-3, 1e-3, 1e-3, 1e-4, 1e-3, 0.02, 6e-3, 0.026, 5e-3, 0.016, 5e-3, 2e-3, 0.163, 0.104, 3e-3, 2e-3, 2e-3, 0.041, 2e-3, 0.022, 0.034, 1e-4, 1e-4, 0.015, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3e-3, 1e-3, 0.029, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 0.372, 43.367, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 1e-4, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "yo": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 3.162, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 13.013, 2e-3, 0.102, 1e-4, 1e-3, 4e-3, 1e-3, 0.025, 0.251, 0.249, 1e-4, 1e-3, 0.499, 0.259, 1.047, 0.013, 0.386, 0.744, 0.471, 0.336, 0.305, 0.301, 0.323, 0.299, 0.314, 0.417, 0.09, 0.08, 8e-3, 9e-3, 8e-3, 6e-3, 1e-4, 0.462, 0.171, 0.128, 0.102, 0.134, 0.101, 0.156, 0.11, 0.251, 0.116, 0.194, 0.108, 0.188, 0.187, 0.263, 0.133, 7e-3, 0.102, 0.27, 0.148, 0.037, 0.042, 0.07, 6e-3, 0.044, 0.016, 7e-3, 1e-4, 8e-3, 1e-4, 1e-3, 1e-3, 4.068, 1.959, 0.507, 1.515, 3.958, 0.547, 1.326, 0.747, 4.508, 1.331, 1.562, 2.445, 1.011, 4.469, 3.265, 1.008, 0.02, 3.063, 1.958, 2.732, 1.408, 0.219, 0.852, 0.039, 0.732, 0.092, 1e-4, 0.013, 1e-4, 1e-4, 1e-4, 0.678, 1.441, 2e-3, 2e-3, 0.064, 2e-3, 1e-3, 2e-3, 0.025, 3e-3, 1e-3, 1e-3, 0.172, 1.046, 1e-4, 1e-4, 1e-3, 1e-3, 0.032, 0.052, 2e-3, 1e-4, 1e-4, 1e-4, 0.018, 0.066, 2e-3, 1e-3, 7e-3, 6e-3, 1e-4, 1e-3, 1.085, 1.316, 0.01, 0.17, 4e-3, 1e-3, 1e-3, 3e-3, 0.307, 0.812, 1e-3, 3e-3, 1.559, 1.199, 1e-3, 2e-3, 3e-3, 4e-3, 0.287, 0.374, 3e-3, 2e-3, 6e-3, 1e-3, 0.038, 1.787, 1.887, 1.09, 5e-3, 3e-3, 3e-3, 1e-3, 1e-4, 1e-4, 0.021, 7.862, 9e-3, 0.075, 1e-4, 8e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1.898, 1e-4, 5e-3, 2e-3, 0.012, 4e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 5e-3, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 4e-3, 2.718, 0.12, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "za": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.779, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 9.452, 3e-3, 0.07, 1e-4, 1e-3, 0.016, 2e-3, 0.054, 0.186, 0.179, 1e-3, 1e-4, 0.82, 0.089, 0.74, 0.012, 0.236, 0.344, 0.171, 0.097, 0.104, 0.109, 0.078, 0.094, 0.113, 0.172, 0.091, 0.029, 1e-3, 1e-3, 2e-3, 3e-3, 1e-4, 0.117, 0.253, 0.245, 0.236, 0.047, 0.096, 0.232, 0.128, 0.101, 0.031, 0.049, 0.109, 0.142, 0.114, 0.031, 0.114, 5e-3, 0.051, 0.316, 0.07, 0.028, 0.136, 0.041, 0.012, 0.157, 0.02, 3e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 4.452, 1.127, 1.557, 2.16, 5.66, 0.54, 3.525, 2.807, 4.357, 1.245, 0.519, 1.215, 1.057, 5.149, 2.46, 0.332, 0.75, 1.554, 1.842, 1.639, 2.859, 0.55, 1.169, 0.375, 1.034, 2.115, 2e-3, 1e-4, 2e-3, 1e-3, 1e-4, 1.059, 0.53, 0.446, 0.215, 0.472, 0.297, 0.257, 0.268, 0.372, 0.375, 0.213, 0.338, 0.751, 0.361, 0.284, 0.332, 0.27, 0.144, 0.117, 0.272, 0.266, 0.278, 0.305, 0.293, 0.26, 0.335, 0.49, 0.247, 0.537, 0.19, 0.142, 0.27, 0.209, 0.19, 0.122, 0.13, 0.301, 0.259, 0.231, 0.235, 0.283, 0.134, 0.154, 0.156, 0.162, 0.375, 0.302, 0.377, 0.293, 0.227, 0.124, 0.201, 0.231, 0.092, 0.229, 0.184, 0.748, 0.296, 0.646, 0.455, 0.756, 0.262, 0.268, 0.277, 1e-4, 1e-4, 0.072, 0.167, 0.018, 0.011, 1e-4, 2e-3, 1e-4, 2e-3, 1e-3, 1e-3, 1e-3, 1e-4, 6e-3, 2e-3, 0.014, 4e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.012, 0.01, 2e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 0.022, 8e-3, 0.114, 0.555, 1.309, 2.559, 1.698, 1.364, 0.916, 0.712, 1e-3, 1e-3, 1e-3, 1e-4, 1e-4, 0.518, 1e-3, 1e-4, 1e-4, 3e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "zea": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.532, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 15.056, 8e-3, 0.162, 1e-4, 1e-4, 7e-3, 1e-3, 1.415, 0.162, 0.162, 1e-4, 1e-4, 1, 0.532, 1.127, 4e-3, 0.395, 0.563, 0.389, 0.394, 0.405, 0.319, 0.329, 0.24, 0.265, 0.382, 0.062, 0.076, 2e-3, 3e-3, 1e-3, 8e-3, 1e-4, 0.28, 0.228, 0.122, 0.346, 0.208, 0.185, 0.11, 0.117, 0.317, 0.071, 0.084, 0.154, 0.152, 0.245, 0.188, 0.145, 4e-3, 0.099, 0.307, 0.104, 0.026, 0.15, 0.089, 2e-3, 5e-3, 0.114, 3e-3, 1e-4, 3e-3, 1e-4, 1e-4, 1e-3, 4.665, 0.916, 0.779, 3.731, 13.123, 0.39, 1.695, 1.202, 4.867, 0.455, 1.861, 2.604, 1.621, 7.033, 3.935, 1.063, 0.011, 4.601, 3.105, 3.908, 1.82, 1.832, 0.958, 0.04, 0.135, 0.573, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 0.482, 5e-3, 3e-3, 2e-3, 3e-3, 2e-3, 1e-3, 1e-3, 2e-3, 5e-3, 2e-3, 1e-3, 1e-3, 2e-3, 1e-4, 1e-3, 1e-3, 1e-3, 1e-3, 5e-3, 3e-3, 1e-3, 1e-4, 1e-3, 0.021, 0.432, 1e-3, 1e-3, 0.01, 9e-3, 3e-3, 5e-3, 9e-3, 8e-3, 0.021, 1e-3, 2e-3, 1e-3, 3e-3, 5e-3, 0.09, 0.052, 0.453, 0.056, 9e-3, 6e-3, 3e-3, 6e-3, 0.115, 2e-3, 0.14, 0.027, 0.252, 1e-3, 0.064, 1e-4, 2e-3, 2e-3, 2e-3, 6e-3, 4e-3, 2e-3, 2e-3, 1e-3, 1e-4, 1e-4, 0.239, 1.084, 9e-3, 0.01, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 5e-3, 2e-3, 8e-3, 3e-3, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 2e-3, 7e-3, 5e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 3e-3, 0.481, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4],
  "zu": [1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1.261, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 10.94, 4e-3, 0.267, 1e-3, 2e-3, 0.016, 3e-3, 0.041, 0.181, 0.181, 1e-3, 1e-3, 0.907, 0.49, 0.797, 0.099, 0.343, 0.379, 0.279, 0.134, 0.118, 0.116, 0.102, 0.097, 0.11, 0.223, 0.065, 0.035, 0.134, 3e-3, 0.135, 5e-3, 1e-4, 0.296, 0.147, 0.142, 0.093, 0.11, 0.08, 0.077, 0.065, 0.3, 0.114, 0.141, 0.151, 0.361, 0.387, 0.067, 0.128, 0.012, 0.082, 0.239, 0.152, 0.188, 0.039, 0.182, 0.012, 0.045, 0.07, 0.138, 1e-4, 0.139, 1e-4, 1e-3, 1e-4, 10.325, 2.215, 0.829, 1.627, 7.521, 0.687, 2.042, 3.525, 7.719, 0.199, 3.874, 4.421, 2.406, 6.494, 4.881, 0.951, 0.342, 1.361, 3.011, 2.552, 4.691, 0.394, 2.227, 0.134, 1.688, 1.779, 1e-4, 2e-3, 1e-4, 1e-4, 1e-4, 0.08, 7e-3, 1e-3, 1e-3, 2e-3, 1e-4, 0.014, 2e-3, 2e-3, 1e-3, 1e-4, 1e-3, 3e-3, 5e-3, 1e-3, 2e-3, 2e-3, 0.014, 1e-3, 0.01, 3e-3, 1e-4, 1e-3, 1e-3, 2e-3, 0.06, 1e-4, 1e-3, 3e-3, 3e-3, 1e-3, 1e-4, 0.084, 4e-3, 1e-4, 1e-3, 1e-3, 1e-4, 2e-3, 4e-3, 2e-3, 5e-3, 3e-3, 1e-3, 1e-3, 2e-3, 1e-3, 1e-4, 4e-3, 3e-3, 3e-3, 5e-3, 2e-3, 2e-3, 1e-3, 6e-3, 5e-3, 2e-3, 3e-3, 5e-3, 2e-3, 3e-3, 3e-3, 1e-4, 1e-4, 1e-4, 0.089, 0.024, 4e-3, 7e-3, 1e-4, 1e-4, 1e-4, 2e-3, 1e-3, 1e-3, 1e-4, 1e-4, 2e-3, 1e-3, 0.029, 0.011, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 5e-3, 2e-3, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 2e-3, 2e-3, 0.091, 1e-3, 1e-4, 1e-3, 2e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-3, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4, 1e-4]
});
function _buffersEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  const ai = new Uint8Array(a), bi = new Uint8Array(b);
  let i = a.byteLength;
  while (i--) {
    if (ai[i] !== bi[i]) {
      return false;
    }
  }
  return true;
}
var Magic_default = Magic;
export {
  Magic_default as MagicLib
};
/**
 * Stream class for parsing binary protocols.
 *
 * @author n1474335 [n1474335@gmail.com]
 * @author tlwr [toby@toby.codes]
 * @copyright Crown Copyright 2018
 * @license Apache-2.0
 *
 */
/**
 * File signatures and extractor functions
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2018
 * @license Apache-2.0
 *
 */
/**
 * File type functions
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2018
 * @license Apache-2.0
 *
 */
/**
 * Character encoding resources.
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 */
/**
 * Unicode Normalisation Forms
 *
 * @author Matthieu [m@tthieu.xyz]
 * @copyright Crown Copyright 2019
 * @license Apache-2.0
 */
/**
 * A class for detecting encodings, file types and byte frequencies and
 * speculatively executing recipes.
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2018
 * @license Apache-2.0
 */
