import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';
import { RECORD_DELIMITERS, FIELD_DELIMITERS, getScatterValues, lerpColor, drawAxes } from './_charts.js';

module('Heatmap chart',
  'Bins (x, y) data into a grid of rectangular cells and colours each cell by how many points fall ' +
  'inside it, from Min colour (empty) to Max colour (most populated). Input is one record per line, ' +
  'fields separated by the chosen delimiter. Rendered directly onto a canvas and rasterised to PNG ' +
  "colours are interpolated in linear RGB rather than D3's " +
  'Lab colour space, so gradients will look slightly different even for identical data.',
  [
    A.select('Record delimiter', Object.keys(RECORD_DELIMITERS)),
    A.select('Field delimiter', Object.keys(FIELD_DELIMITERS)),
    A.number('Number of vertical bins', 25, 1),
    A.number('Number of horizontal bins', 25, 1),
    A.boolean('Use first row as column headers', true),
    A.string('X label', ''),
    A.string('Y label', ''),
    A.boolean('Draw bin edges', false),
    A.string('Min colour value', 'white'),
    A.string('Max colour value', 'black'),
  ],
  (input, recordDelimName, fieldDelimName, vBins, hBins, headersIncluded, xLabelArg, yLabelArg, drawEdges, minColour, maxColour) => {
    if (vBins <= 0) throw new Error('Number of vertical bins must be greater than 0');
    if (hBins <= 0) throw new Error('Number of horizontal bins must be greater than 0');
    vBins = Math.round(vBins); hBins = Math.round(hBins);

    const recordDelim = RECORD_DELIMITERS[recordDelimName], fieldDelim = FIELD_DELIMITERS[fieldDelimName];
    const { headings, values } = getScatterValues(input, recordDelim, fieldDelim, headersIncluded);
    const xLabel = headings ? headings.x : xLabelArg;
    const yLabel = headings ? headings.y : yLabelArg;

    const xs = values.map(v => v[0]), ys = values.map(v => v[1]);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    if (xMin === xMax) throw new Error('Cannot pack points: minimum and maximum X coordinate are the same.');
    if (yMin === yMax) throw new Error('Cannot pack points: minimum and maximum Y coordinate are the same.');

    const bins = Array.from({ length: vBins }, () => Array.from({ length: hBins }, () => 0));
    const epsilon = 1e-9;
    for (const [x, y] of values) {
      const fx = (x - xMin) / (xMax - xMin + epsilon);
      const fy = (y - yMin) / (yMax - yMin + epsilon);
      const bx = Math.min(hBins - 1, Math.floor(hBins * fx));
      const by = Math.min(vBins - 1, Math.floor(vBins * fy));
      bins[by][bx]++;
    }
    const maxCount = Math.max(...bins.flat());

    const dimension = 500;
    const margin = { top: 10, right: 10, bottom: 50, left: 45 };
    const width = dimension - margin.left - margin.right;
    const height = dimension - margin.top - margin.bottom;
    const binW = width / hBins, binH = height / vBins;

    const canvas = new OffscreenCanvas(dimension, dimension);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, dimension, dimension);

    for (let by = 0; by < vBins; by++) {
      for (let bx = 0; bx < hBins; bx++) {
        const count = bins[by][bx];
        const x = margin.left + bx * binW;
        const y = margin.top + height - (by + 1) * binH;
        ctx.fillStyle = lerpColor(minColour, maxColour, maxCount > 0 ? count / maxCount : 0);
        ctx.fillRect(x, y, binW, binH);
        if (drawEdges) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, binW, binH);
        }
      }
    }

    drawAxes(ctx, { x0: margin.left, y0: margin.top, width, height, xDomain: [xMin, xMax], yDomain: [yMin, yMax], xLabel, yLabel });

    return canvasToPng(canvas);
  }, { text: true });
