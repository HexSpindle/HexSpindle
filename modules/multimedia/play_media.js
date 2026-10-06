import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { base64Encode, base64Decode, decodeLatin1 } from '../../core/util.js';

const MEDIA_SIGNATURES = [["video/x-matroska",[[[31,109],[32,97],[33,116],[34,114],[35,111],[36,115],[37,107],[38,97]]]],["video/webm",[[[0,26],[1,69],[2,223],[3,163]]]],["video/mp4",[[[4,102],[5,116],[6,121],[7,112],[8,[102,70]],[9,52],[10,[118,86]],[11,32]]]],["video/mp4",[[[0,0],[1,0],[2,0],[3,[24,32]],[4,102],[5,116],[6,121],[7,112]],[[0,51],[1,103],[2,112],[3,53]],[[0,0],[1,0],[2,0],[3,28],[4,102],[5,116],[6,121],[7,112],[8,109],[9,112],[10,52],[11,50],[16,109],[17,112],[18,52],[19,49],[20,109],[21,112],[22,52],[23,50],[24,105],[25,115],[26,111],[27,109]]]],["video/x-m4v",[[[0,0],[1,0],[2,0],[3,28],[4,102],[5,116],[6,121],[7,112],[8,77],[9,52],[10,86]]]],["video/quicktime",[[[0,0],[1,0],[2,0],[3,20],[4,102],[5,116],[6,121],[7,112]]]],["video/x-msvideo",[[[0,82],[1,73],[2,70],[3,70],[8,65],[9,86],[10,73]]]],["video/x-ms-wmv",[[[0,48],[1,38],[2,178],[3,117],[4,142],[5,102],[6,207],[7,17],[8,166],[9,217]]]],["video/mpeg",[[[0,0],[1,0],[2,1],[3,186]]]],["video/x-flv",[[[0,70],[1,76],[2,86],[3,1]]]],["video/ogg",[[[0,79],[1,103],[2,103],[3,83],[4,0],[5,2],[28,1],[29,118],[30,105],[31,100],[32,101],[33,111]],[[0,79],[1,103],[2,103],[3,83],[4,0],[5,2],[28,128],[29,116],[30,104],[31,101],[32,111],[33,114],[34,97]],[[0,79],[1,103],[2,103],[3,83],[4,0],[5,2],[28,102],[29,105],[30,115],[31,104],[32,101],[33,97],[34,100]]]],["audio/x-wav",[[[0,82],[1,73],[2,70],[3,70],[8,87],[9,65],[10,86],[11,69]]]],["audio/ogg",[[[0,79],[1,103],[2,103],[3,83]]]],["audio/midi",[[[0,77],[1,84],[2,104],[3,100]]]],["audio/mpeg",[[[0,73],[1,68],[2,51]],[[0,255],[1,251]]]],["audio/m4a",[[[4,102],[5,116],[6,121],[7,112],[8,77],[9,52],[10,65]],[[0,77],[1,52],[2,65],[3,32]]]],["audio/x-flac",[[[0,102],[1,76],[2,97],[3,67]]]],["audio/amr",[[[0,35],[1,33],[2,65],[3,77],[4,82],[5,10]]]],["audio/x-au",[[[0,100],[1,110],[2,115],[3,46],[24,65],[25,117],[26,100],[27,97],[28,99],[29,105],[30,116],[31,121],[32,66],[33,108],[34,111],[35,99],[36,107],[37,70],[38,105],[39,108],[40,101]]]],["application/octet-stream",[[[0,65],[1,117],[2,100],[3,97],[4,99],[5,105],[6,116],[7,121],[8,66],[9,108],[10,111],[11,99],[12,107],[13,70],[14,105],[15,108],[16,101]]]],["audio/x-aiff",[[[0,70],[1,79],[2,82],[3,77],[8,65],[9,73],[10,70],[11,70]]]],["audio/x-aifc",[[[0,70],[1,79],[2,82],[3,77],[8,65],[9,73],[10,70],[11,67]]]]];

function detectMedia(buf) {
  if (buf.length < 2) return null;
  for (const [mime, sigs] of MEDIA_SIGNATURES) {
    if (sigs.some(sig => sig.every(([off, v]) => Array.isArray(v) ? v.includes(buf[off]) : buf[off] === v))) return mime;
  }
  return null;
}

module('Play Media', 'Plays the input as audio or video in the output pane. The input can be raw bytes, Base64 or hex (Input format).',
  [A.select('Type', ['Auto', 'Audio', 'Video']), A.select('Input format', ['Raw', 'Base64', 'Hex'])],
  (data, kind, inputFormat = 'Raw') => {
    if (!data.length) return '';
    if (inputFormat === 'Hex') {
      const hex = decodeLatin1(data).replace(/[^0-9a-fA-F]/g, '');
      data = Uint8Array.from(hex.match(/../g) || [], h => parseInt(h, 16));
    } else if (inputFormat === 'Base64') {
      data = base64Decode(decodeLatin1(data).replace(/[^A-Za-z0-9+/=]/g, ''));
    }
    const mime = detectMedia(data);
    if (!mime) throw new Error('Invalid or unrecognised file type');
    const tag = kind === 'Video' ? 'video' : kind === 'Audio' ? 'audio' : mime.split('/')[0];
    return new Html(`<${tag} src='data:${mime};base64,${base64Encode(data)}' type='${mime}' controls style="max-width:100%"><p>Unsupported media type.</p></${tag}>`);
  });
