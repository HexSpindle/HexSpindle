import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import {
  makeEmptyReport, sniffContainer, parseMp3, parseRiffWave, parseFlac, parseOgg,
  parseMp4BestEffort, parseAiffBestEffort, parseAacAdts, parseAc3, parseWmaAsf,
} from './_audio_meta.js';

module('Extract Audio Metadata',
  'Extracts common audio metadata across MP3 (ID3v2/ID3v1/GEOB/APEv2), WAV/BWF/BW64 (INFO/bext/iXML/axml), ' +
  'FLAC (Vorbis Comment/Picture), OGG (Vorbis/OpusTags), AAC (ADTS), AC3 (Dolby Digital), WMA (ASF), plus ' +
  'best-effort MP4/M4A and AIFF scanning. Outputs a normalised JSON report.',
  [A.string('Filename (optional)', ''), A.number('Max embedded text bytes (iXML/axml)', 1024 * 512, 1024)],
  (data, filename, maxTextBytes) => {
    filename = (filename || '').trim() || null;
    maxTextBytes = Number.isFinite(maxTextBytes) ? Math.max(1024, maxTextBytes) : 1024 * 512;
    if (!data.length) throw new Error('No input data. Load an audio file (drag/drop or use the open file button).');

    const bytes = data;
    const container = sniffContainer(bytes);
    const report = makeEmptyReport(filename, bytes.length, container);
    try {
      const parsers = {
        mp3: () => parseMp3(bytes, report),
        wav: () => parseRiffWave(bytes, report, maxTextBytes),
        bw64: () => parseRiffWave(bytes, report, maxTextBytes),
        flac: () => parseFlac(bytes, report, maxTextBytes),
        ogg: () => parseOgg(bytes, report),
        opus: () => parseOgg(bytes, report),
        mp4: () => parseMp4BestEffort(bytes, report),
        m4a: () => parseMp4BestEffort(bytes, report),
        aiff: () => parseAiffBestEffort(bytes, report, maxTextBytes),
        aac: () => parseAacAdts(bytes, report),
        ac3: () => parseAc3(bytes, report),
        wma: () => parseWmaAsf(bytes, report),
      };
      if (parsers[container.type]) parsers[container.type]();
      else report.errors.push({ stage: 'sniff', message: 'Unknown/unsupported container (best-effort scan not implemented).' });
    } catch (e) {
      report.errors.push({ stage: 'parse', message: String(e?.message || e) });
    }
    return JSON.stringify(report, null, 2);
  });
