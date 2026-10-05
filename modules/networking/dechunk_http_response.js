import { module } from './_cat.js';

module('Dechunk HTTP response', 'Removes HTTP/1.1 chunked transfer-encoding framing, leaving the decoded body.', [],
  (input) => {
    const chunks = [];
    let chunkSizeEnd = input.indexOf('\n') + 1;
    const lineEndings = input.charAt(chunkSizeEnd - 2) === '\r' ? '\r\n' : '\n';
    const lineEndingsLength = lineEndings.length;
    let chunkSize = parseInt(input.slice(0, chunkSizeEnd), 16);
    while (!isNaN(chunkSize)) {
      if (chunkSize === 0) break;
      chunks.push(input.slice(chunkSizeEnd, chunkSize + chunkSizeEnd));
      input = input.slice(chunkSizeEnd + chunkSize + lineEndingsLength);
      chunkSizeEnd = input.indexOf(lineEndings) + lineEndingsLength;
      chunkSize = parseInt(input.slice(0, chunkSizeEnd), 16);
    }
    return chunks.join('');
  }, { text: true });
