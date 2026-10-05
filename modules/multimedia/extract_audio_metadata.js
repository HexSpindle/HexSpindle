import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { sniffContainer, parseRiffWave, parseFlac, parseOgg } from './_audio_meta.js';
import { readId3v2, readId3v1 } from './extract_id3.js';

const RIFF_INFO_COMMON = { INAM: 'title', IART: 'artist', IPRD: 'album', ICRD: 'date', IGNR: 'genre', ICMT: 'comment', ITRK: 'track' };

function commonFromId3Frames(frames) {
  const map = { Title: 'title', Artist: 'artist', Album: 'album', Year: 'year', Date: 'date', Track: 'track', Genre: 'genre', Comment: 'comment' };
  const out = {};
  for (const [name, value] of frames) if (map[name] && value) out[map[name]] = value;
  return out;
}

function commonFromVorbisComments(comments) {
  const out = {};
  for (const { key, value } of comments) {
    switch (key.toUpperCase()) {
      case 'TITLE': out.title = value; break;
      case 'ARTIST': out.artist = value; break;
      case 'ALBUM': out.album = value; break;
      case 'DATE': out.date = value; break;
      case 'TRACKNUMBER': out.track = value; break;
      case 'GENRE': out.genre = value; break;
      case 'COMMENT': out.comment = value; break;
    }
  }
  return out;
}

module('Extract Audio Metadata',
  "Extracts common metadata tags from an audio file and outputs a normalised JSON report. Supports " +
  "MP3 (ID3v1/ID3v2 - delegates to the same parser as this project's 'Extract ID3'), WAV/BWF (RIFF " +
  'INFO list, bext broadcast-wave extension, iXML/axml text chunks), FLAC (Vorbis comments, picture ' +
  'block count) and OGG/Opus (Vorbis comments, found via a best-effort byte scan rather than full Ogg ' +
  "page demuxing - see the OGG parsing note in the JSON output).",
  [A.string('Filename (optional)', ''), A.number('Max embedded text bytes (iXML/axml)', 1024 * 512, 1024)],
  (data, filename, maxTextBytes) => {
    if (!data.length) throw new Error('No input data. Load an audio file.');
    maxTextBytes = Math.max(1024, maxTextBytes);

    const container = sniffContainer(data);
    const report = {
      artifact: { filename: filename || null, byte_length: data.length, container },
      tags: { common: {}, raw: {} },
      errors: [],
    };

    try {
      if (container.type === 'mp3') {
        const v2 = readId3v2(data), v1 = readId3v1(data);
        if (!v2 && !v1) report.errors.push({ stage: 'parse', message: 'No ID3v1 or ID3v2 tag found.' });
        if (v2) { report.tags.raw.id3v2 = v2; Object.assign(report.tags.common, commonFromId3Frames(v2.frames)); }
        if (v1) { report.tags.raw.id3v1 = v1; Object.assign(report.tags.common, commonFromId3Frames(v1)); }
      } else if (container.type === 'wav') {
        const riff = parseRiffWave(data, maxTextBytes);
        report.tags.raw.riff = riff;
        if (riff.info) {
          const common = {};
          for (const [k, v] of Object.entries(riff.info)) if (RIFF_INFO_COMMON[k] && v) common[RIFF_INFO_COMMON[k]] = v;
          Object.assign(report.tags.common, common);
        }
        if (!riff.info && !riff.bext && !riff.ixml && !riff.axml) {
          report.errors.push({ stage: 'parse', message: 'No INFO/bext/iXML/axml metadata chunk found.' });
        }
      } else if (container.type === 'flac') {
        const flac = parseFlac(data, maxTextBytes);
        report.tags.raw.flac = flac;
        if (flac.vorbisComments) Object.assign(report.tags.common, commonFromVorbisComments(flac.vorbisComments.comments));
        else report.errors.push({ stage: 'parse', message: 'No VORBIS_COMMENT metadata block found.' });
      } else if (container.type === 'ogg') {
        const vorbis = parseOgg(data);
        if (vorbis) {
          report.tags.raw.vorbis_comments = vorbis;
          Object.assign(report.tags.common, commonFromVorbisComments(vorbis.comments));
        } else {
          report.errors.push({
            stage: 'parse',
            message: 'No Vorbis/Opus comment packet found by best-effort byte scan (not a full Ogg page demuxer - ' +
              'a comment packet split across page boundaries will be missed).',
          });
        }
      } else {
        report.errors.push({
          stage: 'sniff',
          message: 'Unsupported or unrecognised container. Supported: MP3, WAV/BWF, FLAC, OGG/Opus. ' +
            "AAC, AC3, WMA, MP4/M4A and AIFF",
        });
      }
    } catch (e) {
      report.errors.push({ stage: 'parse', message: String((e && e.message) || e) });
    }

    return JSON.stringify(report, null, 2);
  });
