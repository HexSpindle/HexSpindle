import { module } from './_cat.js';

function mimeEncode(buffer) {
    const ranges = [
        [0x09],
        [0x0A],
        [0x0D],
        [0x20],
        [0x21],
        [0x23, 0x3C],
        [0x3E],
        [0x40, 0x5E],
        [0x60, 0x7E]
    ];
    let result = "";

    for (let i = 0, len = buffer.length; i < len; i++) {
        if (checkRanges(buffer[i], ranges)) {
            result += String.fromCharCode(buffer[i]);
            continue;
        }
        result += "=" + (buffer[i] < 0x10 ? "0" : "") + buffer[i].toString(16).toUpperCase();
    }

    return result;
}

function checkRanges(nr, ranges) {
    for (let i = ranges.length - 1; i >= 0; i--) {
        if (!ranges[i].length)
            continue;
        if (ranges[i].length === 1 && nr === ranges[i][0])
            return true;
        if (ranges[i].length === 2 && nr >= ranges[i][0] && nr <= ranges[i][1])
            return true;
    }
    return false;
}

function addQPSoftLinebreaks(mimeEncodedStr, lineLengthMax) {
    const len = mimeEncodedStr.length,
        lineMargin = Math.floor(lineLengthMax / 3);
    let pos = 0,
        match, code, line,
        result = "";

    while (pos < len) {
        line = mimeEncodedStr.substr(pos, lineLengthMax);
        if ((match = line.match(/\r\n/))) {
            line = line.substr(0, match.index + match[0].length);
            result += line;
            pos += line.length;
            continue;
        }

        if (line.substr(-1) === "\n") {
            result += line;
            pos += line.length;
            continue;
        } else if ((match = line.substr(-lineMargin).match(/\n.*?$/))) {
            line = line.substr(0, line.length - (match[0].length - 1));
            result += line;
            pos += line.length;
            continue;
        } else if (line.length > lineLengthMax - lineMargin && (match = line.substr(-lineMargin).match(/[ \t.,!?][^ \t.,!?]*$/))) {
            line = line.substr(0, line.length - (match[0].length - 1));
        } else if (line.substr(-1) === "\r") {
            line = line.substr(0, line.length - 1);
        } else {
            if (line.match(/=[\da-f]{0,2}$/i)) {

                if ((match = line.match(/=[\da-f]{0,1}$/i))) {
                    line = line.substr(0, line.length - match[0].length);
                }

                while (line.length > 3 && line.length < len - pos && !line.match(/^(?:=[\da-f]{2}){1,4}$/i) && (match = line.match(/=[\da-f]{2}$/ig))) {
                    code = parseInt(match[0].substr(1, 2), 16);
                    if (code < 128) {
                        break;
                    }

                    line = line.substr(0, line.length - 3);

                    if (code >= 0xC0) {
                        break;
                    }
                }

            }
        }

        if (pos + line.length < len && line.substr(-1) !== "\n") {
            if (line.length === 76 && line.match(/=[\da-f]{2}$/i)) {
                line = line.substr(0, line.length - 3);
            } else if (line.length === 76) {
                line = line.substr(0, line.length - 1);
            }
            pos += line.length;
            line += "=\r\n";
        } else {
            pos += line.length;
        }

        result += line;
    }

    return result;
}

module('To Quoted Printable', 'Encodes data as MIME Quoted-Printable.', [],
  (data) => {
    const s = mimeEncode(data)
      .replace(/\r?\n|\r/g, '\r\n')
      .replace(/[\t ]+$/gm, sp => sp.replace(/ /g, '=20').replace(/\t/g, '=09'));
    return addQPSoftLinebreaks(s, 76);
  });
