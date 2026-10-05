export function ascii4(b, off) {
  if (off + 4 > b.length) return "";
  return String.fromCharCode(b[off], b[off + 1], b[off + 2], b[off + 3]);
}

export function indexOfAscii(b, s, start, end) {
  const limit = Math.max(0, Math.min(end, b.length) - s.length);
  for (let i = start; i <= limit; i++) {
    let ok = true;
    for (let j = 0; j < s.length; j++) {
      if (b[i + j] !== s.charCodeAt(j)) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

export function u32be(bytes, off) {
  return ((bytes[off] << 24) >>> 0) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3];
}

export function u32le(bytes, off) {
  return (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0;
}

export function u16le(bytes, off) {
  return bytes[off] | (bytes[off + 1] << 8);
}

export function u64le(bytes, off) {
  return BigInt(u32le(bytes, off)) | (BigInt(u32le(bytes, off + 4)) << 32n);
}

export function synchsafeToInt(b0, b1, b2, b3) {
  return ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f);
}

export function decodeUtf16LE(b, off, len) {
  if (len <= 0 || off + len > b.length) return "";
  try {
    return new TextDecoder("utf-16le").decode(b.slice(off, off + len)).replace(/\u0000/g, "").trim();
  } catch {
    return "";
  }
}

export function readNullTerminated(bytes, start, encoding) {
  const isUtf16 = encoding === 1 || encoding === 2;
  if (!isUtf16) {
    let i = start;
    while (i < bytes.length && bytes[i] !== 0x00) i++;
    return { valueBytes: bytes.slice(start, i), next: i + 1 };
  }
  let i = start;
  while (i + 1 < bytes.length && !(bytes[i] === 0x00 && bytes[i + 1] === 0x00)) i += 2;
  return { valueBytes: bytes.slice(start, i), next: i + 2 };
}

const ID3_ENCODINGS = ["iso-8859-1", "utf-16", "utf-16be", "utf-8"];

export function decodeText(bytes, encoding) {
  if (!bytes || bytes.length === 0) return "";
  try {
    return new TextDecoder(ID3_ENCODINGS[encoding] || "utf-16").decode(bytes);
  } catch {
    return safeUtf8(bytes);
  }
}

export function safeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

export function decodeLatin1Trim(bytes) {
  return decodeText(bytes, 0).replace(/\u0000/g, "").trim();
}

export function makeEmptyReport(filename, byteLength, container) {
  return {
    schema_version: "audio-meta-1.0",
    artifact: {
      filename,
      byte_length: byteLength,
      container: { type: container.type, brand: container.brand || null, mime: container.mime || null },
    },
    detections: { metadata_systems: [], provenance_systems: [] },
    tags: {
      common: {
        title: null, artist: null, album: null, date: null, track: null,
        genre: null, comment: null, composer: null, copyright: null, language: null,
      },
      raw: {},
    },
    embedded: [],
    provenance: {
      c2pa: {
        present: false,
        embedding: [],
        manifest_store: { active_manifest_urn: null, instance_id: null, claim_generator: null },
        assertions: [],
        signature: {
          algorithm: null, signing_time: null,
          certificate: { subject_cn: null, issuer_cn: null, serial_number: null },
        },
        validation: { validation_state: "Unknown", reasons: [], details_raw: null },
      },
    },
    errors: [],
  };
}

export function sniffContainer(b) {
  if (b.length >= 3 && b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33)
    return { type: "mp3", mime: "audio/mpeg" };
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) {
    if ((b[1] & 0x06) === 0x00) return { type: "aac", mime: "audio/aac" };
    return { type: "mp3", mime: "audio/mpeg" };
  }
  if (b.length >= 8 && b[0] === 0x0b && b[1] === 0x77)
    return { type: "ac3", mime: "audio/ac3" };
  if (b.length >= 16 &&
    b[0] === 0x30 && b[1] === 0x26 && b[2] === 0xb2 && b[3] === 0x75 &&
    b[4] === 0x8e && b[5] === 0x66 && b[6] === 0xcf && b[7] === 0x11)
    return { type: "wma", mime: "audio/x-ms-wma" };
  if (b.length >= 12 && ascii4(b, 0) === "RIFF" && ascii4(b, 8) === "WAVE")
    return { type: "wav", mime: "audio/wav" };
  if (b.length >= 12 && ascii4(b, 0) === "BW64" && ascii4(b, 8) === "WAVE")
    return { type: "bw64", mime: "audio/wav" };
  if (b.length >= 4 && ascii4(b, 0) === "fLaC")
    return { type: "flac", mime: "audio/flac" };
  if (b.length >= 4 && ascii4(b, 0) === "OggS") {
    const idx = indexOfAscii(b, "OpusHead", 0, Math.min(b.length, 65536));
    return idx >= 0 ? { type: "opus", mime: "audio/ogg" } : { type: "ogg", mime: "audio/ogg" };
  }
  if (b.length >= 12 && ascii4(b, 4) === "ftyp") {
    const brand = ascii4(b, 8);
    const isM4A = brand === "M4A " || brand === "M4B " || brand === "M4P ";
    return { type: isM4A ? "m4a" : "mp4", mime: isM4A ? "audio/mp4" : "video/mp4", brand };
  }
  if (b.length >= 12 && ascii4(b, 0) === "FORM") {
    const formType = ascii4(b, 8);
    if (formType === "AIFF" || formType === "AIFC") return { type: "aiff", mime: "audio/aiff", brand: formType };
  }
  return { type: "unknown", mime: null };
}

export function parseMp3(b, report) {
  processId3v2(b, report);
  processId3v1(b, report);

  const ape = parseApeV2BestEffort(b);
  if (ape) {
    report.detections.metadata_systems.push("apev2");
    report.tags.raw.apev2 = ape;
  }
}

function processId3v2(b, report) {
  report.detections.metadata_systems.push("id3v2");

  const id3 = parseId3v2(b);
  report.tags.raw.id3v2 = id3 ? { header: id3.header, frames: [] } : null;

  if (id3) {
    for (const f of id3.frames) {
      const entry = { id: f.id, size: f.size, description: ID3_FRAME_DESCRIPTIONS[f.id] || null };

      if (f.id[0] === "T" && f.id !== "TXXX") {
        const text = f.data?.length >= 1 ?
          decodeText(f.data.slice(1), f.data[0]).replace(/\u0000/g, "").trim() :
          "";
        entry.decoded = text;
        if (f.id === "TLEN") {
          const ms = normalizeTlen(text);
          if (ms !== null) entry.normalized_ms = ms;
        }
        mapCommonId3(report, f.id, text);
      } else if (f.id === "TXXX") {
        const txxx = decodeTxxx(f.data);
        entry.decoded = txxx;
        if (!report.tags.raw.id3v2.txxx) report.tags.raw.id3v2.txxx = [];
        report.tags.raw.id3v2.txxx.push(txxx);
      } else if (f.id === "COMM") {
        const comm = decodeCommFrame(f.data);
        entry.decoded = comm;
        if (comm?.text && !report.tags.common.comment) report.tags.common.comment = comm.text;
      } else if (f.id === "GEOB") {
        processGeobFrame(f, entry, report);
      }

      report.tags.raw.id3v2.frames.push(entry);
    }
  } else {
    report.detections.metadata_systems = report.detections.metadata_systems.filter((x) => x !== "id3v2");
  }
}

function processGeobFrame(f, entry, report) {
  const d = f.data, enc = d[0];
  let off = 1;
  const mime = readNullTerminated(d, off, 0);
  const mimeType = decodeLatin1Trim(mime.valueBytes);
  off = mime.next;
  const file = readNullTerminated(d, off, enc);
  const filename = decodeText(file.valueBytes, enc).replace(/\u0000/g, "").trim();
  off = file.next;
  const desc = readNullTerminated(d, off, enc);
  const description = decodeText(desc.valueBytes, enc).replace(/\u0000/g, "").trim();
  off = desc.next;
  const objLen = d.length - off;

  entry.geob = { mimeType, filename, description, object_bytes: objLen };
  const geobId = `geob_${report.embedded.filter((x) => x.source === "id3v2:GEOB").length}`;
  report.embedded.push({
    id: geobId, source: "id3v2:GEOB",
    content_type: mimeType || null, byte_length: objLen,
    description: description || null, filename: filename || null,
  });

  const mt = (mimeType || "").toLowerCase();
  if (mt.includes("c2pa") || mt.includes("jumbf") || mt.includes("application/x-c2pa-manifest-store")) {
    report.provenance.c2pa.present = true;
    report.provenance.c2pa.embedding.push({
      carrier: "id3v2:GEOB", content_type: mimeType || null, byte_length: objLen,
    });
  }
}

function processId3v1(b, report) {
  const id3v1 = parseId3v1(b);
  if (!id3v1) return;

  report.detections.metadata_systems.push("id3v1");
  report.tags.raw.id3v1 = id3v1;
  mapCommon(report, id3v1, ID3V1_TO_COMMON);
}

export function parseRiffWave(b, report, maxTextBytes) {
  report.detections.metadata_systems.push("riff_info");

  const chunks = enumerateChunks(b, 12, b.length, 50000);
  const riff = { chunks: [], info: null, bext: null, ixml: null, axml: null, ds64: null };

  const info = {};
  for (const c of chunks) {
    riff.chunks.push({ id: c.id, size: c.size, offset: c.dataOff });
    processRiffChunk(b, c, riff, info, report, maxTextBytes);
  }

  riff.info = Object.keys(info).length ? info : null;
  report.tags.raw.riff = riff;
  if (riff.info) mapCommon(report, riff.info, RIFF_TO_COMMON);
}

function processRiffChunk(b, c, riff, info, report, maxTextBytes) {
  if (c.id === "ds64") {
    riff.ds64 = { present: true, size: c.size };
    if (!report.detections.metadata_systems.includes("bw64_ds64")) report.detections.metadata_systems.push("bw64_ds64");
    if (report.artifact.container.type === "wav") report.artifact.container.type = "bw64";
  }

  if (c.id === "LIST" && ascii4(b, c.dataOff) === "INFO") {
    for (const s of enumerateChunks(b, c.dataOff + 4, c.dataOff + c.size, 10000))
      info[s.id] = decodeLatin1Trim(b.slice(s.dataOff, s.dataOff + s.size));
  }

  if (c.id === "bext") {
    if (!report.detections.metadata_systems.includes("bwf_bext")) report.detections.metadata_systems.push("bwf_bext");
    riff.bext = parseBext(b, c.dataOff, c.size);
  }

  if (c.id === "iXML" || c.id === "axml") {
    const key = c.id === "iXML" ? "ixml" : "axml";
    if (!report.detections.metadata_systems.includes(key)) report.detections.metadata_systems.push(key);
    const payload = b.slice(c.dataOff, c.dataOff + c.size);
    riff[key] = { xml: safeUtf8(payload.slice(0, Math.min(payload.length, maxTextBytes))), truncated: payload.length > maxTextBytes };
    report.embedded.push({
      id: `${key}_0`, source: `riff:${c.id}`, content_type: "application/xml",
      byte_length: payload.length, description: `${c.id} chunk`, filename: null,
    });
  }
}

export function parseFlac(b, report, maxTextBytes) {
  report.detections.metadata_systems.push("flac_metablocks");

  const blocks = parseFlacMetaBlocks(b);
  report.tags.raw.flac = { blocks: [] };

  for (const blk of blocks) {
    report.tags.raw.flac.blocks.push({ type: blk.typeName, length: blk.length });

    if (blk.typeName === "VORBIS_COMMENT") {
      if (!report.detections.metadata_systems.includes("vorbis_comments")) report.detections.metadata_systems.push("vorbis_comments");
      const vc = parseVorbisComment(blk.data);
      report.tags.raw.vorbis_comments = vc;
      mapVorbisCommon(report, vc);
    } else if (blk.typeName === "PICTURE") {
      const pic = parseFlacPicture(blk.data, maxTextBytes);
      report.embedded.push({
        id: `cover_art_${report.embedded.filter((x) => x.id.startsWith("cover_art_")).length}`,
        source: "flac:PICTURE", content_type: pic.mime || null,
        byte_length: pic.dataLength, description: pic.description || null, filename: null,
      });
    }
  }
}

export function parseOgg(b, report) {
  if (!report.detections.metadata_systems.includes("ogg_opus_tags")) report.detections.metadata_systems.push("ogg_opus_tags");

  const scanEnd = Math.min(b.length, 1024 * 1024);
  let tags = null;
  const opusTagsIdx = indexOfAscii(b, "OpusTags", 0, scanEnd);
  if (opusTagsIdx >= 0) {
    report.artifact.container.type = "opus";
    tags = parseVorbisComment(b.slice(opusTagsIdx + 8, scanEnd));
  } else {
    const vorbisIdx = indexOfAscii(b, "\x03vorbis", 0, scanEnd);
    if (vorbisIdx >= 0) tags = parseVorbisComment(b.slice(vorbisIdx + 7, scanEnd));
  }

  report.tags.raw.ogg = { has_opustags: opusTagsIdx >= 0, has_vorbis_comment: !!tags };

  if (tags) {
    if (!report.detections.metadata_systems.includes("vorbis_comments")) report.detections.metadata_systems.push("vorbis_comments");
    report.tags.raw.vorbis_comments = tags;
    mapVorbisCommon(report, tags);
  }
}

export function parseMp4BestEffort(b, report) {
  report.detections.metadata_systems.push("mp4_atoms");
  const atoms = [];

  let off = 0;
  while (off + 8 <= b.length && atoms.length < 2000) {
    const size = u32be(b, off);
    const type = ascii4(b, off + 4);
    if (size < 8) break;
    atoms.push({ type, size, offset: off });
    off += size;
  }

  report.tags.raw.mp4 = {
    top_level_atoms: atoms.slice(0, 200),
    hints: {
      hasMoov: atoms.some((a) => a.type === "moov"),
      hasUdta: atoms.some((a) => a.type === "udta"),
      hasMeta: atoms.some((a) => a.type === "meta"),
      hasIlst: atoms.some((a) => a.type === "ilst"),
    },
  };
}

export function parseAiffBestEffort(b, report, maxTextBytes) {
  report.detections.metadata_systems.push("aiff_chunks");
  let off = 12;
  const chunks = [];
  while (off + 8 <= b.length && chunks.length < 2000) {
    const id = ascii4(b, off);
    const size = u32be(b, off + 4);
    const dataOff = off + 8;
    chunks.push({ id, size, offset: off });

    if (["NAME", "AUTH", "ANNO", "(c) "].includes(id)) {
      const txt = safeUtf8(b.slice(dataOff, dataOff + Math.min(size, maxTextBytes)));
      if (!report.tags.raw.aiff) report.tags.raw.aiff = { chunks: [] };
      report.tags.raw.aiff.chunks.push({ id, value: txt, truncated: size > maxTextBytes });
    }

    off = dataOff + size + (size % 2);
  }

  if (!report.tags.raw.aiff) report.tags.raw.aiff = {};
  report.tags.raw.aiff.chunk_index = chunks.slice(0, 500);

  const nameChunk = report.tags.raw.aiff?.chunks?.find((ch) => ch.id === "NAME")?.value;
  if (nameChunk) report.tags.common.title = report.tags.common.title || nameChunk;
}

const AAC_SAMPLE_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
const AAC_PROFILES = ["Main", "LC", "SSR", "LTP"];
const AAC_CHANNELS = ["defined in AOT", "mono", "stereo", "3.0", "4.0", "5.0", "5.1", "7.1"];

export function parseAacAdts(b, report) {
  report.detections.metadata_systems.push("adts_header");
  if (b.length < 7) return;

  const id = (b[1] >> 3) & 0x01;
  const profile = (b[2] >> 6) & 0x03;
  const freqIdx = (b[2] >> 2) & 0x0f;
  const chanCfg = ((b[2] & 0x01) << 2) | ((b[3] >> 6) & 0x03);

  report.tags.raw.aac = {
    mpeg_version: id === 1 ? "MPEG-2" : "MPEG-4",
    profile: AAC_PROFILES[profile] || `Profile ${profile}`,
    sample_rate: AAC_SAMPLE_RATES[freqIdx] || null,
    sample_rate_index: freqIdx,
    channel_configuration: chanCfg,
    channel_description: AAC_CHANNELS[chanCfg] || null,
  };
}

const AC3_SAMPLE_RATES = [48000, 44100, 32000];
const AC3_BITRATES = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 448, 512, 576, 640];
const AC3_ACMODES = [
  "2.0 (Ch1+Ch2)", "1.0 (C)", "2.0 (L R)", "3.0 (L C R)",
  "2.1 (L R S)", "3.1 (L C R S)", "2.2 (L R SL SR)", "3.2 (L C R SL SR)",
];

export function parseAc3(b, report) {
  report.detections.metadata_systems.push("ac3_bsi");
  if (b.length < 8) return;

  const fscod = (b[4] >> 6) & 0x03;
  const frmsizecod = b[4] & 0x3f;
  const bsid = (b[5] >> 3) & 0x1f;
  const bsmod = b[5] & 0x07;
  const acmod = (b[6] >> 5) & 0x07;

  report.tags.raw.ac3 = {
    sample_rate: AC3_SAMPLE_RATES[fscod] || null,
    fscod,
    bitrate_kbps: AC3_BITRATES[frmsizecod >> 1] || null,
    frmsizecod, bsid, bsmod, acmod,
    channel_layout: AC3_ACMODES[acmod] || null,
  };
}

export function parseWmaAsf(b, report) {
  report.detections.metadata_systems.push("asf_header");
  if (b.length < 30) return;

  const headerSize = Number(u64le(b, 16));
  const numObjects = u32le(b, 24);
  const headerEnd = Math.min(b.length, headerSize);

  const objects = [];
  let off = 30;

  for (let i = 0; i < numObjects && off + 24 <= headerEnd; i++) {
    const guid4 = [b[off], b[off + 1], b[off + 2], b[off + 3]];
    const objSize = Number(u64le(b, off + 16));
    if (objSize < 24 || off + objSize > headerEnd) break;

    const dataOff = off + 24;
    const dataLen = objSize - 24;

    if (guid4[0] === 0x33 && guid4[1] === 0x26 && guid4[2] === 0xb2 && guid4[3] === 0x75 && dataLen >= 10) {
      const cd = parseAsfContentDescription(b, dataOff);
      if (!report.detections.metadata_systems.includes("asf_content_desc"))
        report.detections.metadata_systems.push("asf_content_desc");
      if (!report.tags.raw.asf) report.tags.raw.asf = {};
      report.tags.raw.asf.content_description = cd;
      mapCommon(report, cd, ASF_CD_TO_COMMON);
    }

    if (guid4[0] === 0x40 && guid4[1] === 0xa4 && guid4[2] === 0xd0 && guid4[3] === 0xd2 && dataLen >= 2) {
      const ext = parseAsfExtContentDescription(b, dataOff, dataOff + dataLen);
      if (!report.detections.metadata_systems.includes("asf_ext_content_desc"))
        report.detections.metadata_systems.push("asf_ext_content_desc");
      if (!report.tags.raw.asf) report.tags.raw.asf = {};
      report.tags.raw.asf.extended_content = ext;

      const c = report.tags.common;
      for (const d of ext) {
        const field = WMA_TO_COMMON[(d.name || "").toUpperCase()];
        if (field && d.value) c[field] = c[field] || d.value;
      }
    }

    objects.push({ guid_prefix: guid4.map(x => x.toString(16).padStart(2, "0")).join(""), size: objSize });
    off += objSize;
  }

  if (!report.tags.raw.asf) report.tags.raw.asf = {};
  report.tags.raw.asf.header_objects = objects;
}

const ID3_FRAME_DESCRIPTIONS = {
  TIT2: "Title/songname/content description", TPE1: "Lead performer(s)/Soloist(s)",
  TRCK: "Track number/Position in set", TALB: "Album/Movie/Show title",
  TDRC: "Recording time", TYER: "Year", TCON: "Content type",
  TPE2: "Band/orchestra/accompaniment", TLEN: "Length (ms)", TCOM: "Composer",
  COMM: "Comments", APIC: "Attached picture", GEOB: "General encapsulated object",
  TXXX: "User defined text information frame", UFID: "Unique file identifier", PRIV: "Private frame",
};

const ID3_TO_COMMON = {
  TIT2: "title", TPE1: "artist", TALB: "album", TDRC: "date", TYER: "date",
  TRCK: "track", TCON: "genre", COMM: "comment", TCOM: "composer", TCOP: "copyright", TLAN: "language",
};
const VORBIS_TO_COMMON = {
  TITLE: "title", ARTIST: "artist", ALBUM: "album", DATE: "date",
  TRACKNUMBER: "track", GENRE: "genre", COMMENT: "comment", COMPOSER: "composer", LANGUAGE: "language",
};
const WMA_TO_COMMON = {
  "WM/ALBUMTITLE": "album", "WM/GENRE": "genre", "WM/YEAR": "date",
  "WM/TRACKNUMBER": "track", "WM/COMPOSER": "composer", "WM/LANGUAGE": "language",
};
const ID3V1_TO_COMMON = { title: "title", artist: "artist", album: "album", year: "date", comment: "comment", genre: "genre", track: "track" };
const RIFF_TO_COMMON = { INAM: "title", IART: "artist", ICMT: "comment", IGNR: "genre", ICRD: "date", ICOP: "copyright" };
const ASF_CD_TO_COMMON = { title: "title", author: "artist", copyright: "copyright", description: "comment" };

function mapCommon(report, source, mapping) {
  const c = report.tags.common;
  for (const [sk, ck] of Object.entries(mapping))
    c[ck] = c[ck] || source[sk] || null;
}

function mapCommonId3(report, frameId, text) {
  const field = ID3_TO_COMMON[frameId];
  if (field) report.tags.common[field] = report.tags.common[field] || text || null;
}

function decodeCommFrame(data) {
  if (!data || data.length < 5) return null;
  const enc = data[0];
  const language = String.fromCharCode(data[1], data[2], data[3]);
  const { valueBytes: descBytes, next } = readNullTerminated(data, 4, enc);
  const short_description = decodeText(descBytes, enc).replace(/\u0000/g, "").trim() || null;
  const text = decodeText(data.slice(next), enc).replace(/\u0000/g, "").trim() || null;
  return { language, short_description, text };
}

function normalizeTlen(s) {
  if (!s) return null;
  if (/^\s*\d+\s*$/.test(s)) return parseInt(s.trim(), 10);
  const f = Number(s);
  if (Number.isFinite(f) && f > 0 && f < 100000) return Math.round(f * 1000);
  return null;
}

function parseId3v2(mp3) {
  if (mp3.length < 10 || mp3[0] !== 0x49 || mp3[1] !== 0x44 || mp3[2] !== 0x33) return null;

  const major = mp3[3], minor = mp3[4], flags = mp3[5];
  const tagSize = synchsafeToInt(mp3[6], mp3[7], mp3[8], mp3[9]);
  let offset = 10;
  const end = 10 + tagSize;

  const frames = [];
  while (offset + 10 <= end) {
    const id = String.fromCharCode(mp3[offset], mp3[offset + 1], mp3[offset + 2], mp3[offset + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size = major === 4 ?
      synchsafeToInt(mp3[offset + 4], mp3[offset + 5], mp3[offset + 6], mp3[offset + 7]) :
      u32be(mp3, offset + 4);
    offset += 10;
    if (size <= 0 || offset + size > mp3.length) break;
    frames.push({ id, size, data: mp3.slice(offset, offset + size) });
    offset += size;
  }

  return { header: { version: `${major}.${minor}`, flags, tag_size: tagSize }, frames };
}

function parseId3v1(b) {
  if (b.length < 128) return null;
  const off = b.length - 128;
  if (b[off] !== 0x54 || b[off + 1] !== 0x41 || b[off + 2] !== 0x47) return null;

  let track = null;
  if (b[off + 125] === 0x00 && b[off + 126] !== 0x00) track = String(b[off + 126]);

  return {
    title: decodeLatin1Trim(b.slice(off + 3, off + 33)),
    artist: decodeLatin1Trim(b.slice(off + 33, off + 63)),
    album: decodeLatin1Trim(b.slice(off + 63, off + 93)),
    year: decodeLatin1Trim(b.slice(off + 93, off + 97)),
    comment: decodeLatin1Trim(b.slice(off + 97, off + 127)),
    track, genre: String(b[off + 127]),
  };
}

function decodeTxxx(data) {
  if (!data || data.length < 2) return null;
  const enc = data[0];
  const { valueBytes: descBytes, next } = readNullTerminated(data, 1, enc);
  const desc = decodeText(descBytes, enc).replace(/\u0000/g, "").trim();
  const val = decodeText(data.slice(next), enc).replace(/\u0000/g, "").trim();
  return { description: desc || null, value: val || null };
}

function parseApeV2BestEffort(b) {
  const scanStart = Math.max(0, b.length - 32768);
  const idx = indexOfAscii(b, "APETAGEX", scanStart, b.length);
  if (idx < 0) return null;
  if (idx + 32 > b.length) return { present: true, warning: "APETAGEX found but footer truncated." };

  const ver = u32le(b, idx + 8), size = u32le(b, idx + 12);
  const count = u32le(b, idx + 16), flags = u32le(b, idx + 20);

  const tagStart = idx + 32 - size;
  if (tagStart < 0 || tagStart >= b.length)
    return { present: true, version: ver, size, count, flags, warning: "APEv2 bounds invalid (non-standard placement)." };

  const items = [];
  let off = tagStart + 32;
  const end = Math.min(b.length, idx);
  while (off + 8 < end && items.length < 5000) {
    const valueSize = u32le(b, off), itemFlags = u32le(b, off + 4);
    off += 8;
    let keyEnd = off;
    while (keyEnd < end && b[keyEnd] !== 0x00) keyEnd++;
    const key = decodeLatin1Trim(b.slice(off, keyEnd));
    off = keyEnd + 1;
    if (!key || off + valueSize > end) break;
    const value = safeUtf8(b.slice(off, off + valueSize)).replace(/\u0000/g, "").trim();
    off += valueSize;
    items.push({ key, value, flags: itemFlags });
  }

  return { present: true, version: ver, size, count, flags, items };
}

function enumerateChunks(b, start, end, maxCount) {
  const chunks = [];
  let off = start;
  while (off + 8 <= end && chunks.length < maxCount) {
    const id = ascii4(b, off);
    const size = u32le(b, off + 4);
    const dataOff = off + 8;
    if (dataOff + size > end) break;
    chunks.push({ id, size, dataOff });
    off = dataOff + size + (size % 2);
  }
  return chunks;
}

function parseBext(b, off, size) {
  const slice = b.slice(off, off + size);
  const timeRefLow = u32le(slice, 338), timeRefHigh = u32le(slice, 342);
  return {
    description: decodeLatin1Trim(slice.slice(0, 256)) || null,
    originator: decodeLatin1Trim(slice.slice(256, 288)) || null,
    originator_reference: decodeLatin1Trim(slice.slice(288, 320)) || null,
    origination_date: decodeLatin1Trim(slice.slice(320, 330)) || null,
    origination_time: decodeLatin1Trim(slice.slice(330, 338)) || null,
    time_reference_samples: ((BigInt(timeRefHigh) << 32n) | BigInt(timeRefLow)).toString(),
  };
}

const FLAC_TYPE_NAMES = { 0: "STREAMINFO", 1: "PADDING", 2: "APPLICATION", 3: "SEEKTABLE", 4: "VORBIS_COMMENT", 5: "CUESHEET", 6: "PICTURE" };

function parseFlacMetaBlocks(b) {
  const blocks = [];
  let off = 4;
  while (off + 4 <= b.length && blocks.length < 10000) {
    const header = b[off];
    const isLast = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const len = (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3];
    off += 4;
    if (off + len > b.length) break;
    blocks.push({ type, typeName: FLAC_TYPE_NAMES[type] || `TYPE_${type}`, length: len, data: b.slice(off, off + len) });
    off += len;
    if (isLast) break;
  }
  return blocks;
}

function parseVorbisComment(buf) {
  let off = 0;
  const vendorLen = u32le(buf, off); off += 4;
  if (off + vendorLen > buf.length) return { vendor: null, comments: [], warning: "vendor_len out of bounds" };
  const vendor = safeUtf8(buf.slice(off, off + vendorLen)); off += vendorLen;
  const count = u32le(buf, off); off += 4;

  const comments = [];
  for (let i = 0; i < count && off + 4 <= buf.length && comments.length < 20000; i++) {
    const l = u32le(buf, off); off += 4;
    if (off + l > buf.length) break;
    const s = safeUtf8(buf.slice(off, off + l)); off += l;
    const eq = s.indexOf("=");
    if (eq > 0) comments.push({ key: s.slice(0, eq).toUpperCase(), value: s.slice(eq + 1) });
  }
  return { vendor, comments };
}

function mapVorbisCommon(report, vc) {
  const c = report.tags.common;
  for (const [vk, ck] of Object.entries(VORBIS_TO_COMMON))
    c[ck] = c[ck] || vc.comments?.find((x) => x.key === vk)?.value || null;
}

function parseFlacPicture(data, maxTextBytes) {
  let off = 4;
  const mimeLen = u32be(data, off); off += 4;
  const mime = safeUtf8(data.slice(off, off + Math.min(mimeLen, maxTextBytes))); off += mimeLen;
  const descLen = u32be(data, off); off += 4;
  const description = safeUtf8(data.slice(off, off + Math.min(descLen, maxTextBytes))); off += descLen + 16;
  return { mime, description, dataLength: u32be(data, off) };
}

function parseAsfContentDescription(b, off) {
  const titleLen = u16le(b, off), authorLen = u16le(b, off + 2);
  const copyrightLen = u16le(b, off + 4), descLen = u16le(b, off + 6), ratingLen = u16le(b, off + 8);
  let pos = off + 10;
  const title = decodeUtf16LE(b, pos, titleLen); pos += titleLen;
  const author = decodeUtf16LE(b, pos, authorLen); pos += authorLen;
  const copyright = decodeUtf16LE(b, pos, copyrightLen); pos += copyrightLen;
  const description = decodeUtf16LE(b, pos, descLen); pos += descLen;
  const rating = decodeUtf16LE(b, pos, ratingLen);
  return { title, author, copyright, description, rating };
}

function parseAsfExtContentDescription(b, off, end) {
  const count = u16le(b, off);
  let pos = off + 2;
  const descriptors = [];
  for (let i = 0; i < count && pos + 6 <= end && descriptors.length < 5000; i++) {
    const nameLen = u16le(b, pos); pos += 2;
    if (pos + nameLen > end) break;
    const name = decodeUtf16LE(b, pos, nameLen); pos += nameLen;
    const valueType = u16le(b, pos); pos += 2;
    const valueLen = u16le(b, pos); pos += 2;
    if (pos + valueLen > end) break;
    let value;
    if (valueType === 0) value = decodeUtf16LE(b, pos, valueLen);
    else if (valueType === 3) value = u32le(b, pos);
    else if (valueType === 5) value = u16le(b, pos);
    else if (valueType === 2) value = u32le(b, pos) !== 0;
    else value = `(${valueLen} bytes, type ${valueType})`;
    pos += valueLen;
    descriptors.push({ name, value_type: valueType, value });
  }
  return descriptors;
}
