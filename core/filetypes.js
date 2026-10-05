const b = s => Uint8Array.from(s, c => c.charCodeAt(0));

export const SIGNATURES = [
  ['PNG image', 'png', 'image/png', b('\x89PNG\r\n\x1a\n'), 0],
  ['JPEG image', 'jpg', 'image/jpeg', b('\xff\xd8\xff'), 0],
  ['GIF image', 'gif', 'image/gif', b('GIF87a'), 0],
  ['GIF image', 'gif', 'image/gif', b('GIF89a'), 0],
  ['BMP image', 'bmp', 'image/bmp', b('BM'), 0],
  ['TIFF image (LE)', 'tif', 'image/tiff', b('II*\x00'), 0],
  ['TIFF image (BE)', 'tif', 'image/tiff', b('MM\x00*'), 0],
  ['ICO icon', 'ico', 'image/x-icon', b('\x00\x00\x01\x00'), 0],
  ['Photoshop document', 'psd', 'image/vnd.adobe.photoshop', b('8BPS'), 0],
  ['WebP image', 'webp', 'image/webp', b('RIFF'), 0],
  ['PDF document', 'pdf', 'application/pdf', b('%PDF-'), 0],
  ['ZIP archive (also DOCX/XLSX/JAR/APK)', 'zip', 'application/zip', b('PK\x03\x04'), 0],
  ['RAR archive', 'rar', 'application/vnd.rar', b('Rar!\x1a\x07'), 0],
  ['7-Zip archive', '7z', 'application/x-7z-compressed', b("7z\xbc\xaf\x27\x1c"), 0],
  ['GZIP archive', 'gz', 'application/gzip', b('\x1f\x8b\x08'), 0],
  ['BZIP2 archive', 'bz2', 'application/x-bzip2', b('BZh'), 0],
  ['XZ archive', 'xz', 'application/x-xz', b('\xfd7zXZ\x00'), 0],
  ['Zstandard archive', 'zst', 'application/zstd', b('\x28\xb5\x2f\xfd'), 0],
  ['LZ4 archive', 'lz4', 'application/x-lz4', b('\x04\x22\x4d\x18'), 0],
  ['TAR archive', 'tar', 'application/x-tar', b('ustar'), 257],
  ['ELF executable', 'elf', 'application/x-elf', b('\x7fELF'), 0],
  ['Windows executable (PE/MZ)', 'exe', 'application/vnd.microsoft.portable-executable', b('MZ'), 0],
  ['Mach-O executable (64-bit)', 'macho', 'application/x-mach-binary', b('\xcf\xfa\xed\xfe'), 0],
  ['Mach-O executable (32-bit)', 'macho', 'application/x-mach-binary', b('\xce\xfa\xed\xfe'), 0],
  ['Java class / Mach-O fat binary', 'class', 'application/java-vm', b('\xca\xfe\xba\xbe'), 0],
  ['WebAssembly module', 'wasm', 'application/wasm', b('\x00asm'), 0],
  ['Dalvik executable', 'dex', 'application/vnd.android.dex', b('dex\n035'), 0],
  ['SQLite database', 'sqlite', 'application/vnd.sqlite3', b('SQLite format 3\x00'), 0],
  ['OLE2 compound document (DOC/XLS/PPT/MSI)', 'doc', 'application/x-ole-storage', b('\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'), 0],
  ['RTF document', 'rtf', 'application/rtf', b('{\\rtf'), 0],
  ['Ogg container', 'ogg', 'audio/ogg', b('OggS'), 0],
  ['MP3 audio (ID3)', 'mp3', 'audio/mpeg', b('ID3'), 0],
  ['MP3 audio (frame)', 'mp3', 'audio/mpeg', b('\xff\xfb'), 0],
  ['FLAC audio', 'flac', 'audio/flac', b('fLaC'), 0],
  ['MIDI audio', 'mid', 'audio/midi', b('MThd'), 0],
  ['Matroska / WebM video', 'mkv', 'video/x-matroska', b('\x1a\x45\xdf\xa3'), 0],
  ['MP4 / ISO base media', 'mp4', 'video/mp4', b('ftyp'), 4],
  ['FLV video', 'flv', 'video/x-flv', b('FLV\x01'), 0],
  ['PCAP capture (LE)', 'pcap', 'application/vnd.tcpdump.pcap', b('\xd4\xc3\xb2\xa1'), 0],
  ['PCAP capture (BE)', 'pcap', 'application/vnd.tcpdump.pcap', b('\xa1\xb2\xc3\xd4'), 0],
  ['PCAPNG capture', 'pcapng', 'application/x-pcapng', b('\x0a\x0d\x0d\x0a'), 0],
  ['PEM-encoded data', 'pem', 'application/x-pem-file', b('-----BEGIN '), 0],
  ['XML document', 'xml', 'application/xml', b('<?xml'), 0],
  ['HTML document', 'html', 'text/html', b('<!DOCTYPE html'), 0],
  ['HTML document', 'html', 'text/html', b('<html'), 0],
  ['Shell script', 'sh', 'text/x-shellscript', b('#!/'), 0],
  ['WOFF font', 'woff', 'font/woff', b('wOFF'), 0],
  ['WOFF2 font', 'woff2', 'font/woff2', b('wOF2'), 0],
  ['OpenType font', 'otf', 'font/otf', b('OTTO'), 0],
  ['TrueType font', 'ttf', 'font/ttf', b('\x00\x01\x00\x00\x00'), 0],
  ['KeePass database (KDBX)', 'kdbx', 'application/x-keepass2', b('\x03\xd9\xa2\x9a\x67\xfb\x4b\xb5'), 0],
  ['Windows shortcut (LNK)', 'lnk', 'application/x-ms-shortcut', b('L\x00\x00\x00\x01\x14\x02\x00'), 0],
  ['ISO 9660 image', 'iso', 'application/x-iso9660-image', b('CD001'), 0x8001],
  ['zlib stream (default)', 'zlib', 'application/zlib', b('\x78\x9c'), 0],
  ['zlib stream (best)', 'zlib', 'application/zlib', b('\x78\xda'), 0],
  ['zlib stream (fast)', 'zlib', 'application/zlib', b('\x78\x01'), 0],
  ['Microsoft Cabinet', 'cab', 'application/vnd.ms-cab-compressed', b('MSCF'), 0],
  ['DER certificate / ASN.1 sequence', 'der', 'application/x-x509-ca-cert', b('\x30\x82'), 0],
  ['PGP message / key (binary)', 'pgp', 'application/pgp-encrypted', b('\x85'), 0],
  ['Windows registry hive', 'reg', 'application/x-ms-regf', b('regf'), 0],
  ['Apple property list (binary)', 'plist', 'application/x-plist', b('bplist00'), 0],
];

function matches(data, off, magic) {
  if (off + magic.length > data.length) return false;
  for (let i = 0; i < magic.length; i++) if (data[off + i] !== magic[i]) return false;
  return true;
}

export function detect(data) {
  const found = [];
  for (const [name, ext, mime, magic, off] of SIGNATURES) {
    if (matches(data, off, magic)) {
      if (name.startsWith('WebP')) {
        const tag = String.fromCharCode(...data.subarray(8, 12));
        if (tag !== 'WEBP') {
          if (tag === 'WAVE') found.push(['WAV audio', 'wav', 'audio/wav']);
          else if (String.fromCharCode(...data.subarray(8, 11)) === 'AVI') found.push(['AVI video', 'avi', 'video/x-msvideo']);
          continue;
        }
      }
      found.push([name, ext, mime]);
    }
  }
  return found;
}
