// Magic hints for code operations.
import { decodes } from '../../core/magic-detect.js';

// Windows Script Encoder output (.vbe / .jse) is wrapped in "#@~^" … "^#~@" markers.
decodes('Microsoft Script Decoder', ({ isText, text }) => isText && /#@~\^[A-Za-z0-9+/]{6}==/.test(text) ? 0.97 : null);
