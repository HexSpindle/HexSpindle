import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Add Text To Image', 'Draws text onto an image (the input is the image; the text is an argument).',
  [A.string('Text', 'HexSpindle'), A.number('X', 10, 0), A.number('Y', 10, 0), A.string('Colour', '#ffffff'), A.number('Font size', 20, 6, 200)],
  async (data, text, x, y, colour, size) => {
    const { canvas, ctx } = await loadImage(data);
    ctx.font = `${size}px sans-serif`;
    ctx.fillStyle = colour;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
    return canvasToPng(canvas);
  });
