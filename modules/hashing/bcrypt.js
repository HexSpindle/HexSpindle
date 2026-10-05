import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const BF_INIT_HEX = (
  'd1310ba698dfb5ac2ffd72dbd01adfb7b8e1afed6a267e96ba7c9045f12c7f9924a19947b3916cf70801f2e2858efc16636920d8' +
  '71574e69a458fea3f4933d7e0d95748f728eb658718bcd5882154aee7b54a41dc25a59b59c30d5392af26013c5d1b023286085f0' +
  'ca417918b8db38ef8e79dcb0603a180e6c9e0e8bb01e8a3ed71577c1bd314b2778af2fda55605c60e65525f3aa55ab9457489862' +
  '63e8144055ca396a2aab10b6b4cc5c341141e8cea15486af7c72e993b3ee1411636fbc2a2ba9c55d741831f6ce5c3e169b87931e' +
  'afd6ba336c24cf5c7a325381289586773b8f48986b4bb9afc4bfe81b6628219361d809ccfb21a991487cac605dec8032ef845d5d' +
  'e98575b1dc262302eb651b8823893e81d396acc50f6d6ff383f442392e0b4482a484200469c8f04a9e1f9b5e21c66842f6e96c9a' +
  '670c9c61abd388f06a51a0d2d8542f68960fa728ab5133a36eef0b6c137a3be4ba3bf0507efb2a98a1f1651d39af017666ca593e' +
  '82430e888cee8619456f9fb47d84a5c33b8b5ebee06f75d885c12073401a449f56c16aa64ed3aa62363f77061bfedf72429b023d' +
  '37d0d724d00a1248db0fead349f1c09b075372c980991b7b25d479d8f6e8def7e3fe501ab6794c3b976ce0bd04c006bac1a94fb6' +
  '409f60c45e5c9ec2196a246368fb6faf3e6c53b51339b2eb3b52ec6f6dfc511f9b30952ccc814544af5ebd09bee3d004de334afd' +
  '660f2807192e4bb3c0cba85745c8740fd20b5f39b9d3fbdb5579c0bd1a60320ad6a100c6402c7279679f25fefb1fa3cc8ea5e9f8' +
  'db3222f83c7516dffd616b152f501ec8ad0552ab323db5fafd23876053317b483e00df829e5c57bbca6f8ca01a87562edf1769db' +
  'd542a8f6287effc3ac6732c68c4f5573695b27b0bbca58c8e1ffa35db8f011a010fa3d98fd2183b84afcb56c2dd1d35b9a53e479' +
  'b6f84565d28e49bc4bfb9790e1ddf2daa4cb7e3362fb1341cee4c6e8ef20cada36774c01d07e9efe2bf11fb495dbda4dae909198' +
  'eaad8e716b93d5a0d08ed1d0afc725e08e3c5b2f8e7594b78ff6e2fbf2122b648888b812900df01c4fad5ea0688fc31cd1cff191' +
  'b3a8c1ad2f2f2218be0e1777ea752dfe8b021fa1e5a0cc0fb56f74e818acf3d6ce89e299b4a84fe0fd13e0b77cc43b81d2ada8d9' +
  '165fa2668095770593cc7314211a1477e6ad206577b5fa86c75442f5fb9d35cfebcdaf0c7b3e89a0d6411bd3ae1e7e4900250e2d' +
  '2071b35e226800bb57b8e0af2464369bf009b91e5563911d59dfa6aa78c14389d95a537f207d5ba202e5b9c5832603766295cfa9' +
  '11c819684e734a41b3472dca7b14a94a1b5100529a532915d60f573fbc9bc6e42b60a47681e6740008ba6fb5571be91ff296ec6b' +
  '2a0dd915b6636521e7b9f9b6ff34052ec585566453b02d5da99f8fa108ba47996e85076a4b7a70e9b5b32944db75092ec4192623' +
  'ad6ea6b049a7df7d9cee60b88fedb266ecaa8c71699a17ff5664526cc2b19ee1193602a575094c29a0591340e4183a3e3f54989a' +
  '5b429d656b8fe4d699f73fd6a1d29c07efe830f54d2d38e6f0255dc14cdd20868470eb266382e9c6021ecc5e09686b3f3ebaefc9' +
  '3c9718146b6a70a1687f358452a0e286b79c5305aa5007373e07841c7fdeae5c8e7d44ec5716f2b8b03ada37f0500c0df01c1f04' +
  '0200b3ffae0cf51a3cb574b225837a58dc0921bdd19113f97ca92ff69432477322f547013ae5e58137c2dadcc8b576349af3dda7' +
  'a94461460fd0030eecc8c73ea4751e41e238cd993bea0e2f3280bba1183eb3314e548b384f6db9086f420d03f60a04bf2cb81290' +
  '24977c795679b072bcaf89afde9a771fd9930810b38bae12dccf3f2e5512721f2e6b7124501adde69f84cd877a5847187408da17' +
  'bc9f9abce94b7d8cec7aec3adb851dfa63094366c464c3d2ef1c18473215d908dd433b3724c2ba1612a14d432a65c45150940002' +
  '133ae4dd71dff89e10314e5581ac77d65f11199b043556f1d7a3c76b3c11183b5924a509f28fe6ed97f1fbfa9ebabf2c1e153c6e' +
  '86e34570eae96fb1860e5e0a5a3e2ab3771fe71c4e3d06fa2965dcb999e71d0f803e89d65266c8252e4cc9789c10b36ac6150eba' +
  '94e2ea78a5fc3c531e0a2df4f2f74ea7361d2b3d1939260f19c279605223a708f71312b6ebadfe6eeac31f66e3bc4595a67bc883' +
  'b17f37d1018cff28c332ddefbe6c5aa56558218568ab9802eecea50fdb2f953b2aef7dad5b6e2f841521b62829076170ecdd4775' +
  '619f151013cca830eb61bd960334fe1eaa0363cfb5735c904c70a239d59e9e0bcbaade14eecc86bc60622ca79cab5cabb2f3846e' +
  '648b1eaf19bdf0caa02369b9655abb5040685a323c2ab4b3319ee9d5c021b8f79b540b19875fa09995f7997e623d7da8f837889a' +
  '97e32d7711ed935f166812810e358829c7e61fd696dedfa17858ba9957f584a51b2272639b83c3ff1ac24696cdb30aeb532e3054' +
  '8fd948e46dbc312858ebf2ef34c6ffeafe28ed61ee7c3c735d4a14d9e864b7e342105d14203e13e045eee2b6a3aaabeadb6c4f15' +
  'facb4fd0c742f442ef6abbb5654f3b1d41cd2105d81e799e86854dc7e44b476a3d816250cf62a1f25b8d2646fc8883a0c1c7b6a3' +
  '7f1524c369cb749247848a0b5692b285095bbf00ad19489d1462b17423820e0058428d2a0c55f5ea1dadf43e233f70613372f092' +
  '8d937e41d65fecf16c223bdb7cde3759cbee74604085f2a7ce77326ea607808419f8509ee8efd85561d99735a969a7aac50c06c2' +
  '5a04abfc800bcadc9e447a2ec3453484fdd567050e1e9ec9db73dbd3105588cd675fda79e3674340c5c43465713e38d83d28f89e' +
  'f16dff20153e21e78fb03d4ae6e39f2bdb83adf7e93d5a68948140f7f64c261c94692934411520f77602d4f7bcf46b2ed4a20068' +
  'd40824713320f46a43b7d4b7500061af1e39f62e9724454614214f74bf8b88404d95fc1d96b591af70f4ddd366a02f45bfbc09ec' +
  '03bd97857fac6dd031cb850496eb27b355fd3941da2547e6abca0a9a28507825530429f40a2c86dae9b66dfb68dc1462d7486900' +
  '680ec0a427a18dee4f3ffea2e887ad8cb58ce0067af4d6b6aace1e7cd3375fecce78a399406b2a4220fe9e35d9f385b9ee39d7ab' +
  '3b124e8b1dc9faf74b6d185626a36631eae397b23a6efa74dd5b43326841e7f7ca7820fbfb0af54ed8feb397454056acba489527' +
  '55533a3a20838d87fe6ba9b7d096954b55a867bca1159a58cca9296399e1db33a62a4a563f3125f95ef47e1c9029317cfdf8e802' +
  '04272f7080bb155c05282ce395c11548e4c66d2248c1133fc70f86dc07f9c9ee41041f0f404779a45d886e17325f51ebd59bc0d1' +
  'f2bcc18f41113564257b7834602a9c60dff8e8a31f636c1b0e12b4c202e1329eaf664fd1cad181156b2395e0333e92e13b240b62' +
  'eebeb92285b2a20ee6ba0d99de720c8c2da2f728d012784595b794fd647d0862e7ccf5f05449a36f877d48fac39dfd27f33e8d1e' +
  '0a476341992eff743a6f6eabf4f8fd37a812dc60a1ebddf8991be14cdb6e6b0dc67b55106d672c372765d43bdcd0e804f1290dc7' +
  'cc00ffa3b5390f92690fed0b667b9ffbcedb7d9ca091cf0bd9155ea3bb132f88515bad247b9479bf763bd6eb37392eb3cc115979' +
  '8026e297f42e312d6842ada7c66a2b3b12754ccc782ef11c6a124237b79251e706a1bbe64bfb63501a6b101811caedfa3d25bdd8' +
  'e2e1c3c9444216590a121386d90cec6ed5abea2a64af674eda86a85fbebfe98864e4c3fe9dbc8057f0f7c08660787bf86003604d' +
  'd1fd8346f6381fb07745ae04d736fccc83426b33f01eab71b08041873c005e5f77a057bebde8ae2455464299bf582e614e58f48f' +
  'f2ddfda2f474ef388789bdc25366f9c3c8b38e74b475f25546fcd9b97aeb26618b1ddf84846a0e79915f95e2466e598e20b45770' +
  '8cd55591c902de4cb90bace1bb8205d011a862487574a99eb77f19b6e0a9dc09662d09a1c4324633e85a1f0209f0be8c4a99a025' +
  '1d6efe101ab93d1d0ba5a4dfa186f20f2868f169dcb7da83573906fea1e2ce9b4fcd7f5250115e01a70683faa002b5c40de6d027' +
  '9af88c27773f8641c3604c0661a806b5f0177a28c0f586e0006058aa30dc7d6211e69ed72338ea6353c2dd94c2c21634bbcbee56' +
  '90bcb6deebfc7da1ce591d766f05e4094b7c018839720a3d7c927c2486e3725f724d9db91ac15bb4d39eb8fced54557808fca5b5' +
  'd83d7cd34dad0fc41e50ef5eb161e6f8a28514d96c51133c6fd5c7e756e14ec4362abfceddc6c837d79a323492638212670efa8e' +
  '406000e03a39ce37d3faf5cfabc277375ac52d1b5cb0679e4fa33742d382274099bc9bbed5118e9dbf0f7315d62d1c7ec700c47b' +
  'b78c1b6b21a19045b26eb1be6a366eb45748ab2fbc946e79c6a376d26549c2c8530ff8ee468dde7dd5730a1d4cd04dc62939bbdb' +
  'a9ba4650ac9526e8be5ee304a1fad5f06a2d519a63ef8ce29a86ee22c089c2b843242ef6a51e03aa9cf2d0a483c061ba9be96a4d' +
  '8fe51550ba645bd62826a2f9a73a3ae14ba99586ef5562e9c72fefd3f752f7da3f046f6977fa0a5980e4a91587b086019b09e6ad' +
  '3b3ee593e990fd5a9e34d7972cf0b7d9022b8b5196d5ac3a017da67dd1cf3ed67c7d2d281f9f25cfadf2b89b5ad6b4725a88f54c' +
  'e029ac71e019a5e647b0acfded93fa9be8d3c48d283b57ccf8d5662979132e28785f0191ed756055f7960e44e3d35e8c15056dd4' +
  '88f46dba03a161250564f0bdc3eb9e153c9057a297271aeca93a072a1b3f6d9b1e6321f5f59c66fb26dcf3197533d928b155fdf5' +
  '035634828aba3cbb28517711c20ad9f8abcc5167ccad925f4de817513830dc8e379d58629320f991ea7a90c2fb3e7bce5121ce64' +
  '774fbe32a8b6e37ec3293d4648de53696413e680a2ae0810dd6db22469852dfd09072166b39a460a6445c0dd586cdecf1c20c8ae' +
  '5bbef7dd1b588d40ccd2017f6bb4e3bbdda26a7e3a59ff453e350a44bcb4cdd572eacea8fa6484bb8d6612aebf3c6f47d29be463' +
  '542f5d9eaec2771bf64e6370740e0d8de75b1357f8721671af537d5d4040cb084eb4e2cc34d2466a0115af84e1b0042895983a1d' +
  '06b89fb4ce6ea0486f3f3b823520ab82011a1d4b277227f8611560b1e7933fdcbb3a792b344525bda08839e151ce794b2f32c9b7' +
  'a01fbac9e01cc87ebcc7d1f6cf0111c3a1e8aac71a908749d44fbd9ad0dadecbd50ada380339c32ac69136678df9317ce0b12b4f' +
  'f79e59b743f5bb3af2d519ff27d9459cbf97222c15e6fc2a0f91fc719b941525fae59361ceb69cebc2a8645912baa8d1b6c1075e' +
  'e3056a0c10d25065cb03a442e0ec6e0e1698db3b4c98a0be3278e9649f1f9532e0d392dfd3a0342b8971f21e1b0a74414ba3348c' +
  'c5be7120c37632d8df359f8d9b992f2ee60b6f470fe3f11de54cda541edad891ce6279cfcd3e7e6f1618b166fd2c1d05848fd2c5' +
  'f6fb2299f523f357a632762393a8353156cccd02acf081625a75ebb56e16369788d273ccde96629281b949d04c50901b71c65614' +
  'e6c6c7bd327a140a45e1d006c3f27b9ac9aa53fd62a80f00bb25bfe235bdd2f671126905b2040222b6cbcf7ccd769c2b53113ec0' +
  '1640e3d338abbd602547adf0ba38209cf746ce7677afa1c52075606085cbfe4e8ae88dd87aaaf9b04cf9aa7e1948c25c02fb8a8c' +
  '01c36ae4d6ebe1f990d4f869a65cdea03f09252dc208e69fb74e6132ce77e25b578fdfe33ac372e6243f6a8885a308d313198a2e' +
  '03707344a4093822299f31d0082efa98ec4e6c89452821e638d01377be5466cf34e90c6cc0ac29b7c97c50dd3f84d5b5b5470917' +
  '9216d5d98979fb1b'
);

function parseHexWords(hex) {
  const n = hex.length / 8;
  const out = new Uint32Array(n);
  for (let i = 0; i < n; i++) out[i] = parseInt(hex.substr(i * 8, 8), 16) >>> 0;
  return out;
}
const BF_INIT_WORDS = parseHexWords(BF_INIT_HEX);
if (BF_INIT_WORDS.length !== 4 * 256 + 18) throw new Error('bad blowfish init table length');

function newState() {
  return { S: [BF_INIT_WORDS.slice(0, 256), BF_INIT_WORDS.slice(256, 512), BF_INIT_WORDS.slice(512, 768), BF_INIT_WORDS.slice(768, 1024)], P: BF_INIT_WORDS.slice(1024, 1042) };
}

function encipher(state, xlxr) {
  const S = state.S, P = state.P;
  let Xl = xlxr[0] >>> 0, Xr = xlxr[1] >>> 0;
  const F = (x) => ((((S[0][(x >>> 24) & 0xff] + S[1][(x >>> 16) & 0xff]) >>> 0) ^ S[2][(x >>> 8) & 0xff]) + S[3][x & 0xff]) >>> 0;
  Xl ^= P[0];
  for (let i = 1; i <= 15; i += 2) {
    Xr = (Xr ^ F(Xl) ^ P[i]) >>> 0;
    Xl = (Xl ^ F(Xr) ^ P[i + 1]) >>> 0;
  }
  xlxr[0] = (Xr ^ P[17]) >>> 0;
  xlxr[1] = Xl >>> 0;
}

function makeStream2word(data, databytes) {
  let j = 0;
  return () => {
    let temp = 0;
    for (let i = 0; i < 4; i++) {
      temp = ((temp << 8) | data[j]) >>> 0;
      j = (j + 1) >= databytes ? 0 : j + 1;
    }
    return temp >>> 0;
  };
}

function expand0state(state, key, keybytes) {
  const next = makeStream2word(key, keybytes);
  for (let i = 0; i < 18; i++) state.P[i] = (state.P[i] ^ next()) >>> 0;
  const xlxr = [0, 0];
  for (let i = 0; i < 18; i += 2) {
    encipher(state, xlxr);
    state.P[i] = xlxr[0]; state.P[i + 1] = xlxr[1];
  }
  for (let b = 0; b < 4; b++) {
    for (let k = 0; k < 256; k += 2) {
      encipher(state, xlxr);
      state.S[b][k] = xlxr[0]; state.S[b][k + 1] = xlxr[1];
    }
  }
}

function expandstate(state, salt, saltbytes, key, keybytes) {
  const nextKey = makeStream2word(key, keybytes);
  for (let i = 0; i < 18; i++) state.P[i] = (state.P[i] ^ nextKey()) >>> 0;
  const nextSalt = makeStream2word(salt, saltbytes);
  const xlxr = [0, 0];
  for (let i = 0; i < 18; i += 2) {
    xlxr[0] = (xlxr[0] ^ nextSalt()) >>> 0;
    xlxr[1] = (xlxr[1] ^ nextSalt()) >>> 0;
    encipher(state, xlxr);
    state.P[i] = xlxr[0]; state.P[i + 1] = xlxr[1];
  }
  for (let b = 0; b < 4; b++) {
    for (let k = 0; k < 256; k += 2) {
      xlxr[0] = (xlxr[0] ^ nextSalt()) >>> 0;
      xlxr[1] = (xlxr[1] ^ nextSalt()) >>> 0;
      encipher(state, xlxr);
      state.S[b][k] = xlxr[0]; state.S[b][k + 1] = xlxr[1];
    }
  }
}

const B64 = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const B64_INDEX = (() => { const m = new Int16Array(128).fill(-1); for (let i = 0; i < 64; i++) m[B64.charCodeAt(i)] = i; return m; })();

function bcryptEncode(bytes) {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    let c1 = bytes[i++];
    out += B64[(c1 >> 2) & 0x3f];
    c1 = (c1 & 0x03) << 4;
    if (i >= bytes.length) { out += B64[c1]; break; }
    let c2 = bytes[i++];
    c1 |= (c2 >> 4) & 0x0f;
    out += B64[c1];
    c1 = (c2 & 0x0f) << 2;
    if (i >= bytes.length) { out += B64[c1]; break; }
    const c3 = bytes[i++];
    c1 |= (c3 >> 6) & 0x03;
    out += B64[c1];
    out += B64[c3 & 0x3f];
  }
  return out;
}
function bcryptDecode(str, len) {
  const out = new Uint8Array(len);
  let bp = 0, p = 0;
  const char64 = (ch) => { const code = str.charCodeAt(ch); return code > 127 ? -1 : B64_INDEX[code]; };
  while (bp < len) {
    const c1 = char64(p), c2 = char64(p + 1);
    if (c1 < 0 || c2 < 0) throw new Error('Invalid bcrypt base64 data');
    out[bp++] = ((c1 << 2) | ((c2 & 0x30) >> 4)) & 0xff;
    if (bp >= len) break;
    const c3 = char64(p + 2);
    if (c3 < 0) throw new Error('Invalid bcrypt base64 data');
    out[bp++] = (((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2)) & 0xff;
    if (bp >= len) break;
    const c4 = char64(p + 3);
    if (c4 < 0) throw new Error('Invalid bcrypt base64 data');
    out[bp++] = (((c3 & 0x03) << 6) | c4) & 0xff;
    p += 4;
  }
  return out;
}

const ORPHEAN = new Uint8Array([...'OrpheanBeholderScryDoubt'].map(c => c.charCodeAt(0)));

function bcryptCrypt(keyBytes, saltBytes16, cost) {
  const rounds = 1 << cost;
  const state = newState();
  expandstate(state, saltBytes16, 16, keyBytes, keyBytes.length);
  for (let k = 0; k < rounds; k++) {
    expand0state(state, keyBytes, keyBytes.length);
    expand0state(state, saltBytes16, 16);
  }
  const next = makeStream2word(ORPHEAN, 24);
  const cdata = [next(), next(), next(), next(), next(), next()];
  for (let k = 0; k < 64; k++) {
    for (let b = 0; b < 3; b++) {
      const pair = [cdata[b * 2], cdata[b * 2 + 1]];
      encipher(state, pair);
      cdata[b * 2] = pair[0]; cdata[b * 2 + 1] = pair[1];
    }
  }
  const ciphertext = new Uint8Array(24);
  for (let i = 0; i < 6; i++) {
    let v = cdata[i] >>> 0;
    ciphertext[i * 4 + 3] = v & 0xff; v >>>= 8;
    ciphertext[i * 4 + 2] = v & 0xff; v >>>= 8;
    ciphertext[i * 4 + 1] = v & 0xff; v >>>= 8;
    ciphertext[i * 4 + 0] = v & 0xff;
  }
  return ciphertext;
}

function bcryptHash(passwordBytes, saltBytes16, cost) {
  if (passwordBytes.length > 72) throw new Error('password cannot be longer than 72 bytes, truncate manually if necessary');
  const keyBytes = new Uint8Array(passwordBytes.length + 1); // C-string NUL terminator
  keyBytes.set(passwordBytes);
  const ciphertext = bcryptCrypt(keyBytes, saltBytes16, cost);
  const costStr = String(cost).padStart(2, '0');
  return `$2b$${costStr}$${bcryptEncode(saltBytes16)}${bcryptEncode(ciphertext.subarray(0, 23))}`;
}

function parseBcryptHash(hash) {
  hash = hash.trim();
  const parts = hash.split('$');
  if (parts.length !== 4 || parts[3].length !== 53) throw new Error('Not a bcrypt hash');
  const cost = parseInt(parts[2], 10);
  const saltBytes16 = bcryptDecode(parts[3].slice(0, 22), 16);
  return { version: parts[1], cost, saltBytes16, hashPart: parts[3].slice(22) };
}

function randomSalt16() {
  const out = new Uint8Array(16);
  crypto.getRandomValues(out);
  return out;
}

module('Bcrypt', 'Hashes the input (as a password) with bcrypt.', [A.number('Rounds', 10, 4, 18)],
  (data, rounds) => bcryptHash(data, randomSalt16(), rounds),
  { nondeterministic: true });

export { bcryptHash, bcryptCrypt, bcryptEncode, bcryptDecode, parseBcryptHash };
